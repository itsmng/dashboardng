import { h, useEffect, useRef } from '../../lib/preact.js';
import type { Chart as ChartType, ChartConfiguration } from 'chart.js';
import { COLORS } from '../../lib/config.js';
import { __ } from '../../lib/i18n.js';

interface ChartData {
    labels?: string[];
    values: number[];
}

interface PieChartProps {
    data: ChartData;
    donut?: boolean;
    topK?: number | null;
}

export const PieChart = ({ data, donut = false, topK = undefined }: PieChartProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<ChartType | null>(null);

    const processData = () => {
        if (!data || !data.values || data.values.length === 0) {
            return { labels: [] as string[], values: [] as number[] };
        }

        const labels = data.labels || data.values.map((_, i) => `Item ${i + 1}`);
        const values = data.values.map((v, i) => ({ label: labels[i], value: v }));

        const sorted = values.toSorted((a, b) => b.value - a.value);

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

        const config: ChartConfiguration<'pie' | 'doughnut'> = {
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
                            label: (context) => {
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

        chartRef.current = new window.Chart(ctx!, config);

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data, donut, topK]);

    if (!data || !data.values || data.values.length === 0) {
        return <div className="text-center text-muted py-4">{__('No data available', 'dashboardng')}</div>;
    }

    const processed = processData();
    const total = processed.values.reduce((a, b) => a + b, 0);
    if (total === 0) {
        return <div className="text-center text-muted py-4">{__('No data available', 'dashboardng')}</div>;
    }

    return (
        <div className="chart-wrapper" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

export default PieChart;
