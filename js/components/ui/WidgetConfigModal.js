import { html, useState, useEffect } from '../../lib/preact.js';
import { api, COLORS } from '../../lib/config.js';
import { StepIndicator } from './widgetconfig/StepIndicator.js';
import { DataSourceStep } from './widgetconfig/DataSourceStep.js';
import { FiltersStep } from './widgetconfig/FiltersStep.js';
import { VisualizationStep } from './widgetconfig/VisualizationStep.js';
import { PreviewStep } from './widgetconfig/PreviewStep.js';
import { __ } from '../../lib/i18n.js';

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

const migrateGroupBy = (groupBy) => {
    if (!groupBy) {return null;}
    if (typeof groupBy === 'number' || typeof groupBy === 'string') {
        return { field: groupBy, interval: undefined };
    }
    return groupBy;
};

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

const migrateSeriesConfig = (config) => {
    let series = (config.series || []).map(seriesItem => ({
        ...seriesItem,
        filters: (seriesItem.filters || []).map(migrateFilterData),
        filter_mode: seriesItem.filter_mode || 'append',
        color: seriesItem.color || ''
    }));

    let seriesMode = config.seriesMode;
    let seriesPreset = config.seriesPreset;
    let seriesCount = config.seriesCount;

    const timeSeriesPreset = (() => {
        const keys = series
            .map(seriesItem => seriesItem.range_key)
            .filter(Boolean);
        if (!keys.length) {return undefined;}
        const prefix = keys[0].split('-')[0];
        return keys.every(key => key.startsWith(`${prefix}-`)) ? prefix : 'custom';
    })();

    const hasTimeSeries = series.some(seriesItem =>
        seriesItem.range_key || seriesItem.range_start || seriesItem.range_end
    );

    if (!seriesMode) {
        if (!series.length) {
            seriesMode = 'none';
        } else if (hasTimeSeries) {
            seriesMode = 'time';
        } else {
            seriesMode = 'filters';
        }
    }

    if (seriesMode === 'time' && !seriesPreset) {
        seriesPreset = timeSeriesPreset || 'yoy';
    } else if (!seriesPreset) {
        seriesPreset = 'yoy';
    }

    if (!seriesCount) {
        seriesCount = series.length || 2;
    }

    return {
        ...config,
        series,
        seriesMode,
        seriesPreset,
        seriesCount
    };
};

const normalizeSeriesFilters = (seriesList) => {
    return (seriesList || [])
        .map(seriesItem => {
            const filters = (seriesItem.filters || []).filter(filter =>
                filter.field && (filter.value || filter.operator === 'is_null' || filter.operator === 'is_not_null')
            );
            return {
                ...seriesItem,
                filter_mode: seriesItem.filter_mode || 'append',
                filters: filters.map(filter => ({
                    ...filter,
                    searchtype: reverseOperatorMap[filter.operator] || filter.operator
                }))
            };
        })
        .filter(seriesItem => seriesItem.filters && seriesItem.filters.length > 0);
};

const decodeHTMLEntities = (text) => {
    if (typeof text !== 'string') {return text;}
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

export const WidgetConfigModal = ({ isOpen, onClose, onSave, initialConfig = undefined, editMode = false }) => {
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState({
        title: '',
        itemtype: '',
        visualization: 'card',
        chartType: 'bar',
        filters: [],
        groupBy: undefined,
        aggregation: { function: 'COUNT', field: undefined },
        orderBy: { field: undefined, direction: 'DESC' },
        limit: 100,
        colors: COLORS.chart,
        colorPalette: 'default',
        refreshInterval: 60_000,
        outputFields: [],
        seriesMode: 'none',
        seriesPreset: 'yoy',
        seriesCount: 2,
        series: [],
        pageSize: 10,
        ...initialConfig
    });

    const [datasources, setDatasources] = useState({ itemtypes: [], grouped: {} });
    const [fields, setFields] = useState({ fields: [], aggregatable: [], groupable: [] });
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(undefined);

    useEffect(() => {
        if (isOpen) {
                if (initialConfig) {
                    const migratedFilters = (initialConfig.filters || []).map(migrateFilterData);
                    const normalizedConfig = { ...initialConfig, filters: migratedFilters };
                    normalizedConfig.groupBy = migrateGroupBy(normalizedConfig.groupBy);
                if (!normalizedConfig.orderBy) {
                    normalizedConfig.orderBy = { field: undefined, direction: 'DESC' };
                }
                const migratedSeriesConfig = migrateSeriesConfig(normalizedConfig);
                setConfig({ ...config, ...migratedSeriesConfig });
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
                    groupBy: undefined,
                    aggregation: { function: 'COUNT', field: undefined },
                    orderBy: { field: undefined, direction: 'DESC' },
                    limit: 100,
                    colors: COLORS.chart,
                    colorPalette: 'default',
                    refreshInterval: 60_000,
                    outputFields: [],
                    seriesMode: 'none',
                    seriesPreset: 'yoy',
                    seriesCount: 2,
                    series: [],
                    pageSize: 10,
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
        } catch (error) {
            console.error('Failed to load datasources:', error);
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
        } catch (error) {
            console.error('Failed to load fields:', error);
        }
        setLoading(false);
    };

    const handleItemtypeChange = (itemtype) => {
        setConfig({
            ...config,
            itemtype,
            groupBy: undefined,
            filters: [],
            seriesMode: 'none',
            seriesPreset: 'yoy',
            seriesCount: 2,
            series: [],
        });
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
            const previewSeries = config.seriesMode === 'none'
                ? []
                : normalizeSeriesFilters(config.series);

            const queryConfig = {
                itemtype: config.itemtype,
                filters: config.filters.filter(f => f.field && (f.value || f.operator === 'is_null' || f.operator === 'is_not_null')),
                group_by: config.groupBy ? [config.groupBy] : undefined,
                aggregation: config.aggregation,
                order_by: config.orderBy?.field ? { field: config.orderBy.field, direction: config.orderBy.direction } : undefined,
                limit: Math.min(config.limit, 20),
                series: previewSeries.length > 0 ? previewSeries : undefined,
                output_fields: config.outputFields && config.outputFields.length > 0 ? config.outputFields : undefined,
            };
            const result = await api.post('/query', queryConfig);
            if (result.success) {
                setPreviewData(result);
            }
        } catch (error) {
            console.error('Preview failed:', error);
        }
        setLoading(false);
    };

    const handleSave = () => {
        const normalizedFilters = config.filters.filter(f => f.field).map(f => ({
            ...f,
            searchtype: reverseOperatorMap[f.operator] || f.operator
        }));

        const normalizedSeries = config.seriesMode === 'none'
            ? []
            : normalizeSeriesFilters(config.series);

        onSave({
            widget_type: 'custom',
            config: {
                ...config,
                filters: normalizedFilters,
                series: normalizedSeries,
            }
        });
        onClose();
    };

    const canProceed = () => {
        switch (step) {
            case 1: { return config.itemtype;
            }
            case 2: { return true;
            }
            case 3: { return config.visualization;
            }
            case 4: { return config.title;
            }
            default: { return false;
            }
        }
    };

    if (!isOpen) {return null;}

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
                        ${step === 4 && html`<${PreviewStep} config=${config} previewData=${previewData} loading=${loading} loadPreview=${loadPreview} fields=${fields} />`}
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
