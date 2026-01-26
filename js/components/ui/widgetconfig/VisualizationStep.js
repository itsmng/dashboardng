import { html } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

const COLOR_PALETTES = {
    default: ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6610f2', '#d63384', '#fd7e14'],
    pastel: ['#9FB1D9', '#B0D9B1', '#D9B1B1', '#D9D9B1', '#B1D9D9', '#D9B1D9'],
    vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'],
    monochrome: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#D5DBDB'],
    warm: ['#FF6B6B', '#FFA07A', '#FFD700', '#FF8C00', '#DC143C', '#B22222'],
    cool: ['#00CED1', '#1E90FF', '#4169E1', '#6495ED', '#87CEEB', '#B0E0E6'],
};

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

            ${config.visualization === 'chart' && html`
                <div class="mb-4">
                    <label class="form-label">${__('Color Palette', 'dashboardng')}</label>
                    <div class="row g-2">
                        ${Object.entries(COLOR_PALETTES).map(([key, colors]) => html`
                            <div class="col-4">
                                <div
                                    class="palette-option card ${config.colorPalette === key ? 'selected' : ''}"
                                    style="cursor: pointer;"
                                    onClick=${() => setConfig({ ...config, colorPalette: key, colors })}
                                >
                                    <div class="card-body p-2">
                                        <div class="d-flex justify-content-between mb-1">
                                            ${colors.map(color => html`
                                                <div
                                                    style="width: 20px; height: 20px; background-color: ${color}; border-radius: 3px;"
                                                    title=${color}
                                                ></div>
                                            `)}
                                        </div>
                                        <small class="text-center d-block text-capitalize">${key}</small>
                                    </div>
                                </div>
                            </div>
                        `)}
                    </div>
                </div>
            `}

            ${config.visualization === 'table' && html`
                <div class="mb-4">
                    <label class="form-label">${__('Page Size', 'dashboardng')}</label>
                    <select
                        class="form-select"
                        value=${config.pageSize || 10}
                        onChange=${(e) => setConfig({ ...config, pageSize: parseInt(e.target.value) })}
                    >
                        <option value="5">5 ${__('rows per page', 'dashboardng')}</option>
                        <option value="10">10 ${__('rows per page', 'dashboardng')}</option>
                        <option value="20">20 ${__('rows per page', 'dashboardng')}</option>
                        <option value="50">50 ${__('rows per page', 'dashboardng')}</option>
                        <option value="100">100 ${__('rows per page', 'dashboardng')}</option>
                    </select>
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
