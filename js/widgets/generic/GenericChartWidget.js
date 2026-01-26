import { html, useState, useEffect, useRef } from '../../lib/preact.js';
import { api, COLORS } from '../../lib/config.js';
import { usePeriod } from '../../context/PeriodContext.js';
import { useRefresh } from '../../lib/hooks/useRefresh.js';
import { extractDateRange, processFilters } from '../../lib/utils.js';
import { __ } from '../../lib/i18n.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const normalizeTimeLabel = (label, preset, interval) => {
    if (!label) {return label;}

    const date = new Date(label);
    if (Number.isNaN(date.getTime())) {return label;}

    const month = date.getMonth();
    const day = date.getDate();
    const week = Math.ceil(date.getDate() / 7);
    const quarter = Math.floor(month / 3) + 1;

    switch (preset) {
        case 'yoy':
            if (interval === 'month') {
                return MONTH_NAMES[month];
            } else if (interval === 'week') {
                return `W${Math.ceil(date.getTime() / (7 * 24 * 60 * 60 * 1000)) % 52 || 52}`;
            } else if (interval === 'day') {
                return `${MONTH_NAMES[month]} ${day}`;
            }
            break;

        case 'mom':
            if (interval === 'day') {
                return String(day);
            } else if (interval === 'week') {
                return `W${week}`;
            }
            break;

        case 'qoq':
            if (interval === 'month') {
                return `M${(month % 3) + 1}`;
            } else if (interval === 'week') {
                const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (24 * 60 * 60 * 1000));
                const qStart = (quarter - 1) * 3;
                const weekInQ = Math.ceil((dayOfYear - (qStart * 30)) / 7);
                return `W${Math.min(13, weekInQ)}`;
            }
            break;
    }

    return label;
};

const getMonthOrder = (label) => {
    const index = MONTH_NAMES.indexOf(label);
    return index >= 0 ? index : 999;
};

/**
 * Generic Chart Widget - Renders charts based on config JSON
 * Supports bar, line, pie, doughnut chart types
 *
 * @component
 * @param {Object} props
 * @param {WidgetConfig} props.config - Widget configuration object
 * @param {string|number} props.widgetId - Unique widget identifier
 * @returns {import('preact').VNode} Rendered chart widget
 */
