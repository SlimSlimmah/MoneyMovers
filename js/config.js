// Firebase Configuration
// Replace with your Firebase project credentials
export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Game Configuration
export const gameConfig = {
    STARTING_CASH: 10000,
    PRICE_UPDATE_INTERVAL: 5000, // 5 seconds
    LEADERBOARD_UPDATE_INTERVAL: 10000, // 10 seconds
    MAX_TRANSACTIONS_SHOWN: 50,
    COIN_CREATION_COST: 1000
};

// Coin Definitions
export const COINS = {
    BTC: {
        name: 'Bitcoin',
        symbol: 'BTC',
        startPrice: 45000,
        baseVolatility: 500,
        minPrice: 0,
        maxPrice: 999999,
        color: '#f7931a',
        isCustom: false
    },
    ETH: {
        name: 'Ethereum',
        symbol: 'ETH',
        startPrice: 2500,
        baseVolatility: 100,
        minPrice: 0,
        maxPrice: 999999,
        color: '#627eea',
        isCustom: false
    },
    DOGE: {
        name: 'Dogecoin',
        symbol: 'DOGE',
        startPrice: 0.15,
        baseVolatility: 0.02,
        minPrice: 0,
        maxPrice: 999999,
        color: '#c2a633',
        isCustom: false
    },
    SOL: {
        name: 'Solana',
        symbol: 'SOL',
        startPrice: 120,
        baseVolatility: 15,
        minPrice: 0,
        maxPrice: 999999,
        color: '#9945ff',
        isCustom: false
    }
};