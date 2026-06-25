import { h, Fragment } from '../../lib/preact.js';
import { useState, useEffect } from '../../lib/preact.js';
import { api, COLORS } from '../../lib/config.js';
import { StepIndicator } from './widgetconfig/StepIndicator.js';
import { DataSourceStep } from './widgetconfig/DataSourceStep.js';
import { FiltersStep } from './widgetconfig/FiltersStep.js';
import { VisualizationStep } from './widgetconfig/VisualizationStep.js';
import { PreviewStep } from './widgetconfig/PreviewStep.js';
import { __ } from '../../lib/i18n.js';

interface Filter {
    field: string;
    operator: string;
    value: string;
    link?: string;
    searchtype?: string;
}

interface GroupBy {
    field: number | string;
    interval?: string;
}

interface SeriesItem {
    filters: Filter[];
    filter_mode: string;
    color: string;
    range_key?: string;
    range_start?: string;
    range_end?: string;
}

interface Aggregation {
    function: string;
    field?: string;
}

interface OrderBy {
    field?: string;
    direction: string;
}

interface WidgetConfig {
    title: string;
    itemtype: string;
    visualization: string;
    chartType: string;
    filters: Filter[];
    groupBy?: GroupBy;
    aggregation: Aggregation;
    orderBy: OrderBy;
    limit: number;
    colors: string[];
    colorPalette: string;
    color: string;
    icon: string;
    refreshInterval: number;
    outputFields: string[];
    seriesMode: string;
    seriesPreset: string;
    seriesCount: number;
    series: SeriesItem[];
    pageSize: number;
}

interface Datasources {
    itemtypes: string[];
    grouped: Record<string, unknown>;
}

interface Fields {
    fields: Array<{ name: string }>;
    aggregatable: string[];
    groupable: string[];
}

interface WidgetConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (result: { widget_type: string; config: WidgetConfig }) => void;
    initialConfig?: Partial<WidgetConfig>;
    editMode?: boolean;
}

const LEGACY_CHART_VISUALIZATIONS = new Set(['bar', 'line', 'pie', 'doughnut']);

const normalizeVisualizationConfig = <T extends Partial<WidgetConfig>>(widgetConfig: T): T => {
    const normalizedConfig = { ...widgetConfig };
    const visualization = normalizedConfig.visualization;

    if (visualization && LEGACY_CHART_VISUALIZATIONS.has(visualization)) {
        normalizedConfig.visualization = 'chart';
        normalizedConfig.chartType = normalizedConfig.chartType || visualization;
    }

    return normalizedConfig;
};

