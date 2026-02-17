import { h, useEffect, useRef } from '../../lib/preact.js';
import type { Chart as ChartType, ChartConfiguration } from 'chart.js';
import { COLORS } from '../../lib/config.js';
import { __ } from '../../lib/i18n.js';

interface UPlotDataset {
    label: string;
    values: number[];
}

interface UPlotData {
    mode?: string;
    labels?: string[];
    values?: number[];
    timestamps?: Array<number | string>;
    datasets?: UPlotDataset[];
}

interface UPlotChartProps {
    data: UPlotData;
    type?: 'line' | 'bar' | 'area';
    height?: number;
}

export const UPlotChart = ({ data, type = 'line', height = 300 }: UPlotChartProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<ChartType | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !data) {
            return;
        }

        const isYoYMode = data.mode === 'yoy';
        if (isYoYMode) {
            if (!data.datasets || data.datasets.length === 0) {
                return;
            }
        } else {
            if (!data.values || data.values.length === 0) {
                return;
            }
        }

        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        const ctx = canvasRef.current.getContext('2d');

        const chartType = type === 'bar' ? 'bar' : 'line';

        let labels: (string | number)[];
        let datasets: Array<{
            label: string;
            data: number[];
            borderColor: string;
            backgroundColor: string;
            fill: boolean;
            borderWidth: number;
            pointRadius: number;
            pointHoverRadius: number;
            tension: number;
            barPercentage?: number;
        }>;

        if (isYoYMode) {
            labels = data.labels || [];

            datasets = data.datasets!.map((ds, index) => {
                const color = COLORS.chart[index % COLORS.chart.length];
                return {
                    label: ds.label,
                    data: ds.values,
                    borderColor: color,
                    backgroundColor: type === 'area' ? color + '20' : color,
                    fill: type === 'area',
                    borderWidth: 2,
                    pointRadius: type === 'bar' ? 0 : 6,
                    pointHoverRadius: 8,
                    tension: 0.1
                };
            });
        } else {
            if (data.timestamps && data.timestamps.length > 0) {
                labels = data.timestamps.map(ts => {
                    if (typeof ts === 'number' && ts > 10_000) {
                        const d = new Date(ts * 1000);
                        return d.toLocaleDateString();
                    }
                    return ts;
                });
            } else if (data.labels && data.labels.length > 0) {
                labels = data.labels;
            } else {
                labels = data.values!.map((_, i) => i);
            }

            datasets = [{
                label: __('Tickets', 'dashboardng'),
                data: data.values!,
                borderColor: COLORS.primary,
                backgroundColor: type === 'area'
                    ? 'rgba(13, 110, 253, 0.1)'
                    : COLORS.primary,
                fill: type === 'area',
                borderWidth: 2,
                pointRadius: type === 'bar' ? 0 : 6,
                pointHoverRadius: 8,
                tension: 0.1,
                barPercentage: type === 'bar' ? 0.6 : undefined
            }];
        }

        const config: ChartConfiguration<'line' | 'bar'> = {
            type: chartType,
            data: {
                labels: labels as string[],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: isYoYMode,
                        position: 'top',
                        labels: {
                            color: '#6c757d',
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'rect',
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 12,
                        cornerRadius: 4,
                        displayColors: isYoYMode,
                        callbacks: {
                            title: (context) => {
                                return context[0].label;
                            },
                            label: (context) => {
                                if (isYoYMode) {
                                    return `${context.dataset.label}: ${context.parsed.y} tickets`;
                                }
                                return `${context.parsed.y} ${__('tickets', 'dashboardng')}`;
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
                            color: '#6c757d'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e9ecef'
                        },
                        ticks: {
                            color: '#6c757d'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        };

        chartRef.current = new window.Chart(ctx!, config);

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data, type, height]);

    return (
        <div className="chart-wrapper chartjs-container" style={{ position: 'relative', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

export default UPlotChart;
