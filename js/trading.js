import { gameState } from './game.js';
import { market } from './market.js';

class Trading {
    constructor() {
        this.listeners = [];
    }

    initialize() {
        // Set up input listeners
        const buyAmountInput = document.getElementById('buyAmount');
        const sellAmountInput = document.getElementById('sellAmount');

        buyAmountInput?.addEventListener('input', () => {
            this.updateBuyPreview();
        });

        sellAmountInput?.addEventListener('input', () => {
            this.updateSellPreview();
        });

        // Set up quick buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const fraction = parseFloat(e.target.dataset.fraction);
                
                if (action === 'buy') {
                    this.quickBuy(fraction);
                } else if (action === 'sell') {
                    this.quickSell(fraction);
                }
            });
        });

        // Set up trade buttons
        document.getElementById('buyBtn')?.addEventListener('click', () => {
            this.executeBuy();
        });

        document.getElementById('sellBtn')?.addEventListener('click', () => {
            this.executeSell();
        });
    }

    quickBuy(fraction) {
        const cash = gameState.getCash();
        const amount = cash * fraction;
        document.getElementById('buyAmount').value = amount.toFixed(2);
        this.updateBuyPreview();
    }

    quickSell(fraction) {
        const coinSymbol = gameState.getCurrentCoin();
        const holding = gameState.getHolding(coinSymbol);
        const amount = holding * fraction;
        
        const coin = market.getCoin(coinSymbol);
        const decimals = coin.symbol === 'DOGE' ? 2 : 8;
        
        // If selling ALL (fraction = 1), use exact holding to avoid rounding errors
        if (fraction === 1) {
            document.getElementById('sellAmount').value = holding;
        } else {
            document.getElementById('sellAmount').value = amount.toFixed(decimals);
        }
        
        this.updateSellPreview();
    }

    updateBuyPreview() {
        const amount = parseFloat(document.getElementById('buyAmount').value) || 0;
        const coinSymbol = gameState.getCurrentCoin();
        const coin = market.getCoin(coinSymbol);
        
        if (coin) {
            const receive = amount / coin.currentPrice;
            const decimals = coin.symbol === 'DOGE' ? 2 : 8;
            document.getElementById('buyReceive').textContent = receive.toFixed(decimals);
        }
    }

    updateSellPreview() {
        const amount = parseFloat(document.getElementById('sellAmount').value) || 0;
        const coinSymbol = gameState.getCurrentCoin();
        const coin = market.getCoin(coinSymbol);
        
        if (coin) {
            const receive = amount * coin.currentPrice;
            document.getElementById('sellReceive').textContent = receive.toFixed(2);
        }
    }

    executeBuy() {
        const amount = parseFloat(document.getElementById('buyAmount').value);
        
        if (isNaN(amount) || amount <= 0) {
            alert('Enter a valid amount');
            return;
        }

        const coinSymbol = gameState.getCurrentCoin();
        const coin = market.getCoin(coinSymbol);
        const result = gameState.buy(coin, amount);

        if (result.success) {
            // Clear input
            document.getElementById('buyAmount').value = '';
            document.getElementById('buyReceive').textContent = '0';

            // Notify listeners
            this.notifyListeners({ type: 'buy', result });
            
            // Show success feedback
            this.showFeedback(`Bought ${result.coinAmount.toFixed(8)} ${coin.symbol}`, 'success');
        } else {
            alert(result.error);
        }
    }

    executeSell() {
        const amount = parseFloat(document.getElementById('sellAmount').value);
        
        if (isNaN(amount) || amount <= 0) {
            alert('Enter a valid amount');
            return;
        }

        const coinSymbol = gameState.getCurrentCoin();
        const coin = market.getCoin(coinSymbol);
        const result = gameState.sell(coin, amount);

        if (result.success) {
            // Clear input
            document.getElementById('sellAmount').value = '';
            document.getElementById('sellReceive').textContent = '0.00';

            // Notify listeners
            this.notifyListeners({ type: 'sell', result });
            
            // Show success feedback
            this.showFeedback(`Sold ${amount.toFixed(8)} ${coin.symbol}`, 'success');
        } else {
            alert(result.error);
        }
    }

    showFeedback(message, type) {
        // Simple feedback - could be enhanced with better UI
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    onTrade(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(trade) {
        this.listeners.forEach(callback => callback(trade));
    }

    updateCoinLabels(coin) {
        // Update UI labels for current coin
        document.getElementById('buy-coin-name').textContent = coin.symbol;
        document.getElementById('sell-coin-name').textContent = coin.symbol;
        document.getElementById('buy-coin-symbol').textContent = coin.symbol;
        
        // Clear inputs when switching coins
        document.getElementById('buyAmount').value = '';
        document.getElementById('sellAmount').value = '';
        document.getElementById('buyReceive').textContent = '0';
        document.getElementById('sellReceive').textContent = '0.00';
    }
}

export const trading = new Trading();