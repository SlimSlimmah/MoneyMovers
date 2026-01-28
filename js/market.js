import { COINS, gameConfig } from './config.js';
import { firebaseService } from './firebase.js';

class Market {
    constructor() {
        this.coins = {};
        this.isPriceMaster = false;
        this.priceUpdateInterval = null;
        this.heartbeatInterval = null;
        this.listeners = [];
    }

    initialize() {
        // Initialize each coin with starting data
        Object.entries(COINS).forEach(([symbol, config]) => {
            this.coins[symbol] = {
                ...config,
                currentPrice: config.startPrice,
                currentVolatility: config.baseVolatility,
                volatilityTrend: (Math.random() - 0.5) * 0.1, // Random volatility drift
                history: this.generateInitialHistory(config),
                change24h: 0
            };
        });
    }

    addCustomCoin(symbol, config) {
        // Add a new custom coin
        this.coins[symbol] = {
            ...config,
            currentPrice: config.startPrice,
            currentVolatility: config.baseVolatility,
            volatilityTrend: (Math.random() - 0.5) * 0.1,
            history: this.generateInitialHistory(config),
            change24h: 0,
            isCustom: true
        };
    }

    generateInitialHistory(coinConfig) {
        const history = [];
        let price = coinConfig.startPrice;
        let volatility = coinConfig.baseVolatility;
        const points = 168; // 7 days of hourly data (24 * 7)
        
        for (let i = 0; i < points; i++) {
            // Vary volatility slightly over time
            volatility = Math.max(
                coinConfig.baseVolatility * 0.5,
                Math.min(
                    coinConfig.baseVolatility * 1.5,
                    volatility + (Math.random() - 0.5) * coinConfig.baseVolatility * 0.1
                )
            );
            
            const open = price;
            
            // Generate high and low with current volatility
            const volatilityFactor = volatility * 0.6;
            const high = open + Math.random() * volatilityFactor;
            const low = open - Math.random() * volatilityFactor;
            
            // Close moves in a random walk
            const change = (Math.random() - 0.48) * volatility;
            const close = Math.max(
                coinConfig.minPrice, 
                Math.min(coinConfig.maxPrice, open + change)
            );
            
            // Ensure high is highest and low is lowest
            const actualHigh = Math.max(open, close, high);
            const actualLow = Math.min(open, close, low);
            
            price = close; // Next candle opens at this close
            
            const decimals = this.getDecimals(coinConfig.symbol);
            
            history.push({
                time: Date.now() - (points - i) * 3600000,
                open: Number(open.toFixed(decimals)),
                high: Number(actualHigh.toFixed(decimals)),
                low: Number(actualLow.toFixed(decimals)),
                close: Number(close.toFixed(decimals)),
                price: Number(close.toFixed(decimals)) // For backward compatibility
            });
        }

        return history;
    }

    getDecimals(symbol) {
        // DOGE and other low-price coins get more decimals
        if (symbol === 'DOGE' || symbol.length > 4) {
            return 4;
        }
        return 2;
    }

    async startPriceUpdates() {
        // Load any custom coins first
        const customCoins = await firebaseService.getCustomCoins();
        Object.entries(customCoins).forEach(([symbol, config]) => {
            if (!this.coins[symbol]) {
                this.addCustomCoin(symbol, config);
            }
        });
        
        // Try to become price master
        this.isPriceMaster = await firebaseService.tryBecomePriceMaster();

        if (this.isPriceMaster) {
            console.log('This client is the price master');
            
            // Start heartbeat
            this.heartbeatInterval = setInterval(() => {
                firebaseService.updatePriceMasterHeartbeat();
            }, 10000);

            // Check for existing market data
            const existingPrices = await firebaseService.getMarketPrices();
            if (existingPrices && Object.keys(existingPrices).length > 0) {
                // Load existing prices
                Object.entries(existingPrices).forEach(([symbol, data]) => {
                    if (this.coins[symbol] && data.history) {
                        // Check if history has enough data points (should be 168 for 7 days)
                        if (data.history.length < 100) {
                            console.log(`Regenerating history for ${symbol} (only ${data.history.length} points found, need 168)`);
                            // Old data - regenerate with full 7 days
                            this.coins[symbol].history = this.generateInitialHistory(this.coins[symbol]);
                            this.coins[symbol].currentPrice = this.coins[symbol].history[this.coins[symbol].history.length - 1].close;
                        } else {
                            // Good data - use it
                            this.coins[symbol].history = data.history;
                            this.coins[symbol].currentPrice = data.current;
                        }
                    }
                });
                console.log('Loaded existing market data');
            }

            // Start updating prices
            this.priceUpdateInterval = setInterval(() => {
                this.updateAllPrices();
            }, gameConfig.PRICE_UPDATE_INTERVAL);
        } else {
            console.log('This client is listening to price updates');
            
            // Periodically check if we should become price master (every 15 seconds)
            this.masterCheckInterval = setInterval(async () => {
                const shouldBecomeMaster = await firebaseService.tryBecomePriceMaster();
                if (shouldBecomeMaster && !this.isPriceMaster) {
                    console.log('Taking over as price master - previous master went stale');
                    this.isPriceMaster = true;
                    
                    // Start heartbeat
                    this.heartbeatInterval = setInterval(() => {
                        firebaseService.updatePriceMasterHeartbeat();
                    }, 10000);
                    
                    // Start updating prices
                    this.priceUpdateInterval = setInterval(() => {
                        this.updateAllPrices();
                    }, gameConfig.PRICE_UPDATE_INTERVAL);
                    
                    // Stop checking since we're now master
                    clearInterval(this.masterCheckInterval);
                }
            }, 15000); // Check every 15 seconds
        }

        // Subscribe to price updates
        firebaseService.subscribeToPrices((prices) => {
            this.handlePriceUpdate(prices);
        });
    }

