import { html, useState, useEffect, useRef } from '../../lib/preact.js';
import { api, COLORS } from '../../lib/config.js';
import { usePeriod } from '../../context/PeriodContext.js';
import { useRefresh } from '../../lib/hooks/useRefresh.js';

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
export const GenericChartWidget = ({ config, widgetId }) => {
    const { period } = usePeriod();
    const { refreshSignal } = useRefresh();
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data based on config
    const fetchData = async () => {
        if (!config?.itemtype) {
            setError('No itemtype configured');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const processedFilters = processFilters(config.filters || [], period);

            // Extract date range from filters for time-series gap filling
            const dateRange = extractDateRange(processedFilters, config.groupBy);

            const queryConfig = {
                itemtype: config.itemtype,
                filters: processedFilters,
                group_by: config.groupBy ? [config.groupBy] : null,
                aggregation: config.aggregation || { function: 'COUNT', field: null },
                order_by: config.orderBy,
                limit: config.limit || 50,
                date_range: dateRange,
            };

            // Add series config for multi-series queries
            if (config.series && Array.isArray(config.series)) {
                queryConfig.series = config.series;
            }

            const result = await api.post('/query', queryConfig);

            if (result.success) {
                setData({ data: result.data, meta: result.meta || {} });
            } else {
                setError(result.error || 'Query failed');
            }
        } catch (err) {
            setError(err.message);
        }

        setLoading(false);
    };
    
    // Extract date range from filters when groupBy has an interval
    /**
     * Extract date range from filters for time-series gap filling
     * @private
     * @param {FilterConfig[]} filters - Array of filter configurations
     * @param {Object} groupBy - Grouping configuration
     * @returns {DateRange|null} Date range object or null if not applicable
     */
    const extractDateRange = (filters, groupBy) => {
        // Only compute date range if groupBy specifies an interval
        if (!groupBy || typeof groupBy !== 'object' || !groupBy.interval) {
            return null;
        }
        
        const groupField = groupBy.field;
        let startDate = null;
        let endDate = null;
        
        // Look through filters for date boundaries on the grouped field
        for (const filter of filters) {
            if (filter.field !== groupField) continue;
            
            const searchType = filter.searchtype || filter.operator;
            const value = filter.value;
            
            if (!value) continue;
            
            // Parse the date value
            const dateValue = value.split(' ')[0]; // Take just the date part if datetime
            
            if (searchType === 'morethan' || searchType === 'greater_or_equal' || searchType === 'greater_than') {
                if (!startDate || dateValue > startDate) {
                    startDate = dateValue;
                }
            } else if (searchType === 'lessthan' || searchType === 'less_or_equal' || searchType === 'less_than') {
                if (!endDate || dateValue < endDate) {
                    endDate = dateValue;
                }
            }
        }
        
        // Default end date to today if not specified
        if (startDate && !endDate) {
            endDate = new Date().toISOString().split('T')[0];
        }
        
        if (startDate && endDate) {
            return {
                start: startDate,
                end: endDate,
                interval: groupBy.interval,
                field: groupField,
            };
        }
        
        return null;
    };

    // Process dynamic filter values
    const processFilters = (filters, period) => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const thisYear = `${now.getFullYear()}-01-01`;
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        return filters.map(filter => {
            let value = filter.value;

            // Replace dynamic placeholders
            if (typeof value === 'string') {
                value = value
                    .replace('$$NOW$$', now.toISOString())
                    .replace('$$TODAY$$', today)
                    .replace('$$YESTERDAY$$', yesterday)
                    .replace('$$TODAY-1DAY$$', yesterday)
                    .replace('$$TODAY-7DAY$$', lastWeek)
                    .replace('$$TODAY-30DAY$$', thirtyDaysAgo)
                    .replace('$$LASTWEEK$$', lastWeek)
                    .replace('$$THISMONTH$$', thisMonth)
                    .replace('$$THISYEAR$$', thisYear)
                    .replace('$$MYSELF$$', String(window.DASHBOARDNG_CONFIG?.userId || 0));
            }

            return { ...filter, value };
        });
    };

    // Fetch data on mount and when dependencies change
    useEffect(() => {
        fetchData();
    }, [config, period, refreshSignal]);

    // Auto-refresh
    useEffect(() => {
        if (!config?.refreshInterval || config.refreshInterval <= 0) return;

        const interval = setInterval(fetchData, config.refreshInterval);
        return () => clearInterval(interval);
    }, [config?.refreshInterval]);

    // Render chart
    useEffect(() => {
        if (!chartRef.current || !data) return;

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

        // Determine chart type - prefer explicit chartType, fall back to visualization type
        const chartType = config.chartType || (
            config.visualization === 'line' || config.visualization === 'multiline' ? 'line' :
            config.visualization === 'pie' ? 'pie' :
            config.visualization === 'doughnut' ? 'doughnut' :
            'bar'
        );
        const colors = config.colors || COLORS.chart;

        let chartData;
        let showLegend = chartType === 'pie' || chartType === 'doughnut';

        if (isMultiSeries) {
            // Handle multi-series data format: [{name: '2024', data: [['Jan', 10], ...]}, ...]
            const allLabels = new Set();
            dataArray.forEach(series => {
                series.data.forEach(point => allLabels.add(point[0]));
            });
            const labels = Array.from(allLabels);

            const datasets = dataArray.map((series, index) => {
                // Create a map for quick lookup
                const dataMap = new Map(series.data);
                const values = labels.map(label => dataMap.get(label) || 0);
                const color = colors[index % colors.length];

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
            showLegend = true; // Always show legend for multi-series
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

        chartInstance.current = new Chart(ctx, {
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
