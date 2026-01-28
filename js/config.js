// Firebase Configuration
// Replace with your Firebase project credentials
export const firebaseConfig = {
  apiKey: "AIzaSyDJC5JD9Jd1MZQujcEXhFj5HHS6eHdVI5c",
  authDomain: "moneymovers-dc7b7.firebaseapp.com",
  projectId: "moneymovers-dc7b7",
  storageBucket: "moneymovers-dc7b7.firebasestorage.app",
  messagingSenderId: "856583400284",
  appId: "1:856583400284:web:e33aac254e4dc7722aaf99",
  measurementId: "G-FGC1Z706TB"
};

// Game Configuration
export const gameConfig = {
    STARTING_CASH: 10000,
    PRICE_UPDATE_INTERVAL: 5000, // 5 seconds
    LEADERBOARD_UPDATE_INTERVAL: 10000, // 10 seconds
    NETWORTH_SYNC_INTERVAL: 15000, // 15 seconds - how often to save networth to leaderboard
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
        drift: 0.015, // Slow, steady growth (blue chip)
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
        drift: 0.01, // Moderate growth
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
        drift: -0.02, // Risky meme coin - trends down
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
        drift: 0.025, // Hot coin - strong growth
        minPrice: 0,
        maxPrice: 999999,
        color: '#9945ff',
        isCustom: false
    }
};




