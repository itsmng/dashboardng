import { html } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

const decodeHTMLEntities = (text) => {
    if (typeof text !== 'string') {return text;}
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const getFieldName = (fieldId, fields) => {
    if (!fields?.fields) {return fieldId;}
    const field = fields.fields.find(f => f.id === fieldId);
    return field ? decodeHTMLEntities(field.name) : fieldId;
};

export const PreviewStep = ({ config, previewData, loading, loadPreview, fields }) => {
    const seriesPresetLabels = {
        yoy: __('Year over year', 'dashboardng'),
        mom: __('Month over month', 'dashboardng'),
        qoq: __('Quarter over quarter', 'dashboardng'),
        custom: __('Custom ranges', 'dashboardng')
    };
    const chartVisualizations = ['chart', 'bar', 'line', 'pie', 'doughnut'];
    const isChartVisualization = chartVisualizations.includes(config.visualization);
    const chartType = config.chartType || (isChartVisualization ? config.visualization : 'bar');
    const groupByField = config.groupBy?.field ? getFieldName(config.groupBy.field, fields) : undefined;
    const orderByField = config.orderBy?.field ? getFieldName(config.orderBy.field, fields) : undefined;
    const seriesMode = config.seriesMode || (config.series?.length ? 'filters' : 'none');
    const seriesPresetLabel = seriesPresetLabels[config.seriesPreset] || config.seriesPreset;
    const seriesCount = config.series?.length || 0;
    const seriesFilterModes = new Set((config.series || []).map(series => series.filter_mode || 'append'));
    const seriesFilterModeLabel = seriesFilterModes.size === 1
        ? (seriesFilterModes.has('replace') ? __('Replace base filters', 'dashboardng') : __('Add to base filters', 'dashboardng'))
        : __('Mixed filter mode', 'dashboardng');

    return html`
        <div class="step-content">
            <h5 class="mb-3">${__('Preview', 'dashboardng')}</h5>

            <div class="mb-3">
                <button class="btn btn-primary btn-sm" onClick=${loadPreview} disabled=${loading}>
                    ${loading ? html`<i class="fas fa-spinner fa-spin me-1"></i>` : html`<i class="fas fa-play me-1"></i>`}
                    ${__('Load preview', 'dashboardng')}
                </button>
            </div>

            ${previewData && html`
                <div class="preview-result">
                    <div class="mb-2">
                        <small class="text-muted">
                            ${previewData.total || 0} ${__('Results', 'dashboardng')}
                            ${previewData.meta?.has_more ? `(${__('Showing first', 'dashboardng')} ${previewData.data?.length || 0})` : ''}
                        </small>
                    </div>

                    ${config.visualization === 'table' && html`
                        <div class="table-responsive">
                            <table class="table table-sm table-striped">
                                <thead>
                                    <tr>
                                        ${previewData.columns?.map(col => html`<th>${col.name}</th>`)}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${previewData.data?.slice(0, 10).map(row => html`
                                        <tr>
                                            ${Object.values(row).map(val => html`<td>${val}</td>`)}
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        </div>
                    `}

                    ${config.visualization === 'card' && previewData.data?.[0] && html`
                        <div class="preview-card card">
                            <div class="card-body text-center">
                                <div class="display-4">${previewData.data[0].value || Object.values(previewData.data[0])[0]}</div>
                                <div class="text-muted">${config.title || config.itemtype}</div>
                            </div>
                        </div>
                    `}

                    ${isChartVisualization && html`
                        <div class="preview-chart-placeholder text-center py-4 bg-light rounded">
                            <i class="fas fa-chart-${chartType === 'line' ? 'line' : (chartType === 'pie' || chartType === 'doughnut' ? 'pie' : 'bar')} fa-3x text-muted mb-2"></i>
                            <div class="text-muted">${__('Chart will render with actual data', 'dashboardng')}</div>
                            <div class="text-muted">${previewData.data?.length || 0} ${__('data points', 'dashboardng')}</div>
                        </div>
                    `}
                </div>
            `}

            <div class="config-summary mt-4">
                <h6>${__('Configuration summary', 'dashboardng')}</h6>
                <ul class="list-group list-group-flush">
                    <li class="list-group-item d-flex justify-content-between">
                        <span>${__('Title', 'dashboardng')}:</span>
                        <span class="fw-bold">${config.title || `(${__('Untitled', 'dashboardng')})`}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <span>${__('Data source', 'dashboardng')}:</span>
                        <span class="fw-bold">${config.itemtype}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <span>${__('Visualization', 'dashboardng')}:</span>
                        <span class="fw-bold">${config.visualization}${config.visualization === 'chart' ? ` (${chartType})` : ''}</span>
                    </li>
                    ${groupByField && html`
                        <li class="list-group-item d-flex justify-content-between">
                            <span>${__('Group by', 'dashboardng')}:</span>
                            <span class="fw-bold">
                                ${groupByField}
                                ${config.groupBy.interval && html` <small class="text-muted">(${config.groupBy.interval})</small>`}
                            </span>
                        </li>
                    `}
                    ${orderByField && html`
                        <li class="list-group-item d-flex justify-content-between">
                            <span>${__('Sort by', 'dashboardng')}:</span>
                            <span class="fw-bold">
                                ${orderByField}
                                <small class="text-muted">(${config.orderBy.direction})</small>
                            </span>
                        </li>
                    `}
                    ${seriesMode !== 'none' && html`
                        <li class="list-group-item d-flex justify-content-between">
                            <span>${__('Series mode', 'dashboardng')}:</span>
                            <span class="fw-bold">
                                ${seriesMode === 'time' ? __('Time-based', 'dashboardng') : __('Filter-based', 'dashboardng')}
                            </span>
                        </li>
                    `}
                    ${seriesMode === 'time' && html`
                        <li class="list-group-item d-flex justify-content-between">
                            <span>${__('Series preset', 'dashboardng')}:</span>
                            <span class="fw-bold">${seriesPresetLabel}</span>
                        </li>
                    `}
                    ${seriesMode !== 'none' && html`
                        <li class="list-group-item d-flex justify-content-between">
                            <span>${__('Series count', 'dashboardng')}:</span>
                            <span class="fw-bold">${seriesCount}</span>
                        </li>
                    `}
                    ${seriesMode !== 'none' && html`
                        <li class="list-group-item d-flex justify-content-between">
                            <span>${__('Series filters', 'dashboardng')}:</span>
                            <span class="fw-bold">${seriesFilterModeLabel}</span>
                        </li>
                    `}
                    ${config.outputFields?.length > 0 && html`
                        <li class="list-group-item d-flex justify-content-between">
                            <span>${__('Columns', 'dashboardng')}:</span>
                            <span class="fw-bold">${config.outputFields.length}</span>
                        </li>
                    `}
                    ${config.visualization === 'table' && html`
                        <li class="list-group-item d-flex justify-content-between">
                            <span>${__('Page size', 'dashboardng')}:</span>
                            <span class="fw-bold">${config.pageSize || 10}</span>
                        </li>
                    `}
                    <li class="list-group-item d-flex justify-content-between">
                        <span>${__('Filters', 'dashboardng')}:</span>
                        <span class="fw-bold">${config.filters.filter(f => f.field).length}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <span>${__('Refresh interval', 'dashboardng')}:</span>
                        <span class="fw-bold">
                            ${config.refreshInterval === 0 ? __('Disabled', 'dashboardng') :
                            config.refreshInterval === 30_000 ? '30s' :
                            config.refreshInterval === 60_000 ? '1m' :
                            config.refreshInterval === 300_000 ? '5m' :
                            config.refreshInterval === 600_000 ? '10m' : `${config.refreshInterval}ms`}
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    `;
};

export default PreviewStep;
