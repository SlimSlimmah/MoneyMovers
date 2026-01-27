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
                history: this.generateInitialHistory(config),
                change24h: 0
            };
        });
    }

    generateInitialHistory(coinConfig) {
        const history = [];
        let price = coinConfig.startPrice;
        const points = 24; // 24 hours of data
        
        for (let i = 0; i < points; i++) {
            const open = price;
            
            // Generate high and low with some volatility
            const volatilityFactor = coinConfig.volatility * 0.6;
            const high = open + Math.random() * volatilityFactor;
            const low = open - Math.random() * volatilityFactor;
            
            // Close moves in a random walk
            const change = (Math.random() - 0.48) * coinConfig.volatility;
            const close = Math.max(
                coinConfig.minPrice, 
                Math.min(coinConfig.maxPrice, open + change)
            );
            
            // Ensure high is highest and low is lowest
            const actualHigh = Math.max(open, close, high);
            const actualLow = Math.min(open, close, low);
            
            price = close; // Next candle opens at this close
            
            history.push({
                time: Date.now() - (points - i) * 3600000,
                open: Number(open.toFixed(coinConfig.symbol === 'DOGE' ? 4 : 2)),
                high: Number(actualHigh.toFixed(coinConfig.symbol === 'DOGE' ? 4 : 2)),
                low: Number(actualLow.toFixed(coinConfig.symbol === 'DOGE' ? 4 : 2)),
                close: Number(close.toFixed(coinConfig.symbol === 'DOGE' ? 4 : 2)),
                price: Number(close.toFixed(coinConfig.symbol === 'DOGE' ? 4 : 2)) // For backward compatibility
            });
        }

        return history;
    }

    async startPriceUpdates() {
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
                        this.coins[symbol].history = data.history;
                        this.coins[symbol].currentPrice = data.current;
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
        }

        // Subscribe to price updates
        firebaseService.subscribeToPrices((prices) => {
            this.handlePriceUpdate(prices);
        });
    }

    updateAllPrices() {
        if (!this.isPriceMaster) return;

        Object.entries(this.coins).forEach(([symbol, coin]) => {
            const open = coin.currentPrice;
            
            // Generate high and low
            const volatilityFactor = coin.volatility * 0.6;
            const high = open + Math.random() * volatilityFactor;
            const low = open - Math.random() * volatilityFactor;
            
            // Generate close with random walk
            const change = (Math.random() - 0.48) * coin.volatility;
            let close = open + change;
            
            // Keep within bounds
            close = Math.max(coin.minPrice, Math.min(coin.maxPrice, close));
            close = Number(close.toFixed(symbol === 'DOGE' ? 4 : 2));
            
            // Ensure high is highest and low is lowest
            const actualHigh = Math.max(open, close, high);
            const actualLow = Math.min(open, close, low);

            // Update history
            const newHistory = [...coin.history];
            newHistory.push({
                time: Date.now(),
                open: Number(open.toFixed(symbol === 'DOGE' ? 4 : 2)),
                high: Number(actualHigh.toFixed(symbol === 'DOGE' ? 4 : 2)),
                low: Number(actualLow.toFixed(symbol === 'DOGE' ? 4 : 2)),
                close: close,
                price: close // For backward compatibility
            });

            // Keep last 24 hours only
            if (newHistory.length > 24) {
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
        if (!coin) return [];

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

        return coin.history.filter(h => h.time >= cutoff);
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