    updateAllPrices() {
        if (!this.isPriceMaster) return;

        Object.entries(this.coins).forEach(([symbol, coin]) => {
            // Update volatility - it drifts over time
            coin.volatilityTrend += (Math.random() - 0.5) * 0.02;
            coin.volatilityTrend = Math.max(-0.2, Math.min(0.2, coin.volatilityTrend));
            
            coin.currentVolatility += coin.volatilityTrend * coin.baseVolatility * 0.05;
            coin.currentVolatility = Math.max(
                coin.baseVolatility * 0.3,
                Math.min(coin.baseVolatility * 2, coin.currentVolatility)
            );
            
            const open = coin.currentPrice;
            
            // Generate high and low with current volatility
            const volatilityFactor = coin.currentVolatility * 0.6;
            const high = open + Math.random() * volatilityFactor;
            const low = open - Math.random() * volatilityFactor;
            
            // Generate close with random walk
            const change = (Math.random() - 0.48) * coin.currentVolatility;
            let close = open + change;
            
            // Keep within bounds
            close = Math.max(coin.minPrice, Math.min(coin.maxPrice, close));
            
            const decimals = this.getDecimals(symbol);
            close = Number(close.toFixed(decimals));
            
            // Ensure high is highest and low is lowest
            const actualHigh = Math.max(open, close, high);
            const actualLow = Math.min(open, close, low);

            // Update history
            const newHistory = [...coin.history];
            newHistory.push({
                time: Date.now(),
                open: Number(open.toFixed(decimals)),
                high: Number(actualHigh.toFixed(decimals)),
                low: Number(actualLow.toFixed(decimals)),
                close: close,
                price: close // For backward compatibility
            });

            // Keep last 7 days (168 hours)
            if (newHistory.length > 168) {
                newHistory.shift();
            }

            // Calculate 24h change
            const oldPrice = newHistory[0].close;
            const change24h = ((close - oldPrice) / oldPrice * 100).toFixed(2);

            // Update local state
            this.coins[symbol].currentPrice = close;
            this.coins[symbol].history = newHistory;
            this.coins[symbol].change24h = change24h;

            // Update Firebase
            firebaseService.updateMarketPrice(symbol, close, newHistory);
        });

        this.notifyListeners();
    }

    handlePriceUpdate(prices) {
        if (this.isPriceMaster) return; // Master doesn't need updates

        Object.entries(prices).forEach(([symbol, data]) => {
            if (this.coins[symbol]) {
                this.coins[symbol].currentPrice = data.current;
                this.coins[symbol].history = data.history || [];
                
                // Calculate 24h change
                if (data.history && data.history.length > 0) {
                    const oldPrice = data.history[0].close || data.history[0].price;
                    const change24h = ((data.current - oldPrice) / oldPrice * 100).toFixed(2);
                    this.coins[symbol].change24h = change24h;
                }
            }
        });

        this.notifyListeners();
    }

    onPriceUpdate(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback(this.coins));
    }

    getCoin(symbol) {
        return this.coins[symbol];
    }

    getAllCoins() {
        return this.coins;
    }

    getHistory(symbol, timeframe = '24h') {
        const coin = this.coins[symbol];
        if (!coin) {
            console.warn('Coin not found:', symbol);
            return [];
        }

        const now = Date.now();
        let cutoff;

        switch(timeframe) {
            case '1h':
                cutoff = now - 3600000;
                break;
            case '24h':
                cutoff = now - 86400000;
                break;
            case '7d':
                cutoff = now - 604800000;
                break;
            default:
                cutoff = now - 86400000;
        }

        const filtered = coin.history.filter(h => h.time >= cutoff);
        console.log(`getHistory(${symbol}, ${timeframe}): ${coin.history.length} total points, ${filtered.length} after filter`);
        return filtered;
    }

    stop() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
}

export const market = new Market();