const migrateFilterData = (filter: Filter): Filter => {
    const migrated = { ...filter };
    if (migrated.searchtype && !migrated.operator) {
        const operatorMap: Record<string, string> = {
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

const migrateGroupBy = (groupBy: GroupBy | undefined): GroupBy | null => {
    if (!groupBy) {return null;}
    if (typeof groupBy === 'number' || typeof groupBy === 'string') {
        return { field: groupBy, interval: undefined };
    }
    return groupBy;
};

const reverseOperatorMap: Record<string, string> = {
    'equals': 'equals',
    'not_equals': 'notequals',
    'contains': 'contains',
    'not_contains': 'notcontains',
    'greater_than': 'greaterthan',
    'less_than': 'lessthan',
    'is_null': 'isnull',
    'is_not_null': 'isnotnull'
};

const migrateSeriesConfig = (config: Partial<WidgetConfig>): Partial<WidgetConfig> => {
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
            .filter(Boolean) as string[];
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

const normalizeSeriesFilters = (seriesList: SeriesItem[]): SeriesItem[] => {
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

const decodeHTMLEntities = (text: string): string => {
    if (typeof text !== 'string') {return text;}
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const isSavedSearchSource = (itemtype: string | undefined): boolean => {
    return (itemtype || '').startsWith('savedsearch:');
};

export const WidgetConfigModal = ({ isOpen, onClose, onSave, initialConfig = undefined, editMode = false }: WidgetConfigModalProps) => {
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState<WidgetConfig>({
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
        color: '#0d6efd',
        icon: 'fa-chart-line',
        refreshInterval: 60_000,
        outputFields: [],
        seriesMode: 'none',
        seriesPreset: 'yoy',
        seriesCount: 2,
        series: [],
        pageSize: 10,
        ...initialConfig
    });

    const [datasources, setDatasources] = useState<Datasources>({ itemtypes: [], grouped: {} });
    const [fields, setFields] = useState<Fields>({ fields: [], aggregatable: [], groupable: [] });
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<{ success: boolean; data: unknown } | undefined>(undefined);

    useEffect(() => {
        if (isOpen) {
                if (initialConfig) {
                    const migratedFilters = (initialConfig.filters || []).map(migrateFilterData);
                    const normalizedConfig = normalizeVisualizationConfig({ ...initialConfig, filters: migratedFilters });
                    normalizedConfig.groupBy = migrateGroupBy(normalizedConfig.groupBy);
                if (!normalizedConfig.orderBy) {
                    normalizedConfig.orderBy = { field: undefined, direction: 'DESC' };
                }
                const migratedSeriesConfig = migrateSeriesConfig(normalizedConfig);
                setConfig({ ...config, ...migratedSeriesConfig } as WidgetConfig);
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
                    color: '#0d6efd',
                    icon: 'fa-chart-line',
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
                setDatasources(result.data as Datasources);
            }
        } catch (error) {
            console.error('Failed to load datasources:', error);
        }
    };

    const loadFields = async (itemtype: string) => {
        setLoading(true);
        try {
            const result = await api.fetch(`/datasources/${encodeURIComponent(itemtype)}/fields`);
            if (result.success) {
                const data = result.data as Fields;
                const sanitizedFields = {
                    ...data,
                    fields: data.fields?.map((f: { name: string }) => ({
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

    const handleItemtypeChange = (itemtype: string) => {
        const savedSearchSource = isSavedSearchSource(itemtype);
        setConfig({
            ...config,
            itemtype,
            visualization: savedSearchSource && config.visualization === 'chart' ? 'card' : config.visualization,
            groupBy: undefined,
            filters: [],
            aggregation: { function: 'COUNT', field: undefined },
            orderBy: { field: undefined, direction: 'DESC' },
            outputFields: [],
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

    const updateFilter = (index: number, updates: Partial<Filter>) => {
        const newFilters = [...config.filters];
        newFilters[index] = { ...newFilters[index], ...updates };
        setConfig({ ...config, filters: newFilters });
    };

    const removeFilter = (index: number) => {
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
                filters: isSavedSearchSource(config.itemtype) ? [] : config.filters.filter(f => f.field && (f.value || f.operator === 'is_null' || f.operator === 'is_not_null')),
                group_by: !isSavedSearchSource(config.itemtype) && config.groupBy ? [config.groupBy] : undefined,
                aggregation: isSavedSearchSource(config.itemtype) ? undefined : config.aggregation,
                order_by: config.orderBy?.field ? { field: config.orderBy.field, direction: config.orderBy.direction } : undefined,
                limit: Math.min(config.limit, 20),
                series: !isSavedSearchSource(config.itemtype) && previewSeries.length > 0 ? previewSeries : undefined,
                output_fields: config.outputFields && config.outputFields.length > 0 ? config.outputFields : undefined,
            };
            const result = await api.post('/query', queryConfig);
            if (result.success) {
                setPreviewData(result as any);
            }
        } catch (error) {
            console.error('Preview failed:', error);
        }
        setLoading(false);
    };

    const handleSave = () => {
        const savedSearchSource = isSavedSearchSource(config.itemtype);
        const normalizedFilters = savedSearchSource
            ? []
            : config.filters.filter(f => f.field).map(f => ({
                ...f,
                searchtype: reverseOperatorMap[f.operator] || f.operator
            }));

        const normalizedSeries = config.seriesMode === 'none' || savedSearchSource
            ? []
            : normalizeSeriesFilters(config.series);

        const normalizedVisualizationConfig = normalizeVisualizationConfig({
            ...config,
            groupBy: savedSearchSource ? undefined : config.groupBy,
            aggregation: savedSearchSource ? undefined : config.aggregation,
            filters: normalizedFilters,
            series: normalizedSeries,
        }) as WidgetConfig;

        onSave({
            widget_type: 'custom',
            config: normalizedVisualizationConfig
        });
        onClose();
    };

    const canProceed = (): boolean => {
        switch (step) {
            case 1: { return !!config.itemtype;
            }
            case 2: { return true;
            }
            case 3: { return !!config.visualization;
            }
            case 4: { return !!config.title;
            }
            default: { return false;
            }
        }
    };

    if (!isOpen) {return null;}

    return (
        <Fragment>
            <div className="modal-backdrop show" onClick={onClose}></div>
            <div className="modal widget-config-modal show d-block" tabIndex={-1}>
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                <i className="fas fa-puzzle-piece me-2"></i>
                                {editMode ? __('Edit widget', 'dashboardng') : __('Create Widget', 'dashboardng')}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            <StepIndicator step={step} onStepClick={setStep} />
                            {step === 1 && <DataSourceStep config={config as any} setConfig={setConfig as any} datasources={datasources as any} fields={fields as any} handleItemtypeChange={handleItemtypeChange} />}
                            {step === 2 && <FiltersStep config={config as any} setConfig={setConfig as any} fields={fields as any} addFilter={addFilter} updateFilter={updateFilter as any} removeFilter={removeFilter} />}
                            {step === 3 && <VisualizationStep config={config as any} setConfig={setConfig as any} />}
                            {step === 4 && <PreviewStep config={config as any} previewData={previewData as any} loading={loading} loadPreview={loadPreview} fields={fields as any} />}
                        </div>
                        <div className="modal-footer">
                            {step > 1 && (
                                <button className="btn btn-outline-secondary" onClick={() => setStep(step - 1)}>
                                    <i className="fas fa-arrow-left me-1"></i>
                                    {__('Back', 'dashboardng')}
                                </button>
                            )}
                            {step < 4 ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setStep(step + 1)}
                                    disabled={!canProceed()}
                                >
                                    {__('Next', 'dashboardng')}
                                    <i className="fas fa-arrow-right ms-1"></i>
                                </button>
                            ) : (
                                <button
                                    className="btn btn-success"
                                    onClick={handleSave}
                                    disabled={!canProceed()}
                                >
                                    <i className="fas fa-check me-1"></i>
                                    {editMode ? __('Save changes', 'dashboardng') : __('Create Widget', 'dashboardng')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default WidgetConfigModal;
