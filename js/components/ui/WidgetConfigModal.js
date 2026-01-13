import { html, useState, useEffect, useCallback } from '../../lib/preact.js';
import { api, COLORS } from '../../lib/config.js';

/**
 * Widget Configuration Modal - Multi-step wizard for creating/editing custom widgets
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {function(): void} props.onClose - Callback when modal closes
 * @param {function(WidgetData): void} props.onSave - Callback when widget is saved
 * @param {Object} [props.initialConfig] - Initial configuration for editing
 * @param {boolean} [props.editMode=false] - Whether in edit mode
 * @returns {import('preact').VNode|null} Modal or null if not open
 */
export const WidgetConfigModal = ({ isOpen, onClose, onSave, initialConfig = null, editMode = false }) => {
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState({
        title: '',
        itemtype: '',
        visualization: 'card', // card, chart, table
        chartType: 'bar', // bar, line, pie, doughnut
        filters: [],
        groupBy: null,
        aggregation: { function: 'COUNT', field: null },
        orderBy: null,
        limit: 100,
        colors: COLORS.chart,
        refreshInterval: 60000,
        ...initialConfig
    });

    const [datasources, setDatasources] = useState({ itemtypes: [], grouped: {} });
    const [fields, setFields] = useState({ fields: [], aggregatable: [], groupable: [] });
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialConfig) {
                setConfig({ ...config, ...initialConfig });
                if (initialConfig.itemtype) {
                    loadFields(initialConfig.itemtype);
                }
            } else {
                setConfig({
                    title: '',
                    itemtype: '',
                    visualization: 'card',
                    chartType: 'bar',
                    filters: [],
                    groupBy: null,
                    aggregation: { function: 'COUNT', field: null },
                    orderBy: null,
                    limit: 100,
                    colors: COLORS.chart,
                    refreshInterval: 60000,
                });
                setStep(1);
            }
            loadDatasources();
        }
    }, [isOpen]);

    const loadDatasources = async () => {
        try {
            const result = await api.fetch('/datasources');
            if (result.success) {
                setDatasources(result.data);
            }
        } catch (err) {
            console.error('Failed to load datasources:', err);
        }
    };

    const loadFields = async (itemtype) => {
        setLoading(true);
        try {
            const result = await api.fetch(`/datasources/${itemtype}/fields`);
            if (result.success) {
                setFields(result.data);
            }
        } catch (err) {
            console.error('Failed to load fields:', err);
        }
        setLoading(false);
    };

    const handleItemtypeChange = (itemtype) => {
        setConfig({ ...config, itemtype, groupBy: null, filters: [] });
        if (itemtype) {
            loadFields(itemtype);
        }
    };

    const addFilter = () => {
        setConfig({
            ...config,
            filters: [...config.filters, { field: '', operator: 'equals', value: '', link: 'AND' }]
        });
    };

    const updateFilter = (index, updates) => {
        const newFilters = [...config.filters];
        newFilters[index] = { ...newFilters[index], ...updates };
        setConfig({ ...config, filters: newFilters });
    };

    const removeFilter = (index) => {
        setConfig({ ...config, filters: config.filters.filter((_, i) => i !== index) });
    };

    const loadPreview = async () => {
        setLoading(true);
        try {
            const queryConfig = {
                itemtype: config.itemtype,
                filters: config.filters.filter(f => f.field && f.value),
                group_by: config.groupBy ? [config.groupBy] : null,
                aggregation: config.aggregation,
                limit: Math.min(config.limit, 20), // Limit preview
            };
            const result = await api.post('/query', queryConfig);
            if (result.success) {
                setPreviewData(result);
            }
        } catch (err) {
            console.error('Preview failed:', err);
        }
        setLoading(false);
    };

    const handleSave = () => {
        onSave({
            widget_type: 'custom',
            config: {
                ...config,
                filters: config.filters.filter(f => f.field), // Clean empty filters
            }
        });
        onClose();
    };

    const renderStepIndicator = () => html`
        <div class="step-indicator mb-4">
            <div class="d-flex justify-content-between">
                ${[
                    { num: 1, label: __('Data Source', 'dashboardng') },
                    { num: 2, label: __('Filters', 'dashboardng') },
                    { num: 3, label: __('Visualization', 'dashboardng') },
                    { num: 4, label: __('Preview', 'dashboardng') }
                ].map(s => html`
                    <div class="step ${step >= s.num ? 'active' : ''} ${step === s.num ? 'current' : ''}"
                         onClick=${() => s.num < step && setStep(s.num)}>
                        <div class="step-number">${s.num}</div>
                        <div class="step-label">${s.label}</div>
                    </div>
                `)}
            </div>
        </div>
    `;

    // Step 1: Select Data Source
    const renderStep1 = () => html`
        <div class="step-content">
            <h5 class="mb-3">${__('Select Data Source', 'dashboardng')}</h5>

            <div class="mb-3">
                <label class="form-label">${__('Widget Title', 'dashboardng')}</label>
                <input
                    type="text"
                    class="form-control"
                    value=${config.title}
                    onInput=${(e) => setConfig({ ...config, title: e.target.value })}
                    placeholder=${__('Enter widget title...', 'dashboardng')}
                />
            </div>

            <div class="mb-3">
                <label class="form-label">${__('Collection', 'dashboardng')}</label>
                <select
                    class="form-select"
                    value=${config.itemtype}
                    onChange=${(e) => handleItemtypeChange(e.target.value)}
                >
                    <option value="">${__('-- Select Collection --', 'dashboardng')}</option>
                    ${Object.entries(datasources.grouped || {}).map(([category, items]) => html`
                        <optgroup label=${category}>
                            ${items.map(item => html`
                                <option value=${item.itemtype}>
                                    ${item.name}
                                </option>
                            `)}
                        </optgroup>
                    `)}
                </select>
            </div>

            ${config.itemtype && fields.groupable?.length > 0 && html`
                <div class="mb-3">
                    <label class="form-label">${__('Group by', 'dashboardng')} (${__('optional', 'dashboardng')})</label>
                    <select
                        class="form-select"
                        value=${config.groupBy || ''}
                        onChange=${(e) => setConfig({ ...config, groupBy: e.target.value ? parseInt(e.target.value) : null })}
                    >
                        <option value="">${__('-- No grouping --', 'dashboardng')}</option>
                        ${fields.groupable.map(field => html`
                            <option value=${field.id}>${field.name}</option>
                        `)}
                    </select>
                </div>
            `}

            ${config.itemtype && html`
                <div class="mb-3">
                    <label class="form-label">${__('Aggregation', 'dashboardng')}</label>
                    <div class="row">
                        <div class="col-6">
                            <select
                                class="form-select"
                                value=${config.aggregation.function}
                                onChange=${(e) => setConfig({
                                    ...config,
                                    aggregation: { ...config.aggregation, function: e.target.value }
                                })}
                            >
                                <option value="COUNT">${__('Count', 'dashboardng')}</option>
                                <option value="SUM">${__('Sum', 'dashboardng')}</option>
                                <option value="AVG">${__('Average', 'dashboardng')}</option>
                                <option value="MIN">${__('Minimum', 'dashboardng')}</option>
                                <option value="MAX">${__('Maximum', 'dashboardng')}</option>
                            </select>
                        </div>
                        ${config.aggregation.function !== 'COUNT' && fields.aggregatable?.length > 0 && html`
                            <div class="col-6">
                                <select
                                    class="form-select"
                                    value=${config.aggregation.field || ''}
                                    onChange=${(e) => setConfig({
                                        ...config,
                                        aggregation: { ...config.aggregation, field: e.target.value ? parseInt(e.target.value) : null }
                                    })}
                                >
                                    <option value="">${__('-- Select field --', 'dashboardng')}</option>
                                    ${fields.aggregatable.map(field => html`
                                        <option value=${field.id}>${field.name}</option>
                                    `)}
                                </select>
                            </div>
                        `}
                    </div>
                </div>
            `}
        </div>
    `;

    // Step 2: Configure Filters
    const renderStep2 = () => html`
        <div class="step-content">
            <h5 class="mb-3">${__('Configure Filters', 'dashboardng')}</h5>
            
            ${config.filters.map((filter, index) => html`
                <div class="filter-row card mb-2" key=${index}>
                    <div class="card-body p-2">
                        <div class="row g-2 align-items-center">
                            ${index > 0 && html`
                                <div class="col-auto">
                                    <select
                                        class="form-select form-select-sm"
                                        value=${filter.link}
                                        onChange=${(e) => updateFilter(index, { link: e.target.value })}
                                    >
                                        <option value="AND">AND</option>
                                        <option value="OR">OR</option>
                                    </select>
                                </div>
                            `}
                            <div class="col">
                                <select
                                    class="form-select form-select-sm"
                                    value=${filter.field}
                                    onChange=${(e) => updateFilter(index, { field: parseInt(e.target.value) })}
                                >
                                    <option value="">${__('-- Field --', 'dashboardng')}</option>
                                    ${fields.fields?.map(f => html`
                                        <option value=${f.id}>${f.name}</option>
                                    `)}
                                </select>
                            </div>
                            <div class="col-auto">
                                <select
                                    class="form-select form-select-sm"
                                    value=${filter.operator}
                                    onChange=${(e) => updateFilter(index, { operator: e.target.value })}
                                >
                                    <option value="equals">=</option>
                                    <option value="not_equals">≠</option>
                                    <option value="contains">${__('Contains', 'dashboardng')}</option>
                                    <option value="not_contains">${__('Does not contain', 'dashboardng')}</option>
                                    <option value="greater_than">></option>
                                    <option value="less_than"><</option>
                                    <option value="is_null">${__('Is empty', 'dashboardng')}</option>
                                    <option value="is_not_null">${__('Is not empty', 'dashboardng')}</option>
                                </select>
                            </div>
                            <div class="col">
                                <input
                                    type="text"
                                    class="form-control form-control-sm"
                                    value=${filter.value}
                                    onInput=${(e) => updateFilter(index, { value: e.target.value })}
                                    placeholder=${__('Value...', 'dashboardng')}
                                    disabled=${filter.operator === 'is_null' || filter.operator === 'is_not_null'}
                                />
                            </div>
                            <div class="col-auto">
                                <button
                                    class="btn btn-outline-danger btn-sm"
                                    onClick=${() => removeFilter(index)}
                                >
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `)}

            <button class="btn btn-outline-primary btn-sm" onClick=${addFilter}>
                <i class="fas fa-plus me-1"></i>
                ${__('Add filter', 'dashboardng')}
            </button>

            <div class="mt-4">
                <label class="form-label">${__('Limit', 'dashboardng')}</label>
                <input
                    type="number"
                    class="form-control"
                    value=${config.limit}
                    onInput=${(e) => setConfig({ ...config, limit: parseInt(e.target.value) || 100 })}
                    min="1"
                    max="10000"
                />
            </div>
        </div>
    `;

    // Step 3: Choose Visualization
    const renderStep3 = () => html`
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

    // Step 4: Preview
    const renderStep4 = () => html`
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

                    ${config.visualization === 'chart' && html`
                        <div class="preview-chart-placeholder text-center py-4 bg-light rounded">
                            <i class="fas fa-chart-${config.chartType === 'line' ? 'line' : config.chartType === 'pie' || config.chartType === 'doughnut' ? 'pie' : 'bar'} fa-3x text-muted mb-2"></i>
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
                        <span class="fw-bold">${config.visualization}${config.visualization === 'chart' ? ` (${config.chartType})` : ''}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <span>${__('Filters', 'dashboardng')}:</span>
                        <span class="fw-bold">${config.filters.filter(f => f.field).length}</span>
                    </li>
                </ul>
            </div>
        </div>
    `;

    const canProceed = () => {
        switch (step) {
            case 1: return config.itemtype;
            case 2: return true; // Filters are optional
            case 3: return config.visualization;
            case 4: return config.title;
            default: return false;
        }
    };

    if (!isOpen) return null;

    return html`
        <div class="modal-backdrop show" onClick=${onClose}></div>
        <div class="modal widget-config-modal show d-block" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-puzzle-piece me-2"></i>
                            ${editMode ? __('Edit widget', 'dashboardng') : __('Create Widget', 'dashboardng')}
                        </h5>
                        <button type="button" class="btn-close" onClick=${onClose}></button>
                    </div>
                    <div class="modal-body">
                        ${renderStepIndicator()}
                        ${step === 1 && renderStep1()}
                        ${step === 2 && renderStep2()}
                        ${step === 3 && renderStep3()}
                        ${step === 4 && renderStep4()}
                    </div>
                    <div class="modal-footer">
                        ${step > 1 && html`
                            <button class="btn btn-outline-secondary" onClick=${() => setStep(step - 1)}>
                                <i class="fas fa-arrow-left me-1"></i>
                                ${__('Back', 'dashboardng')}
                            </button>
                        `}
                        ${step < 4 ? html`
                            <button
                                class="btn btn-primary"
                                onClick=${() => setStep(step + 1)}
                                disabled=${!canProceed()}
                            >
                                ${__('Next', 'dashboardng')}
                                <i class="fas fa-arrow-right ms-1"></i>
                            </button>
                        ` : html`
                            <button
                                class="btn btn-success"
                                onClick=${handleSave}
                                disabled=${!canProceed()}
                            >
                                <i class="fas fa-check me-1"></i>
                                ${editMode ? __('Save changes', 'dashboardng') : __('Create Widget', 'dashboardng')}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
};

export default WidgetConfigModal;
