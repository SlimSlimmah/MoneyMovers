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

            console.log('Firebase initialized successfully');
            
            // Return promise that resolves when auth state is determined
            return new Promise((resolve) => {
                this.auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        this.userId = user.uid;
                        this.userEmail = user.email;
                        
                        // If anonymous user, check for username
                        if (user.isAnonymous) {
                            const snapshot = await this.db.ref(`users/${user.uid}/profile/username`).once('value');
                            this.username = snapshot.val();
                        }
                        
                        resolve(true); // User is logged in
                    } else {
                        // No user - sign in anonymously
                        try {
                            const credential = await this.auth.signInAnonymously();
                            this.userId = credential.user.uid;
                            console.log('Signed in anonymously:', this.userId);
                            resolve(true);
                        } catch (error) {
                            console.error('Anonymous sign-in failed:', error);
                            resolve(false);
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    }

    async signUp(email, password, username) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            this.userId = userCredential.user.uid;
            this.userEmail = email;
            this.username = username;

            // Set username in database
            await this.db.ref(`users/${this.userId}/profile`).set({
                username: username,
                email: email,
                createdAt: Date.now(),
                lastActive: Date.now()
            });

            return { success: true };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            this.userId = userCredential.user.uid;
            this.userEmail = email;

            // Get username from database
            const snapshot = await this.db.ref(`users/${this.userId}/profile/username`).once('value');
            this.username = snapshot.val() || 'Player';

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
            this.userId = null;
            this.userEmail = null;
            this.username = null;
            return { success: true };
        } catch (error) {
            console.error('Signout error:', error);
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    getCurrentUser() {
        return this.auth.currentUser;
    }

    async getUsername() {
        if (this.username) return this.username;
        
        try {
            const snapshot = await this.db.ref(`users/${this.userId}/profile/username`).once('value');
            this.username = snapshot.val() || 'Player';
            return this.username;
        } catch (error) {
            console.error('Error getting username:', error);
            return 'Player';
        }
    }

    setUsername(username) {
        if (!username) return;
        
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

    // Market Pressure Management
    subscribeToPressure(callback) {
        const pressureRef = this.db.ref('market/pressure');
        
        pressureRef.on('value', (snapshot) => {
            const pressure = snapshot.val() || {};
            callback(pressure);
        });

        this.listeners.pressure = pressureRef;
    }

    async updatePressure(pressureData) {
        const updates = {};
        Object.entries(pressureData).forEach(([symbol, pressure]) => {
            updates[`market/pressure/${symbol}`] = pressure;
        });
        
        return this.db.ref().update(updates);
    }

    async recordTrade(symbol, type, amount) {
        // type: 'buy' or 'sell'
        // amount: dollar amount of trade
        const pressureRef = this.db.ref(`market/pressure/${symbol}/${type}`);
        
        try {
            // Get current value
            const snapshot = await pressureRef.once('value');
            const current = snapshot.val() || 0;
            
            // Add new pressure
            const newValue = current + amount;
            await pressureRef.set(newValue);
        } catch (error) {
            console.error('Error recording trade pressure:', error);
        }
    }

    async delistCoin(symbol, delistingData) {
        const delistingRef = this.db.ref(`market/delistings`).push();
        await delistingRef.set({
            ...delistingData,
            id: delistingRef.key
        });

        // Remove from active coins
        await this.db.ref(`market/customCoins/${symbol}`).remove();
        await this.db.ref(`market/prices/${symbol}`).remove();
        await this.db.ref(`market/pressure/${symbol}`).remove();
    }

    subscribeToDelistings(callback) {
        const delistingsRef = this.db.ref('market/delistings');
        
        delistingsRef.on('child_added', (snapshot) => {
            const delisting = snapshot.val();
            callback(delisting);
        });

        this.listeners.delistings = delistingsRef;
    }

    // User Portfolio Management
    async savePortfolio(portfolio) {
        if (!this.userId) return;

        const updates = {
            [`users/${this.userId}/portfolio`]: portfolio,
            [`users/${this.userId}/profile/lastActive`]: Date.now(),
            [`users/${this.userId}/profile/networth`]: portfolio.networth
        };

        console.log('Saving portfolio with networth:', portfolio.networth);
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
        console.log('🔴 Setting up leaderboard subscription...');
        
        const leaderboardRef = this.db.ref('users')
            .orderByChild('profile/networth')
            .limitToLast(20);

        leaderboardRef.on('value', (snapshot) => {
            console.log('🔴 Leaderboard callback fired!');
            console.log('🔴 Snapshot exists:', snapshot.exists());
            console.log('🔴 Snapshot val:', snapshot.val());
            
            const users = [];
            snapshot.forEach((child) => {
                const data = child.val();
                console.log('🔴 User data:', child.key, data?.profile);
                
                if (data && data.profile && data.profile.username) {
                    users.push({
                        userId: child.key,
                        username: data.profile.username,
                        networth: data.profile.networth || 0
                    });
                } else {
                    console.log('🔴 User skipped - missing profile or username:', child.key);
                }
            });

            console.log('🔴 Leaderboard loaded:', users.length, 'users');
            console.log('🔴 Users array:', users);
            
            // Sort by networth descending
            users.sort((a, b) => b.networth - a.networth);
            callback(users);
        }, (error) => {
            console.error('🔴 Leaderboard subscription error:', error);
        });

        this.listeners.leaderboard = leaderboardRef;
        console.log('🔴 Leaderboard subscription setup complete');
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

    // Chat functions
    async sendChatMessage(message, username) {
        if (!this.userId) return;

        const messageRef = this.db.ref('chat/messages').push();
        await messageRef.set({
            userId: this.userId,
            username: username,
            message: message,
            timestamp: Date.now()
        });
    }

    subscribeToChatMessages(callback) {
        const messagesRef = this.db.ref('chat/messages')
            .orderByChild('timestamp')
            .limitToLast(50); // Keep last 50 messages

        messagesRef.on('value', (snapshot) => {
            const messages = [];
            snapshot.forEach((child) => {
                messages.push({
                    id: child.key,
                    ...child.val()
                });
            });
            callback(messages);
        });

        this.listeners.chat = messagesRef;
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