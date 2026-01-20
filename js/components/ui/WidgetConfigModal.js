import { html, useState, useEffect } from '../../lib/preact.js';
import { api, COLORS } from '../../lib/config.js';
import { StepIndicator } from './widgetconfig/StepIndicator.js';
import { DataSourceStep } from './widgetconfig/DataSourceStep.js';
import { FiltersStep } from './widgetconfig/FiltersStep.js';
import { VisualizationStep } from './widgetconfig/VisualizationStep.js';
import { PreviewStep } from './widgetconfig/PreviewStep.js';

const migrateFilterData = (filter) => {
    const migrated = { ...filter };
    if (migrated.searchtype && !migrated.operator) {
        const operatorMap = {
            'equals': 'equals',
            'notequals': 'not_equals',
            'contains': 'contains',
            'notcontains': 'not_contains',
            'greaterthan': 'greater_than',
            'lessthan': 'less_than',
            'isnull': 'is_null',
            'isnotnull': 'is_not_null'
        };
        migrated.operator = operatorMap[migrated.searchtype.toLowerCase().replace('_', '')] || migrated.searchtype;
    }
    return migrated;
};

const decodeHTMLEntities = (text) => {
    if (typeof text !== 'string') return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

export const WidgetConfigModal = ({ isOpen, onClose, onSave, initialConfig = null, editMode = false }) => {
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState({
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
        ...initialConfig
    });

    const [datasources, setDatasources] = useState({ itemtypes: [], grouped: {} });
    const [fields, setFields] = useState({ fields: [], aggregatable: [], groupable: [] });
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (initialConfig) {
                const migratedFilters = (initialConfig.filters || []).map(migrateFilterData);
                const normalizedConfig = { ...initialConfig, filters: migratedFilters };
                const chartVisualizations = ['bar', 'line', 'multiline', 'pie', 'doughnut'];
                if (chartVisualizations.includes(normalizedConfig.visualization)) {
                    normalizedConfig.chartType = normalizedConfig.chartType || normalizedConfig.visualization;
                    normalizedConfig.visualization = 'chart';
                }
                setConfig({ ...config, ...normalizedConfig });
                if (normalizedConfig.itemtype) {
                    loadFields(normalizedConfig.itemtype);
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
    }, [isOpen, initialConfig]);

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
                const sanitizedFields = {
                    ...result.data,
                    fields: result.data.fields?.map(f => ({
                        ...f,
                        name: decodeHTMLEntities(f.name)
                    }))
                };
                setFields(sanitizedFields);
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
                filters: config.filters.filter(f => f.field && (f.value || f.operator === 'is_null' || f.operator === 'is_not_null')),
                group_by: config.groupBy ? [config.groupBy] : null,
                aggregation: config.aggregation,
                limit: Math.min(config.limit, 20),
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
        const reverseOperatorMap = {
            'equals': 'equals',
            'not_equals': 'notequals',
            'contains': 'contains',
            'not_contains': 'notcontains',
            'greater_than': 'greaterthan',
            'less_than': 'lessthan',
            'is_null': 'isnull',
            'is_not_null': 'isnotnull'
        };

        const normalizedFilters = config.filters.filter(f => f.field).map(f => ({
            ...f,
            searchtype: reverseOperatorMap[f.operator] || f.operator
        }));

        onSave({
            widget_type: 'custom',
            config: {
                ...config,
                filters: normalizedFilters,
            }
        });
        onClose();
    };

    const canProceed = () => {
        switch (step) {
            case 1: return config.itemtype;
            case 2: return true;
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
                        <${StepIndicator} step=${step} onStepClick=${setStep} />
                        ${step === 1 && html`<${DataSourceStep} config=${config} setConfig=${setConfig} datasources=${datasources} fields=${fields} handleItemtypeChange=${handleItemtypeChange} />`}
                        ${step === 2 && html`<${FiltersStep} config=${config} setConfig=${setConfig} fields=${fields} addFilter=${addFilter} updateFilter=${updateFilter} removeFilter=${removeFilter} />`}
                        ${step === 3 && html`<${VisualizationStep} config=${config} setConfig=${setConfig} />`}
                        ${step === 4 && html`<${PreviewStep} config=${config} previewData=${previewData} loading=${loading} loadPreview=${loadPreview} />`}
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