export const GenericChartWidget = ({ config, widgetId: _widgetId }) => {
    const { period } = usePeriod();
    const { refreshSignal } = useRefresh();
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const [data, setData] = useState(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(undefined);

    // Fetch data based on config
    const fetchData = async () => {
        if (!config?.itemtype) {
            setError('No itemtype configured');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(undefined);

        try {
            const processedFilters = processFilters(config.filters || [], period);
            const processedSeries = (config.series || []).map(seriesItem => ({
                ...seriesItem,
                filters: processFilters(seriesItem.filters || [], period)
            }));
            const normalizedSeries = processedSeries.filter(seriesItem =>
                seriesItem.filters && seriesItem.filters.length > 0
            );

            // Extract date range from filters for time-series gap filling
            const dateRange = extractDateRange(processedFilters, config.groupBy);

            const queryConfig = {
                itemtype: config.itemtype,
                filters: processedFilters,
                group_by: config.groupBy ? [config.groupBy] : undefined,
                aggregation: config.aggregation || { function: 'COUNT', field: undefined },
                order_by: config.orderBy,
                limit: config.limit || 50,
                date_range: dateRange,
            };

            // Add series config for multi-series queries
            if (normalizedSeries.length > 0) {
                queryConfig.series = normalizedSeries;
            }

            const result = await api.post('/query', queryConfig);

            if (result.success) {
                setData({ data: result.data, meta: result.meta || {} });
            } else {
                setError(result.error || 'Query failed');
            }
        } catch (error) {
            setError(error.message);
        }

        setLoading(false);
    };



    // Fetch data on mount and when dependencies change
    useEffect(() => {
        fetchData();
    }, [config, period, refreshSignal]);

    // Auto-refresh
    useEffect(() => {
        if (!config?.refreshInterval || config.refreshInterval <= 0) {return;}

        const interval = setInterval(fetchData, config.refreshInterval);
        return () => clearInterval(interval);
    }, [config?.refreshInterval]);

    // Render chart
    useEffect(() => {
        if (!chartRef.current || !data) {return;}

        // Destroy existing chart
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');

        // Check if this is multi-series data
        const isMultiSeries = data.meta?.is_multi_series;
        const dataArray = data.data?.series || data.data;

        // Handle empty data for both single and multi-series
        const hasData = isMultiSeries
            ? (dataArray && dataArray.length > 0)
            : (dataArray && dataArray.length > 0);

        if (!hasData) {
            return;
        }

        const chartType = config.chartType || 'bar';
        const colors = config.colors || COLORS.chart;

        let chartData;
        let showLegend = chartType === 'pie' || chartType === 'doughnut';

        if (isMultiSeries) {
            const preset = config.seriesPreset;
            const interval = config.groupBy?.interval;
            const isTimePreset = preset && ['yoy', 'mom', 'qoq'].includes(preset);

            const allLabels = new Set();
            dataArray.forEach(series => {
                series.data.forEach(point => {
                    const label = point[0];
                    if (isTimePreset) {
                        allLabels.add(normalizeTimeLabel(label, preset, interval));
                    } else {
                        allLabels.add(label);
                    }
                });
            });

            let labels = [...allLabels];

            if (isTimePreset) {
                const normalizedSample = normalizeTimeLabel(labels[0], preset, interval);
                const allMonthNames = normalizedSample && MONTH_NAMES.includes(normalizedSample);

                if (allMonthNames) {
                    labels.sort((a, b) => getMonthOrder(a) - getMonthOrder(b));
                } else {
                    const allNumeric = labels.every(l => !Number.isNaN(Number(l)));
                    if (allNumeric) {
                        labels.sort((a, b) => Number(a) - Number(b));
                    }
                }
            } else {
                const allDateLabels = labels.length > 0 && labels.every(label => !Number.isNaN(Date.parse(label)));
                const allNumericLabels = labels.length > 0 && labels.every(label => !Number.isNaN(Number(label)));

                if (allDateLabels) {
                    labels.sort((a, b) => new Date(a) - new Date(b));
                } else if (allNumericLabels) {
                    labels.sort((a, b) => Number(a) - Number(b));
                }
            }

            const datasets = dataArray.map((series, index) => {
                const dataMap = new Map();
                series.data.forEach(point => {
                    const originalLabel = point[0];
                    const normalizedLabel = isTimePreset ? normalizeTimeLabel(originalLabel, preset, interval) : originalLabel;
                    dataMap.set(normalizedLabel, point[1]);
                });

                const values = labels.map(label => dataMap.get(label) || 0);
                const color = series.color || colors[index % colors.length];

                return {
                    label: series.name,
                    data: values,
                    backgroundColor: chartType === 'line' ? color + '40' : color + '80',
                    borderColor: color,
                    borderWidth: chartType === 'line' ? 2 : 1,
                    fill: chartType === 'line',
                    tension: 0.4,
                };
            });

            chartData = { labels, datasets };
            showLegend = true;
        } else {
            // Handle single-series data format: [{group_X: 'label', value: 10}, ...]
            const labels = dataArray.map(row => {
                // Find the first non-value key for label
                const labelKey = Object.keys(row).find(k => k !== 'value' && k.startsWith('group_'));
                const label = row[labelKey] ?? row[Object.keys(row)[0]] ?? 'Unknown';
                return String(label);
            });

            const values = dataArray.map(row => parseFloat(row.value) || 0);

            // Ensure we have enough colors for all data points
            const chartColors = [];
            for (let i = 0; i < values.length; i++) {
                chartColors.push(colors[i % colors.length]);
            }

            chartData = {
                labels,
                datasets: [{
                    label: config.title || __('Value', 'dashboardng'),
                    data: values,
                    backgroundColor: chartType === 'line'
                        ? colors[0] + '40'
                        : chartColors,
                    borderColor: chartType === 'line' ? colors[0] : chartColors,
                    borderWidth: chartType === 'line' ? 2 : 1,
                    fill: chartType === 'line',
                    tension: 0.4,
                }]
            };
        }

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: showLegend,
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed.y ?? context.parsed;
                            const label = context.dataset.label || context.label || '';
                            return isMultiSeries
                                ? `${label}: ${value}`
                                : `${context.label || ''}: ${value}`;
                        }
                    }
                }
            },
            scales: chartType === 'pie' || chartType === 'doughnut' ? {} : {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        };

        chartInstance.current = new window.Chart(ctx, {
            type: chartType,
            data: chartData,
            options: chartOptions,
        });

        // Cleanup
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, config.chartType, config.colors]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (chartInstance.current) {
                chartInstance.current.resize();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) {
        return html`
            <div class="generic-chart-widget loading h-100 d-flex align-items-center justify-content-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">${__('Loading...', 'dashboardng')}</span>
                </div>
            </div>
        `;
    }

    if (error) {
        return html`
            <div class="generic-chart-widget error h-100 d-flex flex-column align-items-center justify-content-center text-danger">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <div class="small">${error}</div>
            </div>
        `;
    }

    if (!data || !data.data) {
        return html`
            <div class="generic-chart-widget empty h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                <i class="fas fa-chart-bar fa-2x mb-2"></i>
                <div>${__('No data available', 'dashboardng')}</div>
            </div>
        `;
    }

    // Check if data array is empty
    const dataArray = data.data?.series || data.data;
    const isMultiSeries = data.meta?.is_multi_series;
    const hasData = isMultiSeries
        ? (dataArray && dataArray.length > 0)
        : (dataArray && dataArray.length > 0);

    if (!hasData) {
        return html`
            <div class="generic-chart-widget empty h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                <i class="fas fa-chart-bar fa-2x mb-2"></i>
                <div>${__('No data available', 'dashboardng')}</div>
            </div>
        `;
    }

    return html`
        <div class="generic-chart-widget h-100 d-flex flex-column">
            ${config.title && html`
                <div class="widget-title px-3 pt-2 pb-1">
                    <strong>${config.title}</strong>
                </div>
            `}
            <div class="chart-container flex-grow-1 p-2" style="position: relative; min-height: 0;">
                <canvas ref=${chartRef}></canvas>
            </div>
        </div>
    `;
};

export default GenericChartWidget;

// ========================================
// Type Definitions
// ========================================

/**
 * @typedef {Object} DateRange
 * @property {string} start - Start date (YYYY-MM-DD format)
 * @property {string} end - End date (YYYY-MM-DD format)
 * @property {string} interval - Time interval ('day', 'week', 'month', 'year')
 * @property {string} field - Date field name
 */
