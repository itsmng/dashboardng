import { h } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

interface Filter {
    field?: number;
    operator?: string;
    value?: string;
    link?: string;
}

interface FiltersStepProps {
    config: {
        filters: Filter[];
        limit: number;
    };
    setConfig: (config: any) => void;
    fields: {
        fields?: Array<{ id: number; name: string }>;
    };
    addFilter: () => void;
    updateFilter: (index: number, updates: Partial<Filter>) => void;
    removeFilter: (index: number) => void;
}

const decodeHTMLEntities = (text: string) => {
    if (typeof text !== 'string') {return text;}
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const operatorMap: Record<string, string> = {
    'equals': 'equals',
    'notequals': 'not_equals',
    'not_equals': 'not_equals',
    'contains': 'contains',
    'notcontains': 'not_contains',
    'not_contains': 'not_contains',
    'greaterthan': 'greater_than',
    'greater_than': 'greater_than',
    'lessthan': 'less_than',
    'less_than': 'less_than',
    'isnull': 'is_null',
    'is_null': 'is_null',
    'isnotnull': 'is_not_null',
    'is_not_null': 'is_not_null'
};

const normalizeOperator = (operator: string) => {
    if (!operator) {return 'equals';}
    return operatorMap[operator.toLowerCase().replace('_', '')] || operator;
};

export const FiltersStep = ({ config, setConfig, fields, addFilter, updateFilter, removeFilter }: FiltersStepProps) => {
    return (
        <div className="step-content">
            <h5 className="mb-3">{__('Configure Filters', 'dashboardng')}</h5>
            
            {config.filters.map((filter, index) => (
                <div className="filter-row mb-2" key={index}>
                    <div className="card-body p-2">
                        <div className="row g-2 align-items-center">
                            {index > 0 && (
                                <div className="col-auto">
                                    <select
                                        className="form-select form-select-sm"
                                        value={filter.link || 'AND'}
                                        onChange={(e) => updateFilter(index, { link: (e.target as HTMLSelectElement).value })}
                                    >
                                        <option value="AND">AND</option>
                                        <option value="OR">OR</option>
                                    </select>
                                </div>
                            )}
                            <div className="col">
                                <select
                                    className="form-select form-select-sm"
                                    value={filter.field || ''}
                                    onChange={(e) => updateFilter(index, { field: parseInt((e.target as HTMLSelectElement).value) })}
                                >
                                    <option value="">{__('-- Field --', 'dashboardng')}</option>
                                    {fields.fields?.map(f => (
                                        <option key={f.id} value={f.id}>{decodeHTMLEntities(f.name)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-auto">
                                <select
                                    className="form-select form-select-sm"
                                    value={normalizeOperator(filter.operator || '')}
                                    onChange={(e) => updateFilter(index, { operator: (e.target as HTMLSelectElement).value })}
                                >
                                    <option value="equals">=</option>
                                    <option value="not_equals">≠</option>
                                    <option value="contains">{__('Contains', 'dashboardng')}</option>
                                    <option value="not_contains">{__('Does not contain', 'dashboardng')}</option>
                                    <option value="greater_than">&gt;</option>
                                    <option value="less_than">&lt;</option>
                                    <option value="is_null">{__('Is empty', 'dashboardng')}</option>
                                    <option value="is_not_null">{__('Is not empty', 'dashboardng')}</option>
                                </select>
                            </div>
                            <div className="col">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={filter.value || ''}
                                    onInput={(e) => updateFilter(index, { value: (e.target as HTMLInputElement).value })}
                                    placeholder={__('Value...', 'dashboardng')}
                                    disabled={normalizeOperator(filter.operator || '') === 'is_null' || normalizeOperator(filter.operator || '') === 'is_not_null'}
                                />
                            </div>
                            <div className="col-auto">
                                <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => removeFilter(index)}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <button className="btn btn-outline-primary btn-sm" onClick={addFilter}>
                <i className="fas fa-plus me-1"></i>
                {__('Add filter', 'dashboardng')}
            </button>

            <div className="mt-4">
                <label className="form-label">{__('Limit', 'dashboardng')}</label>
                <input
                    type="number"
                    className="form-control"
                    value={config.limit}
                    onInput={(e) => setConfig({ ...config, limit: parseInt((e.target as HTMLInputElement).value) || 100 })}
                    min="1"
                    max="10000"
                />
            </div>
        </div>
    );
};

export default FiltersStep;
