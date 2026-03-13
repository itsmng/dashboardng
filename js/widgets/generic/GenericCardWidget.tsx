import { h, useState, useEffect } from '../../lib/preact.js';
import { api } from '../../lib/config.js';
import { usePeriod } from '../../context/PeriodContext.js';
import { useRefresh } from '../../lib/hooks/useRefresh.js';
import { extractDateRange, processFilters } from '../../lib/utils.js';
import { __ } from '../../lib/i18n.js';

interface WidgetConfig {
    itemtype: string;
    title?: string;
    icon?: string;
    color?: string;
    filters?: any[];
    aggregation?: any;
    refreshInterval?: number;
    visualization?: string;
    chartType?: string;
    groupBy?: any;
    orderBy?: any;
    limit?: number;
}

interface GenericCardWidgetProps {
    config: WidgetConfig;
    widgetId: string | number;
}

/**
 * Generic Card Widget - Renders KPI/metric cards based on config JSON
 * Displays a single aggregated value with optional icon and color
 *
 * @component
 * @param {GenericCardWidgetProps} props
 * @returns {import('preact').VNode} Rendered KPI card widget
 */
export const GenericCardWidget = ({ config, widgetId: _widgetId }: GenericCardWidgetProps) => {
    const { period } = usePeriod();
    const { refreshSignal } = useRefresh();

    const [data, setData] = useState<number | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);
    const [previousValue, setPreviousValue] = useState<number | null | undefined>(undefined);

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
            const dateRange = extractDateRange(processedFilters, config.groupBy);
            const hasGrouping = Boolean(config.groupBy);
            const queryConfig = {
                itemtype: config.itemtype,
                filters: processedFilters,
                group_by: hasGrouping ? [config.groupBy] : undefined,
                aggregation: config.aggregation || { function: 'COUNT', field: undefined },
                order_by: config.orderBy?.field
                    ? { field: config.orderBy.field, direction: config.orderBy.direction || 'DESC' }
                    : undefined,
                limit: hasGrouping ? (config.limit || 20) : 1,
                date_range: dateRange,
            };

            const result = await api.post('/query', queryConfig);
            
            if (result.success) {
                // Store previous value for trend indicator
                if (data !== null) {
                    setPreviousValue(data);
                }
                
                // Extract the aggregated value
                const value = result.data?.[0]?.value ?? (result as any).total ?? 0;
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
    const formatValue = (value: number | string | null | undefined): string => {
        if (value === null || value === undefined) {return '-';}
        
        const num = parseFloat(String(value));
        if (isNaN(num)) {return String(value);}

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
    const getTrend = (): 'up' | 'down' | 'stable' | null => {
        if (previousValue === null || data === null) {return null;}
        if (data! > previousValue!) {return 'up';}
        if (data! < previousValue!) {return 'down';}
        return 'stable';
    };

    const trend = getTrend();
    const color = config.color || 'primary';
    const icon = config.icon || 'fa-chart-line';

    const isHexColor = (c: string): boolean => /^#[0-9A-F]{6}$/i.test(c);
    const hexToRgb = (hex: string): { r: number; g: number; b: number } | undefined => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : undefined;
    };

    const useHex = isHexColor(color);
    const bgColor = useHex ? hexToRgb(color) : undefined;
    const bgStyle = useHex ? { backgroundColor: `rgba(${bgColor!.r}, ${bgColor!.g}, ${bgColor!.b}, 0.1)` } : {};
    const colorStyle = useHex ? { color: color } : {};
    const textColor = useHex ? '' : `text-${color}`;
    const bgClass = useHex ? '' : `bg-${color} bg-opacity-10`;

    if (loading && data === null) {
        return (
            <div className={`generic-card-widget loading h-100 d-flex align-items-center justify-content-center`}>
                <div className={`spinner-border spinner-border-sm ${textColor}`} style={colorStyle} role="status">
                    <span className="visually-hidden">{__('Loading...', 'dashboardng')}</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="generic-card-widget error h-100 d-flex flex-column align-items-center justify-content-center text-danger p-3">
                <i className="fas fa-exclamation-triangle fa-lg mb-2"></i>
                <div className="small text-center">{error}</div>
            </div>
        );
    }

    return (
        <div className={`generic-card-widget kpi-card h-100 d-flex flex-column justify-content-center p-3 ${bgClass} rounded`} style={bgStyle}>
            <div className="d-flex align-items-center justify-content-between">
                <div className="kpi-icon">
                    <i className={`fas ${icon} ${textColor}`} style={colorStyle}></i>
                </div>
                {trend && (
                    <div className={`kpi-trend text-${trend === 'up' ? 'success' : (trend === 'down' ? 'danger' : 'muted')}`}>
                        <i className={`fas fa-arrow-${trend === 'up' ? 'up' : (trend === 'down' ? 'down' : 'right')}`}></i>
                    </div>
                )}
            </div>
            <div className="kpi-value mt-2">
                <span className={`display-5 fw-bold ${textColor}`} style={colorStyle}>{formatValue(data)}</span>
            </div>
            <div className="kpi-label text-muted">
                {config.title || config.itemtype}
            </div>
            {loading && (
                <div className="kpi-loading position-absolute top-0 end-0 p-2">
                    <div className={`spinner-border spinner-border-sm ${textColor}`} style={colorStyle} role="status"></div>
                </div>
            )}
        </div>
    );
};

export default GenericCardWidget;
