import { gameState } from './game.js';
import { ui } from './ui.js';
import { market } from './market.js';

class Blackjack {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.currentBet = 0;
        this.gameActive = false;
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.deck = [];

        for (let suit of suits) {
            for (let value of values) {
                this.deck.push({
                    suit,
                    value,
                    numValue: value === 'A' ? 11 : (value === 'J' || value === 'Q' || value === 'K' ? 10 : parseInt(value))
                });
            }
        }

        // Shuffle deck
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    drawCard() {
        if (this.deck.length === 0) {
            this.createDeck();
        }
        return this.deck.pop();
    }

    calculateHand(hand) {
        let total = 0;
        let aces = 0;

        for (let card of hand) {
            total += card.numValue;
            if (card.value === 'A') {
                aces++;
            }
        }

        // Adjust for aces
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    startGame(bet) {
        const cash = gameState.getCash();

        if (bet <= 0 || isNaN(bet)) {
            alert('Enter a valid bet amount');
            return false;
        }

        if (bet > cash) {
            alert('Insufficient funds');
            return false;
        }

        // Deduct bet
        gameState.portfolio.cash -= bet;
        this.currentBet = bet;
        this.gameActive = true;
        gameState.blackjackActive = true; // Prevent game over during blackjack

        // Create new deck and deal
        this.createDeck();
        this.playerHand = [this.drawCard(), this.drawCard()];
        this.dealerHand = [this.drawCard(), this.drawCard()];

        this.render();

        // Check for blackjack
        if (this.calculateHand(this.playerHand) === 21) {
            setTimeout(() => this.checkWinner(), 500);
        }

        return true;
    }

    hit() {
        if (!this.gameActive) return;

        this.playerHand.push(this.drawCard());
        this.render();

        const playerTotal = this.calculateHand(this.playerHand);
        if (playerTotal > 21) {
            setTimeout(() => this.checkWinner(), 500);
        } else if (playerTotal === 21) {
            setTimeout(() => this.stand(), 500);
        }
    }

    stand() {
        if (!this.gameActive) return;

        // Dealer draws until 17 or higher
        while (this.calculateHand(this.dealerHand) < 17) {
            this.dealerHand.push(this.drawCard());
        }

        this.render(true); // Show dealer's hidden card
        setTimeout(() => this.checkWinner(), 500);
    }

    checkWinner() {
        this.gameActive = false;
        // DON'T clear blackjackActive yet - wait until results are shown

        const playerTotal = this.calculateHand(this.playerHand);
        const dealerTotal = this.calculateHand(this.dealerHand);

        let result, className, winAmount;

        if (playerTotal > 21) {
            result = `BUST! You lose $${this.currentBet}`;
            className = 'lose';
            winAmount = 0;
        } else if (dealerTotal > 21) {
            result = `Dealer BUST! You win $${this.currentBet}`;
            className = 'win';
            winAmount = this.currentBet * 2;
        } else if (playerTotal > dealerTotal) {
            result = `You WIN $${this.currentBet}!`;
            className = 'win';
            winAmount = this.currentBet * 2;
        } else if (dealerTotal > playerTotal) {
            result = `Dealer wins. You lose $${this.currentBet}`;
            className = 'lose';
            winAmount = 0;
        } else {
            result = `PUSH! Bet returned ($${this.currentBet})`;
            className = 'push';
            winAmount = this.currentBet;
        }

        // Update cash
        if (winAmount > 0) {
            gameState.portfolio.cash += winAmount;
        }

        // Save and update UI
        gameState.save();
        ui.updatePortfolio();

        // Show result FIRST
        const resultEl = document.getElementById('gameResult');
        resultEl.textContent = result;
        resultEl.className = `blackjack-result show ${className}`;

        // Show bet area, hide actions
        document.getElementById('betArea').style.display = 'block';
        document.getElementById('gameActions').style.display = 'none';

        // Record transaction
        const transaction = {
            type: winAmount >= this.currentBet * 2 ? 'blackjack_win' : (winAmount > 0 ? 'blackjack_push' : 'blackjack_loss'),
            coin: 'CASH',
            coinName: 'Blackjack',
            amount: this.currentBet,
            price: 0,
            total: winAmount - this.currentBet,
            timestamp: Date.now()
        };
        gameState.transactions.unshift(transaction);

        // THEN check for game over after results are visible (2 second delay)
        setTimeout(() => {
            console.log('Blackjack: 2 second delay complete, checking for game over');
            gameState.blackjackActive = false; // Now allow game over detection
            const coins = market.getAllCoins();
            gameState.calculateNetworth(coins);
        }, 2000);
    }

    render(showDealerCard = false) {
        // Render player's hand
        const playerCardsEl = document.getElementById('playerCards');
        playerCardsEl.innerHTML = this.playerHand.map(card => 
            `<div class="card ${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}">
                ${card.value}${card.suit}
            </div>`
        ).join('');
        document.getElementById('playerTotal').textContent = this.calculateHand(this.playerHand);

        // Render dealer's hand
        const dealerCardsEl = document.getElementById('dealerCards');
        dealerCardsEl.innerHTML = this.dealerHand.map((card, i) => {
            if (i === 1 && !showDealerCard && this.gameActive) {
                return `<div class="card back">🃏</div>`;
            }
            return `<div class="card ${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}">
                ${card.value}${card.suit}
            </div>`;
        }).join('');

        if (showDealerCard || !this.gameActive) {
            document.getElementById('dealerTotal').textContent = this.calculateHand(this.dealerHand);
        } else {
            document.getElementById('dealerTotal').textContent = '?';
        }

        // Show/hide UI elements
        if (this.gameActive) {
            document.getElementById('betArea').style.display = 'none';
            document.getElementById('gameActions').style.display = 'flex';
            document.getElementById('gameResult').className = 'blackjack-result';
        }
    }

    reset() {
        // Reset all game state
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.currentBet = 0;
        this.gameActive = false;
        
        // Reset UI
        document.getElementById('playerCards').innerHTML = '';
        document.getElementById('dealerCards').innerHTML = '';
        document.getElementById('playerTotal').textContent = '0';
        document.getElementById('dealerTotal').textContent = '0';
        document.getElementById('betAmount').value = '';
        document.getElementById('betArea').style.display = 'block';
        document.getElementById('gameActions').style.display = 'none';
        document.getElementById('gameResult').className = 'blackjack-result';
    }
}

export const blackjack = new Blackjack();
