import { html, useEffect, useRef } from '../../lib/preact.js';
import { COLORS } from '../../lib/config.js';

/**
 * Bar Chart component using Chart.js
 * Renders a bar chart with optional horizontal orientation
 *
 * @component
 * @param {Object} props
 * @param {ChartData} props.data - Chart data object
 * @param {string} [props.title] - Chart title
 * @param {number} [props.height=200] - Chart height in pixels
 * @param {boolean} [props.horizontal=false] - Whether to render as horizontal bar chart
 * @returns {import('preact').VNode} Rendered bar chart
 */
export const BarChart = ({ data, title, height = 200, horizontal = false }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !data || !data.values || data.values.length === 0) {
            return;
        }

        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = undefined;
        }

        const ctx = canvasRef.current.getContext('2d');

        const labels = data.labels || data.values.map((_, i) => i + 1);

        const config = {
            type: horizontal ? 'bar' : 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: title || 'Value',
                    data: data.values,
                    backgroundColor: data.values.map((_, i) => COLORS.chart[i % COLORS.chart.length]),
                    borderColor: data.values.map((_, i) => COLORS.chart[i % COLORS.chart.length]),
                    borderWidth: 1,
                    borderRadius: 3,
                    barPercentage: 0.7
                }]
            },
            options: {
                indexAxis: horizontal ? 'y' : 'x',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 12,
                        cornerRadius: 4,
                        callbacks: {
                            label: function label(context) {
                                return `${context.parsed.x || context.parsed.y}`;
                            },
                            title: function title(context) {
                                return context[0].label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#e9ecef',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6c757d',
                            font: { size: horizontal ? 11 : 10 },
                            maxRotation: horizontal ? 0 : 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e9ecef',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6c757d',
                            font: { size: 11 }
                        }
                    }
                }
            }
        };

        chartRef.current = new Chart(ctx, config);

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data, horizontal, height, title]);

    if (!data || !data.values || data.values.length === 0) {
        return html`<div class="text-center text-muted py-4">${__('No data available', 'dashboardng')}</div>`;
    }

    return html`
        <div class="chart-wrapper" style="height: 100%; min-height: 0; display: flex; flex-direction: column;">
            <canvas ref=${canvasRef}></canvas>
        </div>
    `;
};

export default BarChart;
