import { market } from './market.js';

class ChartManager {
    constructor() {
        this.chart = null;
        this.currentTimeframe = '24h';
        this.currentCoin = 'BTC';
    }

    initialize() {
        const ctx = document.getElementById('priceChart')?.getContext('2d');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: '#00ff00',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#00ff00',
                    pointHoverBorderColor: '#000',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#001a00',
                        borderColor: '#00ff00',
                        borderWidth: 1,
                        titleColor: '#00ff00',
                        bodyColor: '#00ff00',
                        displayColors: false,
                        callbacks: {
                            label: (context) => {
                                const coin = market.getCoin(this.currentCoin);
                                const decimals = coin?.symbol === 'DOGE' ? 4 : 2;
                                return `$${context.parsed.y.toFixed(decimals)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { color: '#003300' },
                        ticks: { 
                            color: '#00aa00',
                            maxTicksLimit: 6,
                            callback: function(value, index) {
                                const date = new Date(this.getLabelForValue(value));
                                const hours = date.getHours();
                                const minutes = date.getMinutes();
                                
                                if (hours === 0 && minutes === 0) {
                                    return `${date.getMonth()+1}/${date.getDate()}`;
                                }
                                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            }
                        }
                    },
                    y: {
                        display: true,
                        grid: { color: '#003300' },
                        ticks: { 
                            color: '#00aa00',
                            callback: (value) => {
                                const coin = market.getCoin(this.currentCoin);
                                const decimals = coin?.symbol === 'DOGE' ? 4 : 2;
                                return `$${value.toFixed(decimals)}`;
                            }
                        }
                    }
                }
            }
        });

        // Set up timeframe buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timeframe = e.target.dataset.timeframe;
                this.changeTimeframe(timeframe);
            });
        });
    }

    updateChart(coin, timeframe = null) {
        if (!this.chart) return;

        if (coin) {
            this.currentCoin = coin;
        }

        if (timeframe) {
            this.currentTimeframe = timeframe;
        }

        const history = market.getHistory(this.currentCoin, this.currentTimeframe);
        
        if (history && history.length > 0) {
            this.chart.data.labels = history.map(h => h.time);
            this.chart.data.datasets[0].data = history.map(h => h.price);
            
            // Update chart color based on coin
            const coinData = market.getCoin(this.currentCoin);
            if (coinData) {
                this.chart.data.datasets[0].borderColor = coinData.color;
                this.chart.data.datasets[0].backgroundColor = coinData.color + '20';
                this.chart.data.datasets[0].pointHoverBackgroundColor = coinData.color;
            }
            
            this.chart.update('none');
        }
    }

    changeTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        
        // Update button states
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.timeframe === timeframe) {
                btn.classList.add('active');
            }
        });

        this.updateChart();
    }

    setCoin(coinSymbol) {
        this.currentCoin = coinSymbol;
        this.updateChart();
    }
}

export const chartManager = new ChartManager();