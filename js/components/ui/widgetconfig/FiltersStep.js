import { html } from '../../../lib/preact.js';

const decodeHTMLEntities = (text) => {
    if (typeof text !== 'string') return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const operatorMap = {
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

const normalizeOperator = (operator) => {
    if (!operator) return 'equals';
    return operatorMap[operator.toLowerCase().replace('_', '')] || operator;
};

export const FiltersStep = ({ config, setConfig, fields, addFilter, updateFilter, removeFilter }) => {
    return html`
        <div class="step-content">
            <h5 class="mb-3">${__('Configure Filters', 'dashboardng')}</h5>
            
            ${config.filters.map((filter, index) => html`
                <div class="filter-row mb-2" key=${index}>
                    <div class="card-body p-2">
                        <div class="row g-2 align-items-center">
                            ${index > 0 && html`
                                <div class="col-auto">
                                    <select
                                        class="form-select form-select-sm"
                                        value=${filter.link || 'AND'}
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
                                    value=${filter.field || ''}
                                    onChange=${(e) => updateFilter(index, { field: parseInt(e.target.value) })}
                                >
                                    <option value="">${__('-- Field --', 'dashboardng')}</option>
                                    ${fields.fields?.map(f => html`<option value=${f.id}>${decodeHTMLEntities(f.name)}</option>`)}
                                </select>
                            </div>
                            <div class="col-auto">
                                <select
                                    class="form-select form-select-sm"
                                    value=${normalizeOperator(filter.operator)}
                                    onChange=${(e) => updateFilter(index, { operator: e.target.value })}
                                >
                                    <option value="equals">=</option>
                                    <option value="not_equals">≠</option>
                                    <option value="contains">${__('Contains', 'dashboardng')}</option>
                                    <option value="not_contains">${__('Does not contain', 'dashboardng')}</option>
                                    <option value="greater_than">&gt;</option>
                                    <option value="less_than">&lt;</option>
                                    <option value="is_null">${__('Is empty', 'dashboardng')}</option>
                                    <option value="is_not_null">${__('Is not empty', 'dashboardng')}</option>
                                </select>
                            </div>
                            <div class="col">
                                <input
                                    type="text"
                                    class="form-control form-control-sm"
                                    value=${filter.value || ''}
                                    onInput=${(e) => updateFilter(index, { value: e.target.value })}
                                    placeholder=${__('Value...', 'dashboardng')}
                                    disabled=${normalizeOperator(filter.operator) === 'is_null' || normalizeOperator(filter.operator) === 'is_not_null'}
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
};

export default FiltersStep;
