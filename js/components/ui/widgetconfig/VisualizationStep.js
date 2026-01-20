import { html } from '../../../lib/preact.js';

export const VisualizationStep = ({ config, setConfig }) => {
    return html`
        <div class="step-content">
            <h5 class="mb-3">${__('Choose Visualization', 'dashboardng')}</h5>

            <div class="visualization-options mb-4">
                <div class="row g-3">
                    ${[
                        { value: 'card', icon: 'fa-id-card', label: __('Card', 'dashboardng') },
                        { value: 'chart', icon: 'fa-chart-bar', label: __('Chart', 'dashboardng') },
                        { value: 'table', icon: 'fa-table', label: __('Table', 'dashboardng') }
                    ].map(opt => html`
                        <div class="col-4">
                            <div
                                class="visualization-option card ${config.visualization === opt.value ? 'selected' : ''}"
                                onClick=${() => setConfig({ ...config, visualization: opt.value })}
                            >
                                <div class="card-body text-center py-4">
                                    <i class="fas ${opt.icon} fa-2x mb-2"></i>
                                    <div>${opt.label}</div>
                                </div>
                            </div>
                        </div>
                    `)}
                </div>
            </div>

            ${config.visualization === 'chart' && html`
                <div class="chart-type-options mb-4">
                    <label class="form-label">${__('Chart type', 'dashboardng')}</label>
                    <div class="row g-2">
                        ${[
                            { value: 'bar', icon: 'fa-chart-bar', label: __('Bar', 'dashboardng') },
                            { value: 'line', icon: 'fa-chart-line', label: __('Line', 'dashboardng') },
                            { value: 'pie', icon: 'fa-chart-pie', label: __('Pie', 'dashboardng') },
                            { value: 'doughnut', icon: 'fa-circle-notch', label: __('Doughnut', 'dashboardng') }
                        ].map(opt => html`
                            <div class="col-3">
                                <div
                                    class="chart-type-option card ${config.chartType === opt.value ? 'selected' : ''}"
                                    onClick=${() => setConfig({ ...config, chartType: opt.value })}
                                >
                                    <div class="card-body text-center p-2">
                                        <i class="fas ${opt.icon}"></i>
                                        <div class="">${opt.label}</div>
                                    </div>
                                </div>
                            </div>
                        `)}
                    </div>
                </div>
            `}

            <div class="mb-3">
                <label class="form-label">${__('Refresh interval', 'dashboardng')}</label>
                <select
                    class="form-select"
                    value=${config.refreshInterval}
                    onChange=${(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) })}
                >
                    <option value="0">${__('Disabled', 'dashboardng')}</option>
                    <option value="30000">30 ${__('seconds', 'dashboardng')}</option>
                    <option value="60000">1 ${__('Minute', 'dashboardng')}</option>
                    <option value="300000">5 ${__('Minutes', 'dashboardng')}</option>
                    <option value="600000">10 ${__('Minutes', 'dashboardng')}</option>
                </select>
            </div>
        </div>
    `;
};

export default VisualizationStep;
