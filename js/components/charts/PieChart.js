import { html, useEffect, useRef } from '../../lib/preact.js';
import { COLORS } from '../../lib/config.js';

/**
 * Pie Chart component using Chart.js
 * Renders a pie or doughnut chart with legend and optional Top K grouping
 *
 * @component
 * @param {Object} props
 * @param {ChartData} props.data - Chart data object
 * @param {string} [props.title] - Chart title
 * @param {number} [props.height=250] - Chart height in pixels
 * @param {boolean} [props.donut=false] - Whether to render as doughnut chart
 * @param {number|null} [props.topK=null] - Number of top elements to show, or null for all
 * @returns {import('preact').VNode} Rendered pie chart
 */
export const PieChart = ({ data, title, height = 250, donut = false, topK = null }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    // Process data with Top K grouping
    const processData = () => {
        if (!data || !data.values || data.values.length === 0) {
            return { labels: [], values: [] };
        }

        let labels = data.labels || data.values.map((_, i) => `Item ${i + 1}`);
        let values = data.values.map((v, i) => ({ label: labels[i], value: v }));

        // Sort by value descending for Top K
        const sorted = values.sort((a, b) => b.value - a.value);

        if (topK && topK > 0 && sorted.length > topK) {
            const topKItems = sorted.slice(0, topK);
            const others = sorted.slice(topK);
            const othersValue = others.reduce((sum, item) => sum + item.value, 0);

            return {
                labels: [...topKItems.map(item => item.label), __('Others', 'dashboardng')],
                values: [...topKItems.map(item => item.value), othersValue]
            };
        }

        return {
            labels: sorted.map(item => item.label),
            values: sorted.map(item => item.value)
        };
    };

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }

        const processed = processData();

        if (processed.values.length === 0) {
            return;
        }

        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        const total = processed.values.reduce((a, b) => a + b, 0);
        if (total === 0) {
            return;
        }

        const ctx = canvasRef.current.getContext('2d');

        const config = {
            type: donut ? 'doughnut' : 'pie',
            data: {
                labels: processed.labels,
                datasets: [{
                    data: processed.values,
                    backgroundColor: processed.values.map((_, i) => COLORS.chart[i % COLORS.chart.length]),
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#6c757d',
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'rect',
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 12,
                        cornerRadius: 4,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
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
    }, [data, donut, topK]);

    if (!data || !data.values || data.values.length === 0) {
        return html`<div class="text-center text-muted py-4">${__('No data available', 'dashboardng')}</div>`;
    }

    const processed = processData();
    const total = processed.values.reduce((a, b) => a + b, 0);
    if (total === 0) {
        return html`<div class="text-center text-muted py-4">${__('No data available', 'dashboardng')}</div>`;
    }

    return html`
        <div class="chart-wrapper" style="height: 100%; min-height: 0; display: flex; flex-direction: column;">
            <canvas ref=${canvasRef}></canvas>
        </div>
    `;
};

export default PieChart;
