import { html, useState, useEffect } from '../../lib/preact.js';
import { api, COLORS } from '../../lib/config.js';
import { usePeriod } from '../../context/PeriodContext.js';
import { useRefresh } from '../../lib/hooks/useRefresh.js';
import { processFilters } from '../../lib/utils.js';
import { __ } from '../../lib/i18n.js';

/**
 * Generic Card Widget - Renders KPI/metric cards based on config JSON
 * Displays a single aggregated value with optional icon and color
 *
 * @component
 * @param {Object} props
 * @param {WidgetConfig} props.config - Widget configuration object
 * @param {string|number} props.widgetId - Unique widget identifier
 * @returns {import('preact').VNode} Rendered KPI card widget
 */
export const GenericCardWidget = ({ config, widgetId }) => {
    const { period } = usePeriod();
    const { refreshSignal } = useRefresh();

    const [data, setData] = useState(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(undefined);
    const [previousValue, setPreviousValue] = useState(undefined);

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
            const queryConfig = {
                itemtype: config.itemtype,
                filters: processFilters(config.filters || [], period),
                aggregation: config.aggregation || { function: 'COUNT', field: undefined },
                limit: 1,
            };

            const result = await api.post('/query', queryConfig);
            
            if (result.success) {
                // Store previous value for trend indicator
                if (data !== null) {
                    setPreviousValue(data);
                }
                
                // Extract the aggregated value
                const value = result.data?.[0]?.value ?? result.total ?? 0;
                setData(value);
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

    /**
     * Format value for display with K/M suffixes or locale string
     * @private
     * @param {number|string} value - Value to format
     * @returns {string} Formatted value
     */
    const formatValue = (value) => {
        if (value === null || value === undefined) {return '-';}
        
        const num = parseFloat(value);
        if (isNaN(num)) {return value;}

        if (num >= 1_000_000) {
            return (num / 1_000_000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        } else if (Number.isInteger(num)) {
            return num.toLocaleString();
        } else {
            return num.toFixed(2);
        }
    };

    // Determine trend
    /**
     * Determine trend direction based on current vs previous value
     * @private
     * @returns {'up'|'down'|'stable'|null} Trend direction
     */
    const getTrend = () => {
        if (previousValue === null || data === null) {return null;}
        if (data > previousValue) {return 'up';}
        if (data < previousValue) {return 'down';}
        return 'stable';
    };

    const trend = getTrend();
    const color = config.color || 'primary';
    const icon = config.icon || 'fa-chart-line';

    const isHexColor = (c) => /^#[0-9A-F]{6}$/i.test(c);
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : undefined;
    };

    const useHex = isHexColor(color);
    const bgColor = useHex ? hexToRgb(color) : undefined;
    const bgStyle = useHex ? `background-color: rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, 0.1)` : '';
    const colorStyle = useHex ? `color: ${color}` : '';
    const textColor = useHex ? '' : `text-${color}`;
    const bgClass = useHex ? '' : `bg-${color} bg-opacity-10`;

    if (loading && data === null) {
        return html`
            <div class="generic-card-widget loading h-100 d-flex align-items-center justify-content-center">
                <div class="spinner-border spinner-border-sm ${textColor}" style="${colorStyle}" role="status">
                    <span class="visually-hidden">${__('Loading...', 'dashboardng')}</span>
                </div>
            </div>
        `;
    }

    if (error) {
        return html`
            <div class="generic-card-widget error h-100 d-flex flex-column align-items-center justify-content-center text-danger p-3">
                <i class="fas fa-exclamation-triangle fa-lg mb-2"></i>
                <div class="small text-center">${error}</div>
            </div>
        `;
    }

    return html`
        <div class="generic-card-widget kpi-card h-100 d-flex flex-column justify-content-center p-3 ${bgClass} rounded" style="${bgStyle}">
            <div class="d-flex align-items-center justify-content-between">
                <div class="kpi-icon">
                    <i class="fas ${icon} ${textColor}" style="${colorStyle}"></i>
                </div>
                ${trend && html`
                    <div class="kpi-trend text-${trend === 'up' ? 'success' : (trend === 'down' ? 'danger' : 'muted')}">
                        <i class="fas fa-arrow-${trend === 'up' ? 'up' : (trend === 'down' ? 'down' : 'right')}"></i>
                    </div>
                `}
            </div>
            <div class="kpi-value mt-2">
                <span class="display-5 fw-bold ${textColor}" style="${colorStyle}">${formatValue(data)}</span>
            </div>
            <div class="kpi-label text-muted">
                ${config.title || config.itemtype}
            </div>
            ${loading && html`
                <div class="kpi-loading position-absolute top-0 end-0 p-2">
                    <div class="spinner-border spinner-border-sm ${textColor}" style="${colorStyle}" role="status"></div>
                </div>
            `}
        </div>
    `;
};

export default GenericCardWidget;

// ========================================
// Type Definitions
// ========================================

/**
 * @typedef {Object} WidgetConfig
 * @property {string} itemtype - GLPI itemtype (e.g., 'Ticket', 'Computer')
 * @property {string} [title] - Widget display title
 * @property {string} [icon] - Icon class name (e.g., 'fa-ticket-alt')
 * @property {string} [color] - Color name or hex code (e.g., 'primary', '#ff0000')
 * @property {FilterConfig[]} [filters=[]] - Query filters
 * @property {AggregationConfig} [aggregation] - Aggregation settings
 * @property {number} [refreshInterval] - Auto-refresh interval in ms (0 to disable)
 * @property {string} [visualization] - Visualization type
 * @property {string} [chartType] - Chart type (for chart visualization)
 * @property {Object} [groupBy] - Grouping configuration
 * @property {Object} [orderBy] - Order by configuration
 * @property {number} [limit] - Result limit
 */

/**
 * @typedef {Object} FilterConfig
 * @property {string|number} field - Field ID to filter on
 * @property {string} operator - Comparison operator ('equals', 'contains', 'greater_than', 'less_than', 'is_null', 'is_not_null')
 * @property {string|number} value - Filter value
 * @property {string} [link] - Logical link ('AND' or 'OR')
 */

/**
 * @typedef {Object} AggregationConfig
 * @property {string} function - Aggregation function ('COUNT', 'SUM', 'AVG', 'MIN', 'MAX')
 * @property {string|number|null} [field] - Field to aggregate (null for COUNT)
 */
