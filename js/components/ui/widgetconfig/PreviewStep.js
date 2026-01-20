import { html } from '../../../lib/preact.js';

export const PreviewStep = ({ config, previewData, loading, loadPreview }) => {
    const chartVisualizations = ['chart', 'bar', 'line', 'multiline', 'pie', 'doughnut'];
    const isChartVisualization = chartVisualizations.includes(config.visualization);
    const chartType = config.chartType || (isChartVisualization ? config.visualization : 'bar');

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
                            <i class="fas fa-chart-${chartType === 'line' ? 'line' : chartType === 'pie' || chartType === 'doughnut' ? 'pie' : 'bar'} fa-3x text-muted mb-2"></i>
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
                    <li class="list-group-item d-flex justify-content-between">
                        <span>${__('Filters', 'dashboardng')}:</span>
                        <span class="fw-bold">${config.filters.filter(f => f.field).length}</span>
                    </li>
                </ul>
            </div>
        </div>
    `;
};

export default PreviewStep;
