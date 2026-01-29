import { gameConfig, COINS } from './config.js';
import { firebaseService } from './firebase.js';

class GameState {
    constructor() {
        this.portfolio = {
            cash: gameConfig.STARTING_CASH,
            holdings: {},
            networth: gameConfig.STARTING_CASH
        };
        this.currentCoin = 'BTC';
        this.transactions = [];
        this.saveTimeout = null;
        this.gameOverShown = false;
        this.blackjackActive = false;
    }

    async initialize() {
        // Initialize holdings for all coins
        Object.keys(COINS).forEach(symbol => {
            this.portfolio.holdings[symbol] = 0;
        });

        // Try to load saved portfolio
        const savedPortfolio = await firebaseService.getPortfolio();
        if (savedPortfolio) {
            this.portfolio = savedPortfolio;
            console.log('Loaded saved portfolio');
        }

        // Load transaction history
        this.transactions = await firebaseService.getTransactions();

        // Subscribe to coin delistings
        firebaseService.subscribeToDelistings((delisting) => {
            this.handleDelisting(delisting);
        });
    }

    handleDelisting(delisting) {
        const symbol = delisting.symbol;
        const holding = this.portfolio.holdings[symbol] || 0;

        if (holding > 0) {
            console.log(`🚨 LIQUIDATION: You lost ${holding} ${symbol} (coin delisted)`);

            // Clear holdings
            this.portfolio.holdings[symbol] = 0;

            // Record liquidation transaction
            const transaction = {
                type: 'liquidation',
                coin: symbol,
                coinName: delisting.name || symbol,
                amount: holding,
                price: 0,
                total: 0,
                reason: delisting.reason || 'Coin delisted',
                timestamp: delisting.timestamp || Date.now()
            };

            this.transactions.unshift(transaction);
            firebaseService.addTransaction(transaction);

            // Save portfolio
            this.save();
        }
    }

    calculateNetworth(marketPrices) {
        let total = this.portfolio.cash;

        Object.entries(this.portfolio.holdings).forEach(([symbol, amount]) => {
            const coin = marketPrices[symbol];
            if (coin) {
                total += amount * coin.currentPrice;
            }
        });

        this.portfolio.networth = Number(total.toFixed(2));
        
        // Check for game over (cash + portfolio value = 0)
        if (this.portfolio.networth <= 0 && this.portfolio.cash <= 0) {
            console.log(`Game over condition met: cash=${this.portfolio.cash}, networth=${this.portfolio.networth}`);
            this.checkGameOver();
        }
        
        return this.portfolio.networth;
    }

    checkGameOver() {
        // Don't trigger during active blackjack game
        if (this.blackjackActive) {
            console.log('Game over check skipped - blackjack active');
            return;
        }
        
        // Only show game over modal once
        if (this.gameOverShown) {
            console.log('Game over check skipped - already shown');
            return;
        }
        
        console.log('GAME OVER - Showing modal');
        this.gameOverShown = true;

        // Show game over modal
        const modal = document.getElementById('gameOverModal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error('Game over modal not found!');
        }
    }

    buy(coin, cashAmount) {
        if (cashAmount <= 0) {
            return { success: false, error: 'Invalid amount' };
        }

        if (coin.delisted) {
            return { success: false, error: 'Coin has been delisted' };
        }

        if (cashAmount > this.portfolio.cash) {
            return { success: false, error: 'Insufficient funds' };
        }

        const coinAmount = cashAmount / coin.currentPrice;
        this.portfolio.cash -= cashAmount;
        this.portfolio.holdings[coin.symbol] = 
            (this.portfolio.holdings[coin.symbol] || 0) + coinAmount;

        // Record transaction
        const transaction = {
            type: 'buy',
            coin: coin.symbol,
            coinName: coin.name,
            amount: coinAmount,
            price: coin.currentPrice,
            total: cashAmount,
            timestamp: Date.now()
        };

        this.transactions.unshift(transaction);
        firebaseService.addTransaction(transaction);

        // Record buy pressure
        firebaseService.recordTrade(coin.symbol, 'buy', cashAmount);

        this.save();

        return { 
            success: true, 
            coinAmount: coinAmount,
            transaction: transaction
        };
    }

    sell(coin, coinAmount) {
        if (coinAmount <= 0) {
            return { success: false, error: 'Invalid amount' };
        }

        if (coin.delisted) {
            return { success: false, error: 'Coin has been delisted' };
        }

        const holding = this.portfolio.holdings[coin.symbol] || 0;
        if (coinAmount > holding) {
            return { success: false, error: 'Insufficient crypto' };
        }

        const cashAmount = coinAmount * coin.currentPrice;
        this.portfolio.cash += cashAmount;
        this.portfolio.holdings[coin.symbol] = holding - coinAmount;

        // Record transaction
        const transaction = {
            type: 'sell',
            coin: coin.symbol,
            coinName: coin.name,
            amount: coinAmount,
            price: coin.currentPrice,
            total: cashAmount,
            timestamp: Date.now()
        };

        this.transactions.unshift(transaction);
        firebaseService.addTransaction(transaction);

        // Record sell pressure
        firebaseService.recordTrade(coin.symbol, 'sell', cashAmount);

        this.save();

        return { 
            success: true, 
            cashAmount: cashAmount,
            transaction: transaction
        };
    }

    save() {
        // Debounce saves to avoid too many writes
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            firebaseService.savePortfolio(this.portfolio);
        }, 1000);
    }

    getCash() {
        return this.portfolio.cash;
    }

    getHolding(coinSymbol) {
        return this.portfolio.holdings[coinSymbol] || 0;
    }

    getNetworth() {
        return this.portfolio.networth;
    }

    getTransactions() {
        return this.transactions;
    }

    setCurrentCoin(symbol) {
        this.currentCoin = symbol;
    }

    getCurrentCoin() {
        return this.currentCoin;
    }

    reset() {
        this.portfolio = {
            cash: gameConfig.STARTING_CASH,
            holdings: {},
            networth: gameConfig.STARTING_CASH
        };

        Object.keys(COINS).forEach(symbol => {
            this.portfolio.holdings[symbol] = 0;
        });

        this.transactions = [];
        this.save();
    }

    createCoin(name, symbol) {
        if (this.portfolio.cash < gameConfig.COIN_CREATION_COST) {
            return { success: false, error: 'Insufficient funds' };
        }

        // Check if symbol already exists
        if (this.portfolio.holdings.hasOwnProperty(symbol)) {
            return { success: false, error: 'Symbol already exists' };
        }

        // Deduct cost
        this.portfolio.cash -= gameConfig.COIN_CREATION_COST;
        
        // Update networth (simply subtract the cost since cash decreased)
        this.portfolio.networth -= gameConfig.COIN_CREATION_COST;

        // Initialize holding for this coin
        this.portfolio.holdings[symbol] = 0;

        // Record transaction
        const transaction = {
            type: 'create_coin',
            coin: symbol,
            coinName: name,
            amount: 0,
            price: 0,
            total: gameConfig.COIN_CREATION_COST,
            timestamp: Date.now()
        };

        this.transactions.unshift(transaction);
        firebaseService.addTransaction(transaction);

        this.save();

        return { success: true };
    }
}

export const gameState = new GameState();
