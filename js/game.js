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
        return this.portfolio.networth;
    }

    buy(coin, cashAmount) {
        if (cashAmount <= 0) {
            return { success: false, error: 'Invalid amount' };
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
}

export const gameState = new GameState();