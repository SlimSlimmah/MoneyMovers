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
            this.chart = new Chart(ctx, {
                type: 'candlestick',
                data: {
                    datasets: [{
                        label: 'Price',
                        data: [],
                        borderColor: color,
                        color: {
                            up: color,
                            down: '#ff3333',
                            unchanged: '#999999'
                        }
                    }]
                },
                options: this.getCandlestickOptions(color)
            });
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
                        label: (context) => {
                            const data = context.raw;
                            const coin = market.getCoin(this.currentCoin);
                            const decimals = coin?.symbol === 'DOGE' ? 4 : 2;
                            return [
                                `O: $${data.o.toFixed(decimals)}`,
                                `H: $${data.h.toFixed(decimals)}`,
                                `L: $${data.l.toFixed(decimals)}`,
                                `C: $${data.c.toFixed(decimals)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm',
                            day: 'MMM dd'
                        }
                    },
                    grid: { color: '#003300' },
                    ticks: { 
                        color: '#00aa00',
                        maxTicksLimit: 6
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
            if (this.chartType === 'candlestick') {
                // Format data for candlestick chart
                const candlestickData = history.map(h => ({
                    x: h.time,
                    o: h.open || h.price,
                    h: h.high || h.price,
                    l: h.low || h.price,
                    c: h.close || h.price
                }));
                
                this.chart.data.datasets[0].data = candlestickData;
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
                    this.chart.data.datasets[0].color = {
                        up: coinData.color,
                        down: '#ff3333',
                        unchanged: '#999999'
                    };
                } else {
                    this.chart.data.datasets[0].borderColor = coinData.color;
                    this.chart.data.datasets[0].backgroundColor = coinData.color + '20';
                    this.chart.data.datasets[0].pointHoverBackgroundColor = coinData.color;
                }
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
        }

        const ctx = document.getElementById('priceChart')?.getContext('2d');
        if (ctx) {
            this.createChart(ctx);
            this.updateChart();
        }
    }

    setCoin(coinSymbol) {
        this.currentCoin = coinSymbol;
        this.updateChart();
    }
}

export const chartManager = new ChartManager();