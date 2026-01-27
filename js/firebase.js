import { firebaseConfig } from './config.js';

class FirebaseService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.userId = null;
        this.username = null;
        this.listeners = {};
    }

    async initialize() {
        try {
            // Initialize Firebase
            firebase.initializeApp(firebaseConfig);
            this.db = firebase.database();
            this.auth = firebase.auth();

            // Sign in anonymously
            await this.auth.signInAnonymously();
            this.userId = this.auth.currentUser.uid;

            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    }

    setUsername(username) {
        this.username = username;
        // Save username to user profile
        this.db.ref(`users/${this.userId}/profile`).update({
            username: username,
            lastActive: Date.now()
        });
    }

    // Market Price Management
    subscribeToPrices(callback) {
        const pricesRef = this.db.ref('market/prices');
        
        pricesRef.on('value', (snapshot) => {
            const prices = snapshot.val();
            if (prices) {
                callback(prices);
            }
        });

        this.listeners.prices = pricesRef;
    }

    updateMarketPrice(coin, price, history) {
        const updates = {
            [`market/prices/${coin}/current`]: price,
            [`market/prices/${coin}/history`]: history,
            [`market/prices/${coin}/lastUpdate`]: Date.now()
        };
        
        return this.db.ref().update(updates);
    }

    async getMarketPrices() {
        const snapshot = await this.db.ref('market/prices').once('value');
        return snapshot.val() || {};
    }

    // User Portfolio Management
    async savePortfolio(portfolio) {
        if (!this.userId) return;

        const updates = {
            [`users/${this.userId}/portfolio`]: portfolio,
            [`users/${this.userId}/profile/lastActive`]: Date.now(),
            [`users/${this.userId}/profile/networth`]: portfolio.networth
        };

        return this.db.ref().update(updates);
    }

    async getPortfolio() {
        if (!this.userId) return null;

        const snapshot = await this.db.ref(`users/${this.userId}/portfolio`).once('value');
        return snapshot.val();
    }

    // Transaction History
    async addTransaction(transaction) {
        if (!this.userId) return;

        const transactionRef = this.db.ref(`users/${this.userId}/transactions`).push();
        
        return transactionRef.set({
            ...transaction,
            timestamp: Date.now()
        });
    }

    async getTransactions(limit = 50) {
        if (!this.userId) return [];

        const snapshot = await this.db.ref(`users/${this.userId}/transactions`)
            .orderByChild('timestamp')
            .limitToLast(limit)
            .once('value');

        const transactions = [];
        snapshot.forEach((child) => {
            transactions.unshift({ id: child.key, ...child.val() });
        });

        return transactions;
    }

    // Leaderboard
    subscribeToLeaderboard(callback) {
        const leaderboardRef = this.db.ref('users')
            .orderByChild('profile/networth')
            .limitToLast(20);

        leaderboardRef.on('value', (snapshot) => {
            const users = [];
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.profile && data.profile.username) {
                    users.push({
                        userId: child.key,
                        username: data.profile.username,
                        networth: data.profile.networth || 0
                    });
                }
            });

            // Sort by networth descending
            users.sort((a, b) => b.networth - a.networth);
            callback(users);
        });

        this.listeners.leaderboard = leaderboardRef;
    }

    // Price Master Election (one client updates prices)
    async tryBecomePriceMaster() {
        const masterRef = this.db.ref('market/priceMaster');
        const snapshot = await masterRef.once('value');
        const currentMaster = snapshot.val();

        // If no master or master is stale (>30 seconds), become master
        if (!currentMaster || Date.now() - currentMaster.lastHeartbeat > 30000) {
            await masterRef.set({
                userId: this.userId,
                lastHeartbeat: Date.now()
            });
            return true;
        }

        return false;
    }

    updatePriceMasterHeartbeat() {
        this.db.ref('market/priceMaster').update({
            lastHeartbeat: Date.now()
        });
    }

    // Custom Coins
    async createCustomCoin(coinData) {
        if (!this.userId) return { success: false, error: 'Not authenticated' };

        const coinRef = this.db.ref('market/customCoins').push();
        const coinId = coinRef.key;

        const customCoin = {
            ...coinData,
            id: coinId,
            createdBy: this.userId,
            createdByUsername: this.username,
            createdAt: Date.now()
        };

        await coinRef.set(customCoin);
        return { success: true, coin: customCoin };
    }

    async getCustomCoins() {
        const snapshot = await this.db.ref('market/customCoins').once('value');
        const coins = {};
        
        snapshot.forEach((child) => {
            coins[child.val().symbol] = child.val();
        });
        
        return coins;
    }

    subscribeToCustomCoins(callback) {
        const coinsRef = this.db.ref('market/customCoins');
        
        coinsRef.on('child_added', (snapshot) => {
            callback({ type: 'added', coin: snapshot.val() });
        });

        this.listeners.customCoins = coinsRef;
    }

    // Cleanup
    unsubscribeAll() {
        Object.values(this.listeners).forEach(ref => {
            ref.off();
        });
        this.listeners = {};
    }
}

export const firebaseService = new FirebaseService();