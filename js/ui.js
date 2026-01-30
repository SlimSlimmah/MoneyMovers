import { gameState } from './game.js';
import { market } from './market.js';
import { firebaseService } from './firebase.js';
import { chartManager } from './chart.js';
import { trading } from './trading.js';
import { gameConfig } from './config.js';
import { blackjack } from './blackjack.js';

class UI {
    constructor() {
        this.currentTab = 'history';
        this.leaderboard = [];
        this.isPortfolioView = false;
        this.coinSelectorExpanded = false;
    }

    initialize() {
        // Set up coin selector
        this.updateCoinSelector();
        this.initializeDragScroll();
        this.initializeCoinCreation();
        this.initializeViewToggle();
        this.initializeCoinSelectorToggle();
        this.initializeChat();

        // Set up tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Set up reset button
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset your portfolio?')) {
                gameState.blackjackActive = false; // Clear blackjack flag
                blackjack.reset(); // Reset blackjack game state
                gameState.reset();
                this.updateAll();
            }
        });

        // Set up game over modal
        document.getElementById('gameOverReset')?.addEventListener('click', () => {
            const modal = document.getElementById('gameOverModal');
            if (modal) {
                modal.style.display = 'none';
            }
            gameState.gameOverShown = false; // Allow showing again if they lose again
            gameState.blackjackActive = false; // Clear blackjack flag
            blackjack.reset(); // Reset blackjack game state
            gameState.reset();
            this.updateAll();
        });

        // Subscribe to leaderboard updates
        console.log('🟢 Subscribing to leaderboard updates...');
        firebaseService.subscribeToLeaderboard((users) => {
            console.log('🟢 UI received leaderboard data:', users.length, 'users');
            this.leaderboard = users;
            if (this.currentView === 'leaderboard') {
                console.log('🟢 Updating leaderboard display');
                this.updateLeaderboard();
            } else {
                console.log('🟢 Not on leaderboard tab, skipping display update');
            }
        });

        // Subscribe to custom coins
        firebaseService.subscribeToCustomCoins((data) => {
            if (data.type === 'added') {
                this.handleNewCustomCoin(data.coin);
            }
        });
    }

    initializeViewToggle() {
        const portfolioBtn = document.getElementById('portfolioToggleBtn');
        const blackjackBtn = document.getElementById('blackjackToggleBtn');
        const leaderboardBtn = document.getElementById('leaderboardToggleBtn');
        const marketView = document.getElementById('marketView');
        const portfolioView = document.getElementById('portfolioView');
        const blackjackView = document.getElementById('blackjackView');

        this.currentView = 'market'; // 'market', 'portfolio', 'blackjack', or 'leaderboard'

        portfolioBtn?.addEventListener('click', () => {
            if (this.currentView === 'portfolio') {
                // Toggle back to market
                this.showView('market');
            } else {
                // Show portfolio
                this.showView('portfolio');
            }
        });

        blackjackBtn?.addEventListener('click', () => {
            if (this.currentView === 'blackjack') {
                // Toggle back to market
                this.showView('market');
            } else {
                // Show blackjack
                this.showView('blackjack');
            }
        });

        leaderboardBtn?.addEventListener('click', () => {
            if (this.currentView === 'leaderboard') {
                // Toggle back to market
                this.showView('market');
            } else {
                // Show leaderboard
                this.showView('leaderboard');
            }
        });

        const chatBtn = document.getElementById('chatToggleBtn');
        chatBtn?.addEventListener('click', () => {
            if (this.currentView === 'chat') {
                // Toggle back to market
                this.showView('market');
            } else {
                // Show chat
                this.showView('chat');
            }
        });
    }

    initializeCoinSelectorToggle() {
        const toggleBtn = document.getElementById('coinSelectorToggle');
        const horizontalSelector = document.getElementById('coinSelector');
        const expandedSelector = document.getElementById('coinSelectorExpanded');

        toggleBtn?.addEventListener('click', () => {
            this.coinSelectorExpanded = !this.coinSelectorExpanded;
            
            if (this.coinSelectorExpanded) {
                // Show expanded view
                horizontalSelector.style.display = 'none';
                expandedSelector.style.display = 'grid';
                toggleBtn.textContent = 'SELECT COIN ▲';
                toggleBtn.classList.add('expanded');
                this.updateExpandedCoinSelector();
            } else {
                // Show horizontal view
                horizontalSelector.style.display = 'flex';
                expandedSelector.style.display = 'none';
                toggleBtn.textContent = 'SELECT COIN ▼';
                toggleBtn.classList.remove('expanded');
            }
        });
    }

    showView(view) {
        const portfolioBtn = document.getElementById('portfolioToggleBtn');
        const blackjackBtn = document.getElementById('blackjackToggleBtn');
        const leaderboardBtn = document.getElementById('leaderboardToggleBtn');
        const chatBtn = document.getElementById('chatToggleBtn');
        const marketView = document.getElementById('marketView');
        const portfolioView = document.getElementById('portfolioView');
        const blackjackView = document.getElementById('blackjackView');
        const leaderboardView = document.getElementById('leaderboardView');
        const chatView = document.getElementById('chatView');

        this.currentView = view;
        this.isPortfolioView = (view === 'portfolio');

        // Hide all views
        marketView.classList.remove('active');
        portfolioView.classList.remove('active');
        blackjackView.classList.remove('active');
        leaderboardView.classList.remove('active');
        chatView.classList.remove('active');

        // Remove active from all buttons
        portfolioBtn.classList.remove('active');
        blackjackBtn.classList.remove('active');
        leaderboardBtn.classList.remove('active');
        chatBtn.classList.remove('active');

        // Show selected view
        if (view === 'portfolio') {
            portfolioView.classList.add('active');
            portfolioBtn.classList.add('active');
            this.updatePortfolioView();
        } else if (view === 'blackjack') {
            blackjackView.classList.add('active');
            blackjackBtn.classList.add('active');
        } else if (view === 'leaderboard') {
            leaderboardView.classList.add('active');
            leaderboardBtn.classList.add('active');
            this.updateLeaderboard();
        } else if (view === 'chat') {
            chatView.classList.add('active');
            chatBtn.classList.add('active');
        } else {
            marketView.classList.add('active');
        }
        
        // Check for game over when switching views
        const coins = market.getAllCoins();
        gameState.calculateNetworth(coins);
    }

    updatePortfolioView() {
        const list = document.getElementById('portfolioList');
        if (!list) return;

        const coins = market.getAllCoins();
        const holdings = gameState.portfolio.holdings;

        // Create array of coins with their values for sorting
        const coinArray = Object.entries(coins).map(([symbol, coin]) => {
            const holding = holdings[symbol] || 0;
            const value = holding * coin.currentPrice;
            return { symbol, coin, holding, value };
        });

        // Sort by value (highest first), then by name
        coinArray.sort((a, b) => {
            if (b.value !== a.value) {
                return b.value - a.value; // Highest value first
            }
            return a.coin.name.localeCompare(b.coin.name); // Alphabetical if same value
        });

        const items = coinArray.map(({ symbol, coin, holding, value }) => {
            const priceDecimals = coin.symbol === 'DOGE' ? 4 : 2;
            // Check if holding is effectively zero (handles floating point precision)
            const isEmpty = holding < 0.00000001;
            
            // Always show full precision for holdings (no rounding issues)
            const holdingDisplay = isEmpty ? '0' : holding.toString();

            return `
                <div class="portfolio-item ${isEmpty ? 'empty-holding' : ''}">
                    <div class="portfolio-coin-header">
                        <div>
                            <div class="portfolio-coin-name">${coin.name}</div>
                            <div class="portfolio-coin-symbol">${coin.symbol}</div>
                        </div>
                        <div class="portfolio-coin-price">
                            $${coin.currentPrice.toFixed(priceDecimals)}
                            <div class="price-change ${coin.change24h >= 0 ? 'up' : 'down'}" style="font-size: 10px;">
                                ${coin.change24h >= 0 ? '+' : ''}${coin.change24h}%
                            </div>
                        </div>
                    </div>
                    <div class="portfolio-holdings">
                        <div class="portfolio-stat">
                            <div class="portfolio-stat-label">Holdings</div>
                            <div class="portfolio-stat-value" style="font-size: 11px; word-break: break-all;">${holdingDisplay}</div>
                        </div>
                        <div class="portfolio-stat">
                            <div class="portfolio-stat-label">Value</div>
                            <div class="portfolio-stat-value">$${value.toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="portfolio-actions">
                        <div class="portfolio-trade-section">
                            <div class="portfolio-trade-header">BUY</div>
                            <div class="input-group">
                                <input type="number" 
                                       class="portfolio-input" 
                                       id="portfolio-buy-${symbol}" 
                                       placeholder="$ Amount"
                                       step="0.01">
                                <button class="quick-btn" 
                                        onclick="window.portfolioBuyAll('${symbol}')"
                                        title="Buy with all cash">
                                    ALL
                                </button>
                            </div>
                            <button class="trade-btn" 
                                    onclick="window.portfolioBuy('${symbol}')">
                                BUY
                            </button>
                        </div>
                        
                        <div class="portfolio-trade-section">
                            <div class="portfolio-trade-header">SELL</div>
                            <div class="input-group">
                                <input type="number" 
                                       class="portfolio-input" 
                                       id="portfolio-sell-${symbol}" 
                                       placeholder="Coin Amount"
                                       step="0.00000001"
                                       ${isEmpty ? 'disabled' : ''}>
                                <button class="quick-btn" 
                                        onclick="window.portfolioSellAll('${symbol}')"
                                        ${isEmpty ? 'disabled' : ''}
                                        title="Sell all holdings">
                                    ALL
                                </button>
                            </div>
                            <button class="trade-btn sell" 
                                    onclick="window.portfolioSell('${symbol}')"
                                    ${isEmpty ? 'disabled' : ''}>
                                SELL
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        list.innerHTML = items || '<div class="empty-state">No coins available</div>';
    }

    initializeCoinCreation() {
        const createBtn = document.getElementById('createCoinBtn');
        const modal = document.getElementById('createCoinModal');
        const submitBtn = document.getElementById('createCoinSubmit');
        const cancelBtn = document.getElementById('createCoinCancel');
        const nameInput = document.getElementById('coinNameInput');
        const symbolInput = document.getElementById('coinSymbolInput');

        createBtn?.addEventListener('click', () => {
            modal.classList.add('active');
            nameInput.value = '';
            symbolInput.value = '';
            nameInput.focus();
        });

        cancelBtn?.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        submitBtn?.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            const symbol = symbolInput.value.trim().toUpperCase();

            if (!name || !symbol) {
                alert('Please enter both name and symbol');
                return;
            }

            if (symbol.length < 2 || symbol.length > 5) {
                alert('Symbol must be 2-5 characters');
                return;
            }

            if (!/^[A-Z]+$/.test(symbol)) {
                alert('Symbol must only contain letters');
                return;
            }

            // Check if can afford
            if (gameState.getCash() < gameConfig.COIN_CREATION_COST) {
                alert('Insufficient funds! Need $1,000');
                return;
            }

            // Create coin locally
            const result = gameState.createCoin(name, symbol);
            if (!result.success) {
                alert(result.error);
                return;
            }

            // Generate random color
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Determine appropriate starting price and volatility based on symbol length
            const startPrice = symbol.length <= 3 ? 100 : 1;
            const baseVolatility = startPrice * 0.05;

            // Generate random drift for custom coins
            // Range: -0.03 to +0.03 (more extreme than default coins)
            const drift = (Math.random() - 0.5) * 0.06;

            // Create coin config
            const coinConfig = {
                name: name,
                symbol: symbol,
                startPrice: startPrice,
                baseVolatility: baseVolatility,
                drift: drift,
                minPrice: 0,
                maxPrice: 999999,
                color: color,
                isCustom: true
            };

            // Save to Firebase
            await firebaseService.createCustomCoin(coinConfig);

            // Add to market
            market.addCustomCoin(symbol, coinConfig);

            // Force immediate save to update leaderboard
            await firebaseService.savePortfolio(gameState.portfolio);

            modal.classList.remove('active');
            this.updateCoinSelector();
            this.updatePortfolio();
            this.updateTransactionHistory();

            alert(`Created ${name} (${symbol}) for $${gameConfig.COIN_CREATION_COST}!`);
        });
    }

    handleNewCustomCoin(coin) {
        // Add coin to market if not already there
        if (!market.getCoin(coin.symbol)) {
            market.addCustomCoin(coin.symbol, coin);
            this.updateCoinSelector();
        }
    }

    initializeDragScroll() {
        const coinSelector = document.getElementById('coinSelector');
        if (!coinSelector) return;

        let isDown = false;
        let startX;
        let scrollLeft;

        coinSelector.addEventListener('mousedown', (e) => {
            isDown = true;
            coinSelector.style.cursor = 'grabbing';
            startX = e.pageX - coinSelector.offsetLeft;
            scrollLeft = coinSelector.scrollLeft;
        });

        coinSelector.addEventListener('mouseleave', () => {
            isDown = false;
            coinSelector.style.cursor = 'grab';
        });

        coinSelector.addEventListener('mouseup', () => {
            isDown = false;
            coinSelector.style.cursor = 'grab';
        });

        coinSelector.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - coinSelector.offsetLeft;
            const walk = (x - startX) * 2; // Scroll speed multiplier
            coinSelector.scrollLeft = scrollLeft - walk;
        });

        // Touch support for mobile
        let touchStartX = 0;
        let touchScrollLeft = 0;

        coinSelector.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].pageX - coinSelector.offsetLeft;
            touchScrollLeft = coinSelector.scrollLeft;
        });

        coinSelector.addEventListener('touchmove', (e) => {
            const x = e.touches[0].pageX - coinSelector.offsetLeft;
            const walk = (x - touchStartX) * 2;
            coinSelector.scrollLeft = touchScrollLeft - walk;
        });
    }

    updateCoinSelector() {
        const selector = document.getElementById('coinSelector');
        if (!selector) return;

        const coins = market.getAllCoins();
        selector.innerHTML = '';

        Object.entries(coins).forEach(([symbol, coin]) => {
            // Skip delisted coins
            if (coin.delisted) return;
            
            const btn = document.createElement('button');
            btn.className = 'coin-btn';
            btn.dataset.coin = symbol;
            
            if (symbol === gameState.getCurrentCoin()) {
                btn.classList.add('active');
            }

            btn.innerHTML = `
                <span class="coin-name">${coin.symbol}</span>
                <span class="coin-price">$${coin.currentPrice.toFixed(symbol === 'DOGE' ? 4 : 2)}</span>
            `;

            btn.addEventListener('click', () => {
                this.selectCoin(symbol);
            });

            selector.appendChild(btn);
        });

        // Update expanded view if it's currently shown
        if (this.coinSelectorExpanded) {
            this.updateExpandedCoinSelector();
        }
    }

    updateExpandedCoinSelector() {
        const selector = document.getElementById('coinSelectorExpanded');
        if (!selector) return;

        const coins = market.getAllCoins();
        selector.innerHTML = '';

        Object.entries(coins).forEach(([symbol, coin]) => {
            // Skip delisted coins
            if (coin.delisted) return;
            
            const btn = document.createElement('button');
            btn.className = 'coin-btn-expanded';
            btn.dataset.coin = symbol;
            
            if (symbol === gameState.getCurrentCoin()) {
                btn.classList.add('active');
            }

            btn.innerHTML = `
                <span class="coin-name">${coin.symbol} - ${coin.name}</span>
                <span class="coin-price">$${coin.currentPrice.toFixed(symbol === 'DOGE' ? 4 : 2)}</span>
            `;

            btn.addEventListener('click', () => {
                this.selectCoin(symbol);
            });

            selector.appendChild(btn);
        });
    }

    selectCoin(symbol) {
        gameState.setCurrentCoin(symbol);
        
        // Update active state for both horizontal and expanded views
        document.querySelectorAll('.coin-btn, .coin-btn-expanded').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.coin === symbol) {
                btn.classList.add('active');
            }
        });

        // Update UI for selected coin
        const coin = market.getCoin(symbol);
        this.updateCoinInfo(coin);
        chartManager.setCoin(symbol);
        trading.updateCoinLabels(coin);
    }

    updateCoinInfo(coin) {
        // Update price and holding for selected coin
        const holding = gameState.getHolding(coin.symbol);
        const decimals = coin.symbol === 'DOGE' ? 4 : 8;
        
        document.getElementById('holding').textContent = holding.toFixed(decimals);
        document.getElementById('coin-symbol').textContent = coin.symbol;
        document.getElementById('price').textContent = coin.currentPrice.toFixed(coin.symbol === 'DOGE' ? 4 : 2);
        
        // Update price change
        const changeEl = document.getElementById('priceChange');
        const change = parseFloat(coin.change24h);
        changeEl.textContent = `${change >= 0 ? '+' : ''}${change}%`;
        changeEl.className = `price-change ${change >= 0 ? 'up' : 'down'}`;
    }

    updatePortfolio() {
        const cash = gameState.getCash();
        const networth = gameState.getNetworth();

        document.getElementById('cash').textContent = cash.toFixed(2);
        document.getElementById('networth-detail').textContent = networth.toFixed(2);

        // Update current coin holding
        const currentCoin = market.getCoin(gameState.getCurrentCoin());
        if (currentCoin) {
            this.updateCoinInfo(currentCoin);
        }
    }

    updateTransactionHistory() {
        const list = document.getElementById('transactionList');
        if (!list) return;

        const transactions = gameState.getTransactions();

        if (transactions.length === 0) {
            list.innerHTML = '<div class="empty-state">No transactions yet</div>';
            return;
        }

        list.innerHTML = transactions.slice(0, 50).map(tx => {
            const time = new Date(tx.timestamp).toLocaleString();
            
            if (tx.type === 'create_coin') {
                return `
                    <div class="transaction-item create">
                        <div class="transaction-info">
                            <div class="transaction-type">CREATED ${tx.coinName}</div>
                            <div class="transaction-details">
                                Symbol: ${tx.coin}
                            </div>
                            <div class="transaction-time">${time}</div>
                        </div>
                        <div class="transaction-amount">
                            -$${tx.total.toFixed(2)}
                        </div>
                    </div>
                `;
            }

            if (tx.type.startsWith('blackjack')) {
                const isWin = tx.type === 'blackjack_win';
                const isPush = tx.type === 'blackjack_push';
                const className = isWin ? 'win' : (isPush ? 'push' : 'lose');
                const typeText = isWin ? 'BLACKJACK WIN' : (isPush ? 'BLACKJACK PUSH' : 'BLACKJACK LOSS');
                
                return `
                    <div class="transaction-item ${className}">
                        <div class="transaction-info">
                            <div class="transaction-type">${typeText}</div>
                            <div class="transaction-details">
                                Bet: $${tx.amount.toFixed(2)}
                            </div>
                            <div class="transaction-time">${time}</div>
                        </div>
                        <div class="transaction-amount">
                            ${tx.total >= 0 ? '+' : ''}$${tx.total.toFixed(2)}
                        </div>
                    </div>
                `;
            }

            if (tx.type === 'liquidation') {
                const decimals = tx.coin === 'DOGE' ? 4 : 8;
                return `
                    <div class="transaction-item liquidation">
                        <div class="transaction-info">
                            <div class="transaction-type">🚨 LIQUIDATION: ${tx.coinName}</div>
                            <div class="transaction-details">
                                Lost ${tx.amount.toFixed(decimals)} ${tx.coin}
                            </div>
                            <div class="transaction-reason">${tx.reason}</div>
                            <div class="transaction-time">${time}</div>
                        </div>
                        <div class="transaction-amount liquidation-loss">
                            -100%
                        </div>
                    </div>
                `;
            }
            
            const decimals = tx.coin === 'DOGE' ? 4 : 8;
            
            return `
                <div class="transaction-item ${tx.type}">
                    <div class="transaction-info">
                        <div class="transaction-type">${tx.type.toUpperCase()} ${tx.coinName}</div>
                        <div class="transaction-details">
                            ${tx.amount.toFixed(decimals)} ${tx.coin} @ $${tx.price.toFixed(tx.coin === 'DOGE' ? 4 : 2)}
                        </div>
                        <div class="transaction-time">${time}</div>
                    </div>
                    <div class="transaction-amount">
                        ${tx.type === 'buy' ? '-' : '+'}$${tx.total.toFixed(2)}
                    </div>
                </div>
            `;
        }).join('');
    }

    initializeChat() {
        this.chatMessages = [];
        
        // Subscribe to chat messages
        firebaseService.subscribeToChatMessages((messages) => {
            this.chatMessages = messages;
            if (this.currentView === 'chat') {
                this.renderChatMessages();
            }
        });

        // Set up send button
        const sendBtn = document.getElementById('chatSend');
        const inputEl = document.getElementById('chatInput');

        sendBtn?.addEventListener('click', () => {
            this.sendChatMessage();
        });

        // Send on Enter key
        inputEl?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
    }

    async sendChatMessage() {
        const inputEl = document.getElementById('chatInput');
        const message = inputEl.value.trim();

        if (!message) return;
        if (message.length > 200) {
            alert('Message too long (max 200 characters)');
            return;
        }

        const username = firebaseService.username || 'Anonymous';
        await firebaseService.sendChatMessage(message, username);
        inputEl.value = '';
    }

    renderChatMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        if (this.chatMessages.length === 0) {
            container.innerHTML = '<div class="empty-state">No messages yet. Be the first to chat!</div>';
            return;
        }

        const currentUserId = firebaseService.userId;
        container.innerHTML = this.chatMessages.map(msg => {
            const isOwnMessage = msg.userId === currentUserId;
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="chat-message ${isOwnMessage ? 'own-message' : ''}">
                    <div class="chat-message-header">
                        <span class="chat-message-username">${msg.username}</span>
                        <span class="chat-message-time">${time}</span>
                    </div>
                    <div class="chat-message-text">${this.escapeHtml(msg.message)}</div>
                </div>
            `;
        }).join('');

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    updateLeaderboard() {
        console.log('🟢 updateLeaderboard called, leaderboard data:', this.leaderboard);
        
        const list = document.getElementById('leaderboardList');
        if (!list) {
            console.log('🟢 leaderboardList element not found!');
            return;
        }

        if (this.leaderboard.length === 0) {
            console.log('🟢 No leaderboard data, showing empty state');
            list.innerHTML = '<div class="empty-state">No players yet</div>';
            return;
        }

        console.log('🟢 Rendering', this.leaderboard.length, 'users');
        const currentUserId = firebaseService.userId;

        list.innerHTML = this.leaderboard.map((user, index) => {
            const isCurrentUser = user.userId === currentUserId;
            
            return `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank">#${index + 1}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">
                            ${user.username}${isCurrentUser ? ' (You)' : ''}
                        </div>
                    </div>
                    <div class="leaderboard-networth">$${user.networth.toFixed(0)}</div>
                </div>
            `;
        }).join('');
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}-tab`)?.classList.add('active');

        // Update content
        if (tab === 'history') {
            this.updateTransactionHistory();
        } else if (tab === 'leaderboard') {
            this.updateLeaderboard();
        }
        
        // Check for game over when switching tabs
        const coins = market.getAllCoins();
        gameState.calculateNetworth(coins);
    }

    updateAll() {
        const coins = market.getAllCoins();
        gameState.calculateNetworth(coins);
        
        this.updateCoinSelector();
        this.updatePortfolio();
        
        const currentCoin = market.getCoin(gameState.getCurrentCoin());
        if (currentCoin) {
            this.updateCoinInfo(currentCoin);
            chartManager.updateChart(currentCoin.symbol);
        }

        if (this.currentTab === 'history') {
            this.updateTransactionHistory();
        }

        // Update portfolio view if it's currently visible
        if (this.isPortfolioView) {
            this.updatePortfolioView();
        }
    }

    setUsername(username) {
        const usernameEl = document.getElementById('username');
        if (usernameEl) {
            usernameEl.textContent = username;
        }
    }

    setConnectionStatus(connected) {
        const statusLight = document.getElementById('connection-status');
        if (statusLight) {
            statusLight.className = connected ? 'light green' : 'light red';
        }
    }
}

export const ui = new UI();