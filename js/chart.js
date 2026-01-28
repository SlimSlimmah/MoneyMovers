import { market } from './market.js';

class ChartManager {
    constructor() {
        this.chart = null;
        this.currentTimeframe = '24h';
        this.currentCoin = 'BTC';
        this.chartType = 'line'; // 'line' or 'candlestick'
    }

    initialize() {
        const ctx = document.getElementById('priceChart')?.getContext('2d');
        if (!ctx) return;

        // Create initial chart
        this.createChart(ctx);

        // Set up timeframe buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timeframe = e.target.dataset.timeframe;
                this.changeTimeframe(timeframe);
            });
        });

        // Set up chart type buttons
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartType = e.target.dataset.chartType;
                this.changeChartType(chartType);
            });
        });
    }

    createChart(ctx) {
        const coinData = market.getCoin(this.currentCoin);
        const color = coinData?.color || '#00ff00';

        if (this.chartType === 'candlestick') {
            // Use bar chart with custom rendering for candlesticks
            this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [
                        // Wicks (high-low)
                        {
                            label: 'Wick',
                            data: [],
                            backgroundColor: 'rgba(0, 255, 0, 0.3)',
                            borderColor: color,
                            borderWidth: 1,
                            barThickness: 1,
                            order: 2
                        },
                        // Bodies (open-close) - up candles
                        {
                            label: 'Up',
                            data: [],
                            backgroundColor: color,
                            borderColor: color,
                            borderWidth: 1,
                            barThickness: 8,
                            order: 1
                        },
                        // Bodies (open-close) - down candles
                        {
                            label: 'Down',
                            data: [],
                            backgroundColor: '#ff3333',
                            borderColor: '#ff3333',
                            borderWidth: 1,
                            barThickness: 8,
                            order: 1
                        }
                    ]
                },
                options: this.getCandlestickOptions(color)
            });
            
            // Store reference for callbacks
            this.chart.chartManager = this;
        } else {
            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        borderColor: color,
                        backgroundColor: color + '20',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: color,
                        pointHoverBorderColor: '#000',
                        pointHoverBorderWidth: 2
                    }]
                },
                options: this.getLineOptions(color)
            });
        }
    }

    getLineOptions(color) {
        return {
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
                    borderColor: color,
                    borderWidth: 1,
                    titleColor: color,
                    bodyColor: color,
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
        };
    }

    getCandlestickOptions(color) {
        return {
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
                    borderColor: color,
                    borderWidth: 1,
                    titleColor: color,
                    bodyColor: color,
                    displayColors: false,
                    callbacks: {
                        title: (context) => {
                            const index = context[0].dataIndex;
                            const history = market.getHistory(this.currentCoin, this.currentTimeframe);
                            if (history && history[index]) {
                                const date = new Date(history[index].time);
                                return date.toLocaleString();
                            }
                            return '';
                        },
                        label: (context) => {
                            // Find the original data point
                            const index = context.dataIndex;
                            const history = market.getHistory(this.currentCoin, this.currentTimeframe);
                            if (history && history[index]) {
                                const data = history[index];
                                const coin = market.getCoin(this.currentCoin);
                                const decimals = coin?.symbol === 'DOGE' ? 4 : 2;
                                return [
                                    `O: $${(data.open || data.price).toFixed(decimals)}`,
                                    `H: $${(data.high || data.price).toFixed(decimals)}`,
                                    `L: $${(data.low || data.price).toFixed(decimals)}`,
                                    `C: $${(data.close || data.price).toFixed(decimals)}`
                                ];
                            }
                            return '';
                        },
                        labelColor: () => {
                            return {
                                borderColor: 'transparent',
                                backgroundColor: 'transparent'
                            };
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#003300' },
                    ticks: { 
                        color: '#00aa00',
                        maxTicksLimit: 6,
                        callback: (value, index) => {
                            const history = market.getHistory(this.currentCoin, this.currentTimeframe);
                            if (history && history[index]) {
                                const date = new Date(history[index].time);
                                const hours = date.getHours();
                                const minutes = date.getMinutes();
                                
                                if (hours === 0 && minutes === 0) {
                                    return `${date.getMonth()+1}/${date.getDate()}`;
                                }
                                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            }
                            return '';
                        }
                    }
                },
                y: {
                    grid: { color: '#003300' },
                    beginAtZero: false,
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
        };
    }

    updateChart(coin, timeframe = null) {
        if (!this.chart) {
            console.warn('Chart not initialized yet');
            return;
        }

        if (coin) {
            this.currentCoin = coin;
        }

        if (timeframe) {
            this.currentTimeframe = timeframe;
        }

        const history = market.getHistory(this.currentCoin, this.currentTimeframe);
        
        if (!history || history.length === 0) {
            console.warn('No history data available');
            return;
        }
        
        if (this.chartType === 'candlestick') {
            // Prepare candlestick data with proper floating bar format
            const labels = history.map((h, i) => i.toString());
            const wicks = [];
            const upBodies = [];
            const downBodies = [];

            history.forEach((h, index) => {
                const open = h.open || h.price;
                const high = h.high || h.price;
                const low = h.low || h.price;
                const close = h.close || h.price;
                
                const isUp = close >= open;
                
                // Wick spans from low to high (always present)
                wicks.push([low, high]);
                
                // Body spans from open to close
                if (isUp) {
                    upBodies.push([open, close]);
                    downBodies.push(0); // Zero instead of null
                } else {
                    downBodies.push([close, open]);
                    upBodies.push(0); // Zero instead of null
                }
            });
            
            console.log('Candlestick data:', { 
                labels: labels.length, 
                wicks: wicks.length, 
                upBodies: upBodies.length,
                sample: { wick: wicks[0], upBody: upBodies[0], downBody: downBodies[0] }
            });
            
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = wicks;
            this.chart.data.datasets[1].data = upBodies;
            this.chart.data.datasets[2].data = downBodies;
        } else {
            // Format data for line chart
            this.chart.data.labels = history.map(h => h.time);
            this.chart.data.datasets[0].data = history.map(h => h.close || h.price);
        }
        
        // Update chart color based on coin
        const coinData = market.getCoin(this.currentCoin);
        if (coinData) {
            if (this.chartType === 'candlestick') {
                this.chart.data.datasets[0].borderColor = coinData.color;
                this.chart.data.datasets[0].backgroundColor = coinData.color + '30';
                this.chart.data.datasets[1].backgroundColor = coinData.color;
                this.chart.data.datasets[1].borderColor = coinData.color;
            } else {
                this.chart.data.datasets[0].borderColor = coinData.color;
                this.chart.data.datasets[0].backgroundColor = coinData.color + '20';
                this.chart.data.datasets[0].pointHoverBackgroundColor = coinData.color;
            }
        }
        
        try {
            this.chart.update('none');
        } catch (error) {
            console.error('Chart update error:', error);
        }
    }

    changeTimeframe(timeframe) {
        console.log('Changing timeframe to:', timeframe);
        this.currentTimeframe = timeframe;
        
        // Update button states
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.timeframe === timeframe) {
                btn.classList.add('active');
            }
        });

        // Force update with new timeframe
        this.updateChart(null, timeframe);
    }

    changeChartType(chartType) {
        if (this.chartType === chartType) return;
        
        this.chartType = chartType;
        
        // Update button states
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.chartType === chartType) {
                btn.classList.add('active');
            }
        });

        // Destroy old chart and create new one
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        // Small delay to ensure clean slate
        setTimeout(() => {
            const ctx = document.getElementById('priceChart')?.getContext('2d');
            if (ctx) {
                this.createChart(ctx);
                this.updateChart();
            }
        }, 50);
    }

    setCoin(coinSymbol) {
        this.currentCoin = coinSymbol;
        this.updateChart();
    }
}

export const chartManager = new ChartManager();