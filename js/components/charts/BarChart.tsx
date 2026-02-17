import { h, useEffect, useRef } from '../../lib/preact.js';
import type { Chart as ChartType, ChartConfiguration } from 'chart.js';
import { COLORS } from '../../lib/config.js';
import { __ } from '../../lib/i18n.js';

interface ChartData {
    labels?: string[];
    values: number[];
}

interface BarChartProps {
    data: ChartData;
    title?: string;
    height?: number;
    horizontal?: boolean;
}

export const BarChart = ({ data, title, height = 200, horizontal = false }: BarChartProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<ChartType | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !data || !data.values || data.values.length === 0) {
            return;
        }

        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        const ctx = canvasRef.current.getContext('2d');

        const labels = data.labels || data.values.map((_, i) => String(i + 1));

        const config: ChartConfiguration<'bar'> = {
            type: 'bar',
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
                            label: (context) => {
                                return `${context.parsed.x || context.parsed.y}`;
                            },
                            title: (context) => {
                                return context[0].label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#e9ecef'
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
                            color: '#e9ecef'
                        },
                        ticks: {
                            color: '#6c757d',
                            font: { size: 11 }
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
    }, [data, horizontal, height, title]);

    if (!data || !data.values || data.values.length === 0) {
        return <div className="text-center text-muted py-4">{__('No data available', 'dashboardng')}</div>;
    }

    return (
        <div className="chart-wrapper" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

export default BarChart;
