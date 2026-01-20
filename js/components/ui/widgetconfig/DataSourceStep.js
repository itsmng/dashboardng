import { html } from '../../../lib/preact.js';

export const DataSourceStep = ({ config, setConfig, datasources, fields, handleItemtypeChange }) => {
    return html`
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
};

export default DataSourceStep;
