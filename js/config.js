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
    MAX_TRANSACTIONS_SHOWN: 50
};

// Coin Definitions
export const COINS = {
    BTC: {
        name: 'Bitcoin',
        symbol: 'BTC',
        startPrice: 45000,
        volatility: 500,
        minPrice: 0,
        maxPrice: 999999,
        color: '#f7931a'
    },
    ETH: {
        name: 'Ethereum',
        symbol: 'ETH',
        startPrice: 2500,
        volatility: 100,
        minPrice: 0,
        maxPrice: 999999,
        color: '#627eea'
    },
    DOGE: {
        name: 'Dogecoin',
        symbol: 'DOGE',
        startPrice: 0.15,
        volatility: 0.02,
        minPrice: 0.00,
        maxPrice: 999999,
        color: '#c2a633'
    },
	   SLIM: {
        name: 'Dogecoin',
        symbol: 'DOGE',
        startPrice: 0.15,
        volatility: 0.02,
        minPrice: 0.00,
        maxPrice: 999999,
        color: '#c2a633'
    }
};