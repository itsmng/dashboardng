import { h } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';
import { COLORS } from '../../../lib/config.js';

interface VisualizationStepProps {
    config: {
        visualization?: string;
        chartType?: string;
        itemtype?: string;
        colorPalette?: string;
        colors?: string[];
        pageSize?: number;
        refreshInterval?: number;
        color?: string;
        icon?: string;
    };
    setConfig: (config: any) => void;
}

const COLOR_PALETTES: Record<string, string[]> = {
    default: ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6610f2', '#d63384', '#fd7e14'],
    pastel: ['#9FB1D9', '#B0D9B1', '#D9B1B1', '#D9D9B1', '#B1D9D9', '#D9B1D9'],
    vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'],
    monochrome: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#D5DBDB'],
    warm: ['#FF6B6B', '#FFA07A', '#FFD700', '#FF8C00', '#DC143C', '#B22222'],
    cool: ['#00CED1', '#1E90FF', '#4169E1', '#6495ED', '#87CEEB', '#B0E0E6'],
};

const BOOTSTRAP_COLORS: Record<string, string> = {
    primary: '#0d6efd',
    success: '#198754',
    info: '#0dcaf0',
    warning: '#ffc107',
    danger: '#dc3545',
    secondary: '#6c757d'
};

const CARD_ICONS = [
    'fa-ticket-alt', 'fa-chart-line', 'fa-users',
    'fa-cube', 'fa-desktop', 'fa-server',
    'fa-bug', 'fa-check-circle', 'fa-clock',
    'fa-exclamation-triangle', 'fa-envelope', 'fa-calendar'
];

