import { gameState } from './game.js';
import { ui } from './ui.js';

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

        // Create new deck and deal
        this.createDeck();
        this.playerHand = [this.drawCard(), this.drawCard()];
        this.dealerHand = [this.drawCard(), this.drawCard()];

        this.render();

        // Check for immediate blackjack
        if (this.calculateHand(this.playerHand) === 21) {
            this.endGame('blackjack');
        }

        return true;
    }

    hit() {
        if (!this.gameActive) return;

        this.playerHand.push(this.drawCard());
        this.render();

        const playerTotal = this.calculateHand(this.playerHand);
        if (playerTotal > 21) {
            this.endGame('bust');
        } else if (playerTotal === 21) {
            this.stand();
        }
    }

    stand() {
        if (!this.gameActive) return;

        // Dealer plays
        this.dealerPlay();
    }

    dealerPlay() {
        const dealerTotal = this.calculateHand(this.dealerHand);
        const playerTotal = this.calculateHand(this.playerHand);

        // Dealer hits on 16 or less
        while (this.calculateHand(this.dealerHand) < 17) {
            this.dealerHand.push(this.drawCard());
        }

        this.render();

        const finalDealerTotal = this.calculateHand(this.dealerHand);

        // Determine winner
        if (finalDealerTotal > 21) {
            this.endGame('dealer-bust');
        } else if (finalDealerTotal > playerTotal) {
            this.endGame('lose');
        } else if (finalDealerTotal < playerTotal) {
            this.endGame('win');
        } else {
            this.endGame('push');
        }
    }

    endGame(result) {
        this.gameActive = false;

        let winnings = 0;
        let message = '';
        let resultClass = '';

        switch (result) {
            case 'blackjack':
                winnings = this.currentBet * 2.5;
                message = `🎰 BLACKJACK! +$${(this.currentBet * 1.5).toFixed(2)}`;
                resultClass = 'win';
                break;
            case 'win':
                winnings = this.currentBet * 2;
                message = `💰 YOU WIN! +$${this.currentBet.toFixed(2)}`;
                resultClass = 'win';
                break;
            case 'dealer-bust':
                winnings = this.currentBet * 2;
                message = `💥 DEALER BUSTS! +$${this.currentBet.toFixed(2)}`;
                resultClass = 'win';
                break;
            case 'lose':
                winnings = 0;
                message = `😢 YOU LOSE! -$${this.currentBet.toFixed(2)}`;
                resultClass = 'lose';
                break;
            case 'bust':
                winnings = 0;
                message = `💥 BUST! -$${this.currentBet.toFixed(2)}`;
                resultClass = 'lose';
                break;
            case 'push':
                winnings = this.currentBet;
                message = `🤝 PUSH! $${this.currentBet.toFixed(2)} returned`;
                resultClass = 'push';
                break;
        }

        // Add winnings
        gameState.portfolio.cash += winnings;
        gameState.save();
        ui.updatePortfolio();

        // Show result
        const resultEl = document.getElementById('gameResult');
        resultEl.textContent = message;
        resultEl.className = `blackjack-result show ${resultClass}`;

        // Hide game actions, show bet area
        document.getElementById('gameActions').style.display = 'none';
        document.getElementById('betArea').style.display = 'block';

        // Clear bet input
        document.getElementById('betAmount').value = '';
    }

    render() {
        // Render dealer hand
        const dealerCardsEl = document.getElementById('dealerCards');
        const dealerTotalEl = document.getElementById('dealerTotal');
        
        if (this.gameActive && this.dealerHand.length === 2) {
            // Hide second card during game
            dealerCardsEl.innerHTML = this.renderCard(this.dealerHand[0]) + this.renderCard({ suit: '', value: '?' }, true);
            dealerTotalEl.textContent = '?';
        } else {
            dealerCardsEl.innerHTML = this.dealerHand.map(card => this.renderCard(card)).join('');
            dealerTotalEl.textContent = this.calculateHand(this.dealerHand);
        }

        // Render player hand
        const playerCardsEl = document.getElementById('playerCards');
        const playerTotalEl = document.getElementById('playerTotal');
        playerCardsEl.innerHTML = this.playerHand.map(card => this.renderCard(card)).join('');
        playerTotalEl.textContent = this.calculateHand(this.playerHand);

        // Show/hide action buttons
        if (this.gameActive) {
            document.getElementById('gameActions').style.display = 'flex';
            document.getElementById('betArea').style.display = 'none';
        }
    }

    renderCard(card, hidden = false) {
        if (hidden) {
            return `<div class="card hidden">🂠</div>`;
        }
        const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : '';
        return `<div class="card ${color}">${card.value}${card.suit}</div>`;
    }
}

export const blackjack = new Blackjack();