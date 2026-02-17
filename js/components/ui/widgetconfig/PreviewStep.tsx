import { h } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

interface PreviewData {
    total?: number;
    data?: any[];
    meta?: { has_more?: boolean };
    columns?: Array<{ name: string }>;
}

interface GroupBy {
    field?: number;
    interval?: string;
}

interface OrderBy {
    field?: number;
    direction?: string;
}

interface Series {
    filter_mode?: string;
}

interface Config {
    title?: string;
    itemtype?: string;
    visualization?: string;
    chartType?: string;
    groupBy?: GroupBy;
    orderBy?: OrderBy;
    seriesMode?: string;
    seriesPreset?: string;
    series?: Series[];
    outputFields?: number[];
    pageSize?: number;
    filters: Array<{ field?: number }>;
    refreshInterval?: number;
}

interface PreviewStepProps {
    config: Config;
    previewData: PreviewData | null;
    loading: boolean;
    loadPreview: () => void;
    fields: {
        fields?: Array<{ id: number; name: string }>;
    };
}

const decodeHTMLEntities = (text: string) => {
    if (typeof text !== 'string') {return text;}
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const getFieldName = (fieldId: number | undefined, fields: PreviewStepProps['fields']) => {
    if (!fields?.fields || !fieldId) {return fieldId;}
    const field = fields.fields.find(f => f.id === fieldId);
    return field ? decodeHTMLEntities(field.name) : fieldId;
};

export const PreviewStep = ({ config, previewData, loading, loadPreview, fields }: PreviewStepProps) => {
    const seriesPresetLabels: Record<string, string> = {
        yoy: __('Year over year', 'dashboardng'),
        mom: __('Month over month', 'dashboardng'),
        qoq: __('Quarter over quarter', 'dashboardng'),
        custom: __('Custom ranges', 'dashboardng')
    };
    const chartVisualizations = ['chart', 'bar', 'line', 'pie', 'doughnut'];
    const isChartVisualization = chartVisualizations.includes(config.visualization || '');
    const chartType = config.chartType || (isChartVisualization ? config.visualization : 'bar');
    const groupByField = config.groupBy?.field ? getFieldName(config.groupBy.field, fields) : undefined;
    const orderByField = config.orderBy?.field ? getFieldName(config.orderBy.field, fields) : undefined;
    const seriesMode = config.seriesMode || (config.series?.length ? 'filters' : 'none');
    const seriesPresetLabel = seriesPresetLabels[config.seriesPreset || ''] || config.seriesPreset;
    const seriesCount = config.series?.length || 0;
    const seriesFilterModes = new Set((config.series || []).map(series => series.filter_mode || 'append'));
    const seriesFilterModeLabel = seriesFilterModes.size === 1
        ? (seriesFilterModes.has('replace') ? __('Replace base filters', 'dashboardng') : __('Add to base filters', 'dashboardng'))
        : __('Mixed filter mode', 'dashboardng');

    return (
        <div className="step-content">
            <h5 className="mb-3">{__('Preview', 'dashboardng')}</h5>

            <div className="mb-3">
                <button className="btn btn-primary btn-sm" onClick={loadPreview} disabled={loading}>
                    {loading ? <i className="fas fa-spinner fa-spin me-1"></i> : <i className="fas fa-play me-1"></i>}
                    {__('Load preview', 'dashboardng')}
                </button>
            </div>

            {previewData && (
                <div className="preview-result">
                    <div className="mb-2">
                        <small className="text-muted">
                            {previewData.total || 0} {__('Results', 'dashboardng')}
                            {previewData.meta?.has_more ? `(${__('Showing first', 'dashboardng')} ${previewData.data?.length || 0})` : ''}
                        </small>
                    </div>

                    {config.visualization === 'table' && (
                        <div className="table-responsive">
                            <table className="table table-sm table-striped">
                                <thead>
                                    <tr>
                                        {previewData.columns?.map((col, i) => <th key={i}>{col.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.data?.slice(0, 10).map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((val, j) => <td key={j}>{val as string}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {config.visualization === 'card' && previewData.data?.[0] && (
                        <div className="preview-card card">
                            <div className="card-body text-center">
                                <div className="display-4">{previewData.data[0].value || Object.values(previewData.data[0])[0]}</div>
                                <div className="text-muted">{config.title || config.itemtype}</div>
                            </div>
                        </div>
                    )}

                    {isChartVisualization && (
                        <div className="preview-chart-placeholder text-center py-4 bg-light rounded">
                            <i className={`fas fa-chart-${chartType === 'line' ? 'line' : (chartType === 'pie' || chartType === 'doughnut' ? 'pie' : 'bar')} fa-3x text-muted mb-2`}></i>
                            <div className="text-muted">{__('Chart will render with actual data', 'dashboardng')}</div>
                            <div className="text-muted">{previewData.data?.length || 0} {__('data points', 'dashboardng')}</div>
                        </div>
                    )}
                </div>
            )}

            <div className="config-summary mt-4">
                <h6>{__('Configuration summary', 'dashboardng')}</h6>
                <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between">
                        <span>{__('Title', 'dashboardng')}:</span>
                        <span className="fw-bold">{config.title || `(${__('Untitled', 'dashboardng')})`}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                        <span>{__('Data source', 'dashboardng')}:</span>
                        <span className="fw-bold">{config.itemtype}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                        <span>{__('Visualization', 'dashboardng')}:</span>
                        <span className="fw-bold">{config.visualization}{config.visualization === 'chart' ? ` (${chartType})` : ''}</span>
                    </li>
                    {groupByField && (
                        <li className="list-group-item d-flex justify-content-between">
                            <span>{__('Group by', 'dashboardng')}:</span>
                            <span className="fw-bold">
                                {groupByField}
                                {config.groupBy?.interval && <small className="text-muted"> ({config.groupBy.interval})</small>}
                            </span>
                        </li>
                    )}
                    {orderByField && (
                        <li className="list-group-item d-flex justify-content-between">
                            <span>{__('Sort by', 'dashboardng')}:</span>
                            <span className="fw-bold">
                                {orderByField}
                                <small className="text-muted">({config.orderBy?.direction})</small>
                            </span>
                        </li>
                    )}
                    {seriesMode !== 'none' && (
                        <li className="list-group-item d-flex justify-content-between">
                            <span>{__('Series mode', 'dashboardng')}:</span>
                            <span className="fw-bold">
                                {seriesMode === 'time' ? __('Time-based', 'dashboardng') : __('Filter-based', 'dashboardng')}
                            </span>
                        </li>
                    )}
                    {seriesMode === 'time' && (
                        <li className="list-group-item d-flex justify-content-between">
                            <span>{__('Series preset', 'dashboardng')}:</span>
                            <span className="fw-bold">{seriesPresetLabel}</span>
                        </li>
                    )}
                    {seriesMode !== 'none' && (
                        <li className="list-group-item d-flex justify-content-between">
                            <span>{__('Series count', 'dashboardng')}:</span>
                            <span className="fw-bold">{seriesCount}</span>
                        </li>
                    )}
                    {seriesMode !== 'none' && (
                        <li className="list-group-item d-flex justify-content-between">
                            <span>{__('Series filters', 'dashboardng')}:</span>
                            <span className="fw-bold">{seriesFilterModeLabel}</span>
                        </li>
                    )}
                    {config.outputFields && config.outputFields.length > 0 && (
                        <li className="list-group-item d-flex justify-content-between">
                            <span>{__('Columns', 'dashboardng')}:</span>
                            <span className="fw-bold">{config.outputFields.length}</span>
                        </li>
                    )}
                    {config.visualization === 'table' && (
                        <li className="list-group-item d-flex justify-content-between">
                            <span>{__('Page size', 'dashboardng')}:</span>
                            <span className="fw-bold">{config.pageSize || 10}</span>
                        </li>
                    )}
                    <li className="list-group-item d-flex justify-content-between">
                        <span>{__('Filters', 'dashboardng')}:</span>
                        <span className="fw-bold">{config.filters.filter(f => f.field).length}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                        <span>{__('Refresh interval', 'dashboardng')}:</span>
                        <span className="fw-bold">
                            {config.refreshInterval === 0 ? __('Disabled', 'dashboardng') :
                            config.refreshInterval === 30_000 ? '30s' :
                            config.refreshInterval === 60_000 ? '1m' :
                            config.refreshInterval === 300_000 ? '5m' :
                            config.refreshInterval === 600_000 ? '10m' : `${config.refreshInterval}ms`}
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default PreviewStep;
