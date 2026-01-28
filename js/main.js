import { firebaseService } from './firebase.js';
import { market } from './market.js';
import { gameState } from './game.js';
import { trading } from './trading.js';
import { chartManager } from './chart.js';
import { ui } from './ui.js';
import { gameConfig } from './config.js';

class App {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        // Show username modal
        this.showUsernameModal();
    }

    showUsernameModal() {
        const modal = document.getElementById('usernameModal');
        const input = document.getElementById('usernameInput');
        const submitBtn = document.getElementById('usernameSubmit');

        modal.classList.add('active');

        // Check for saved username
        const savedUsername = localStorage.getItem('crypto-trader-username');
        if (savedUsername) {
            input.value = savedUsername;
        }

        submitBtn.addEventListener('click', async () => {
            const username = input.value.trim();
            
            if (!username) {
                alert('Please enter a username');
                return;
            }

            if (username.length < 3) {
                alert('Username must be at least 3 characters');
                return;
            }

            // Save username
            localStorage.setItem('crypto-trader-username', username);
            modal.classList.remove('active');

            // Start the app
            await this.startApp(username);
        });

        // Allow Enter key to submit
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        });

        // Focus input
        setTimeout(() => input.focus(), 100);
    }

    async startApp(username) {
        try {
            console.log('Starting Crypto Trader...');

            // Initialize Firebase
            console.log('Connecting to Firebase...');
            const firebaseConnected = await firebaseService.initialize();
            
            if (!firebaseConnected) {
                console.warn('Firebase connection failed - running in offline mode');
                ui.setConnectionStatus(false);
            } else {
                ui.setConnectionStatus(true);
            }

            // Set username
            firebaseService.setUsername(username);
            ui.setUsername(username);

            // Initialize market
            console.log('Initializing market...');
            market.initialize();
            await market.startPriceUpdates();

            // Initialize game state
            console.log('Loading game state...');
            await gameState.initialize();

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
                gameState.save(); // Force save to update leaderboard
                ui.updatePortfolio(); // Update UI to show current networth
            }, gameConfig.NETWORTH_SYNC_INTERVAL);

            // Initial UI update
            ui.updateAll();

            console.log('App initialized successfully!');
            this.initialized = true;

        } catch (error) {
            console.error('Failed to initialize app:', error);
            alert('Failed to start the app. Please refresh the page and try again.');
        }
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.initialize();
});

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
        ui.updatePortfolioView(); // Re-render portfolio to update visuals
        ui.updateTransactionHistory();
        alert(`Bought ${result.coinAmount.toFixed(8)} ${symbol} for $${amount.toFixed(2)}`);
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
        ui.updatePortfolioView(); // Re-render portfolio to show empty state if holdings = 0
        ui.updateTransactionHistory();
        alert(`Sold ${amount.toFixed(8)} ${symbol} for $${result.cashAmount.toFixed(2)}`);
    } else {
        alert(result.error);
    }
};

window.portfolioSellAll = (symbol) => {
    const coin = market.getCoin(symbol);
    if (!coin) return;

    // Get exact holdings without rounding
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