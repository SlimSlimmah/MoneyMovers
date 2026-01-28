import { firebaseService } from './firebase.js';
import { market } from './market.js';
import { gameState } from './game.js';
import { trading } from './trading.js';
import { chartManager } from './chart.js';
import { ui } from './ui.js';
import { gameConfig } from './config.js';
import { blackjack } from './blackjack.js';
import { auth } from './auth.js';

class App {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        console.log('Starting Crypto Trader...');
        
        console.log('Connecting to Firebase...');
        const isLoggedIn = await firebaseService.initialize();
        
        if (isLoggedIn) {
            // User is already logged in, show game
            console.log('User already logged in');
            auth.showGameScreen();
            await this.startApp();
        } else {
            // User not logged in, show auth screen
            console.log('User not logged in, showing auth screen');
            auth.showAuthScreen();
            auth.initialize();
            
            // Set callback for when auth completes
            window.onAuthComplete = async () => {
                await this.startApp();
            };
        }
    }

    async startApp(username = null) {
        try {
            console.log('Initializing game...');

            // Get username from Firebase if not provided
            if (!username) {
                username = await firebaseService.getUsername();
            }
            ui.setUsername(username);

            // Initialize market
            console.log('Initializing market...');
            market.initialize();
            await market.startPriceUpdates();

            // Initialize game state
            console.log('Loading game state...');
            await gameState.initialize();

            // Calculate and save initial networth (important for leaderboard)
            gameState.calculateNetworth(market.getAllCoins());
            gameState.save();

            // Initialize modules
            console.log('Initializing UI...');
            ui.initialize();
            trading.initialize();
            chartManager.initialize();

            // Set up market price updates
            market.onPriceUpdate((coins) => {
                gameState.calculateNetworth(coins);
                ui.updateAll();
            });

            // Set up trading callbacks
            trading.onTrade((trade) => {
                gameState.calculateNetworth(market.getAllCoins());
                ui.updateTransactionHistory();
                ui.updatePortfolio();
            });

            // Periodic networth sync for leaderboard
            // This makes the leaderboard feel alive as prices change
            setInterval(() => {
                const coins = market.getAllCoins();
                gameState.calculateNetworth(coins);
                gameState.save();
                ui.updatePortfolio();
            }, gameConfig.NETWORTH_SYNC_INTERVAL);

            // Update leaderboard periodically
            setInterval(() => {
                if (ui.currentTab === 'leaderboard') {
                    ui.updateLeaderboard();
                }
            }, 10000);

            // Initial update
            ui.updateAll();
            
            this.initialized = true;
            console.log('App initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }
}

// Global functions for portfolio trading (called from onclick)
window.portfolioBuy = (symbol) => {
    const input = document.getElementById(`portfolio-buy-${symbol}`);
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount <= 0) {
        alert('Enter a valid amount');
        return;
    }

    const coin = market.getCoin(symbol);
    if (!coin) return;

    const result = gameState.buy(coin, amount);
    if (result.success) {
        input.value = '';
        ui.updatePortfolio();
        ui.updatePortfolioView();
        ui.updateTransactionHistory();
        alert(`Bought ${result.coinAmount.toFixed(8)} ${symbol} for $${amount.toFixed(2)}`);
    } else {
        alert(result.error);
    }
};

window.portfolioBuyAll = (symbol) => {
    const coin = market.getCoin(symbol);
    if (!coin) return;

    const exactCash = gameState.getCash();
    
    if (exactCash <= 0) {
        alert('No cash available');
        return;
    }

    const result = gameState.buy(coin, exactCash);
    if (result.success) {
        const input = document.getElementById(`portfolio-buy-${symbol}`);
        if (input) input.value = '';
        ui.updatePortfolio();
        ui.updatePortfolioView();
        ui.updateTransactionHistory();
        alert(`Bought ${result.coinAmount.toFixed(8)} ${symbol} with all cash ($${exactCash.toFixed(2)})`);
    } else {
        alert(result.error);
    }
};

window.portfolioSell = (symbol) => {
    const input = document.getElementById(`portfolio-sell-${symbol}`);
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount <= 0) {
        alert('Enter a valid amount');
        return;
    }

    const coin = market.getCoin(symbol);
    if (!coin) return;

    const result = gameState.sell(coin, amount);
    if (result.success) {
        input.value = '';
        ui.updatePortfolio();
        ui.updatePortfolioView();
        ui.updateTransactionHistory();
        alert(`Sold ${amount.toFixed(8)} ${symbol} for $${result.cashAmount.toFixed(2)}`);
    } else {
        alert(result.error);
    }
};

window.portfolioSellAll = (symbol) => {
    const coin = market.getCoin(symbol);
    if (!coin) return;

    const exactHolding = gameState.getHolding(symbol);
    
    if (exactHolding <= 0) {
        alert('No holdings to sell');
        return;
    }

    const result = gameState.sell(coin, exactHolding);
    if (result.success) {
        const input = document.getElementById(`portfolio-sell-${symbol}`);
        if (input) input.value = '';
        ui.updatePortfolio();
        ui.updatePortfolioView();
        ui.updateTransactionHistory();
        alert(`Sold all ${exactHolding} ${symbol} for $${result.cashAmount.toFixed(2)}`);
    } else {
        alert(result.error);
    }
};

window.quickBet = (amount) => {
    document.getElementById('betAmount').value = amount;
};

window.startBlackjack = () => {
    const betInput = document.getElementById('betAmount');
    const bet = parseFloat(betInput.value);
    
    if (blackjack.startGame(bet)) {
        betInput.value = '';
    }
};

window.blackjackHit = () => {
    blackjack.hit();
};

window.blackjackStand = () => {
    blackjack.stand();
};

window.handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
        await firebaseService.signOut();
        location.reload();
    }
};

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.initialize();
});