export const VisualizationStep = ({ config, setConfig }: VisualizationStepProps) => {
    const savedSearchSource = (config.itemtype || '').startsWith('savedsearch:');
    const visualizationOptions = [
        { value: 'card', icon: 'fa-id-card', label: __('Card', 'dashboardng') },
        ...(!savedSearchSource ? [{ value: 'chart', icon: 'fa-chart-bar', label: __('Chart', 'dashboardng') }] : []),
        { value: 'table', icon: 'fa-table', label: __('Table', 'dashboardng') }
    ];

    const chartTypeOptions = [
        { value: 'bar', icon: 'fa-chart-bar', label: __('Bar', 'dashboardng') },
        { value: 'line', icon: 'fa-chart-line', label: __('Line', 'dashboardng') },
        { value: 'pie', icon: 'fa-chart-pie', label: __('Pie', 'dashboardng') },
        { value: 'doughnut', icon: 'fa-circle-notch', label: __('Doughnut', 'dashboardng') }
    ];

    return (
        <div className="step-content">
            <h5 className="mb-3">{__('Choose Visualization', 'dashboardng')}</h5>

            <div className="visualization-options mb-4">
                <div className="row g-3">
                    {visualizationOptions.map(opt => (
                        <div key={opt.value} className={savedSearchSource ? 'col-6' : 'col-4'}>
                            <div
                                className={`visualization-option card ${config.visualization === opt.value ? 'selected' : ''}`}
                                onClick={() => setConfig({ ...config, visualization: opt.value })}
                            >
                                <div className="card-body text-center py-4">
                                    <i className={`fas ${opt.icon} fa-2x mb-2`}></i>
                                    <div>{opt.label}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {config.visualization === 'chart' && (
                <div className="chart-type-options mb-4">
                    <label className="form-label">{__('Chart type', 'dashboardng')}</label>
                    <div className="row g-2">
                        {chartTypeOptions.map(opt => (
                            <div key={opt.value} className="col-3">
                                <div
                                    className={`chart-type-option card ${config.chartType === opt.value ? 'selected' : ''}`}
                                    onClick={() => setConfig({ ...config, chartType: opt.value })}
                                >
                                    <div className="card-body text-center p-2">
                                        <i className={`fas ${opt.icon}`}></i>
                                        <div className="">{opt.label}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {config.visualization === 'chart' && (
                <div className="mb-4">
                    <label className="form-label">{__('Color Palette', 'dashboardng')}</label>
                    <div className="row g-2">
                        {Object.entries(COLOR_PALETTES).map(([key, colors]) => (
                            <div key={key} className="col-4">
                                <div
                                    className={`palette-option card ${config.colorPalette === key ? 'selected' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setConfig({ ...config, colorPalette: key, colors })}
                                >
                                    <div className="card-body p-2">
                                        <div className="d-flex justify-content-between mb-1">
                                            {colors.map(color => (
                                                <div
                                                    key={color}
                                                    style={{ width: '20px', height: '20px', backgroundColor: color, borderRadius: '3px' }}
                                                    title={color}
                                                ></div>
                                            ))}
                                        </div>
                                        <small className="text-center d-block text-capitalize">{key}</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {config.visualization === 'table' && (
                <div className="mb-4">
                    <label className="form-label">{__('Page Size', 'dashboardng')}</label>
                    <select
                        className="form-select"
                        value={config.pageSize || 10}
                        onChange={(e) => setConfig({ ...config, pageSize: parseInt((e.target as HTMLSelectElement).value) })}
                    >
                        <option value="5">5 {__('rows per page', 'dashboardng')}</option>
                        <option value="10">10 {__('rows per page', 'dashboardng')}</option>
                        <option value="20">20 {__('rows per page', 'dashboardng')}</option>
                        <option value="50">50 {__('rows per page', 'dashboardng')}</option>
                        <option value="100">100 {__('rows per page', 'dashboardng')}</option>
                    </select>
                </div>
            )}

            <div className="mb-3">
                <label className="form-label">{__('Refresh interval', 'dashboardng')}</label>
                <select
                    className="form-select"
                    value={config.refreshInterval}
                    onChange={(e) => setConfig({ ...config, refreshInterval: parseInt((e.target as HTMLSelectElement).value) })}
                >
                    <option value="0">{__('Disabled', 'dashboardng')}</option>
                    <option value="30000">30 {__('seconds', 'dashboardng')}</option>
                    <option value="60000">1 {__('Minute', 'dashboardng')}</option>
                    <option value="300000">5 {__('Minutes', 'dashboardng')}</option>
                    <option value="600000">10 {__('Minutes', 'dashboardng')}</option>
                </select>
            </div>

            {config.visualization === 'card' && (
                <div className="mb-4">
                    <label className="form-label">{__('Card Color', 'dashboardng')}</label>
                    <div className="row g-2 mb-2">
                        {Object.entries(BOOTSTRAP_COLORS).map(([name, hex]) => (
                            <div key={name} className="col-2">
                                <button
                                    className={`color-swatch btn ${config.color === hex ? 'btn-primary' : 'btn-outline-secondary'} p-2 w-100`}
                                    style={{ backgroundColor: hex, borderColor: hex }}
                                    onClick={() => setConfig({ ...config, color: hex })}
                                    title={name}
                                ></button>
                            </div>
                        ))}
                    </div>
                    <div className="input-group">
                        <span className="input-group-text">{__('Custom', 'dashboardng')}</span>
                        <input
                            type="color"
                            className="form-control form-control-color"
                            value={config.color || COLORS.primary}
                            onInput={(e) => setConfig({ ...config, color: (e.target as HTMLInputElement).value })}
                        />
                    </div>
                </div>
            )}

            {config.visualization === 'card' && (
                <div className="mb-4">
                    <label className="form-label">{__('Card Icon', 'dashboardng')}</label>
                    <div className="row g-2 mb-2">
                        {CARD_ICONS.map(icon => (
                            <div key={icon} className="col-2">
                                <button
                                    className={`icon-option btn ${config.icon === icon ? 'btn-primary' : 'btn-outline-secondary'} p-2 w-100`}
                                    onClick={() => setConfig({ ...config, icon })}
                                    title={icon}
                                >
                                    <i className={`fas ${icon}`}></i>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            value={config.icon}
                            onInput={(e) => setConfig({ ...config, icon: (e.target as HTMLInputElement).value })}
                            placeholder="fa-star"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisualizationStep;
