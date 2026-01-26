import { html } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

const decodeHTMLEntities = (text) => {
    if (typeof text !== 'string') {return text;}
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const isDateField = (field) => {
    return ['datetime', 'date', 'timestamp'].includes(field?.datatype);
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
    if (!operator) {return 'equals';}
    return operatorMap[operator.toLowerCase().replace(/_/g, '')] || operator;
};

const formatDate = (date) => date.toISOString().split('T')[0];

const buildDateRangeFilter = (fieldId, start, end) => ({
    field: fieldId,
    operator: 'between',
    value: [start, end]
});

const getMonthLabel = (date) => date.toLocaleString('en-US', { month: 'short', year: 'numeric' });

const getQuarterLabel = (quarter, year) => `Q${quarter} ${year}`;

const buildTimeSeries = ({
    preset,
    count,
    dateFieldId,
    existingSeries = [],
    defaultFilterMode = 'append'
}) => {
    if (!dateFieldId) {return [];}

    const now = new Date();
    const seriesLookup = new Map(existingSeries.map(series => [series.range_key, series]));
    const nextSeries = [];

    for (let i = 0; i < count; i += 1) {
        let start;
        let end;
        let label;
        let key;

        if (preset === 'yoy') {
            const year = now.getFullYear() - i;
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31);
            label = String(year);
            key = `yoy-${year}`;
        } else if (preset === 'mom') {
            const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
            start = new Date(target.getFullYear(), target.getMonth(), 1);
            end = new Date(target.getFullYear(), target.getMonth() + 1, 0);
            label = getMonthLabel(target);
            key = `mom-${target.getFullYear()}-${target.getMonth() + 1}`;
        } else if (preset === 'qoq') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            let quarterIndex = currentQuarter - i;
            let year = now.getFullYear();
            while (quarterIndex < 0) {
                quarterIndex += 4;
                year -= 1;
            }
            const quarter = quarterIndex + 1;
            start = new Date(year, quarterIndex * 3, 1);
            end = new Date(year, quarterIndex * 3 + 3, 0);
            label = getQuarterLabel(quarter, year);
            key = `qoq-${year}-Q${quarter}`;
        } else {
            continue;
        }

        const rangeStart = formatDate(start);
        const rangeEnd = formatDate(end);
        const existing = seriesLookup.get(key);

        nextSeries.push({
            name: existing?.name || label,
            filters: [buildDateRangeFilter(dateFieldId, rangeStart, rangeEnd)],
            filter_mode: existing?.filter_mode || defaultFilterMode,
            color: existing?.color || '',
            range_key: key,
            range_start: rangeStart,
            range_end: rangeEnd,
        });
    }

    return nextSeries;
};

export const DataSourceStep = ({ config, setConfig, datasources, fields, handleItemtypeChange }) => {
    const groupByField = config.groupBy ? fields.groupable?.find(f => f.id === config.groupBy.field || f.id === config.groupBy) : undefined;
    const seriesMode = config.seriesMode || 'none';
    const seriesPreset = config.seriesPreset || 'yoy';
    const seriesCount = config.seriesCount || 2;
    const seriesList = config.series || [];
    const isDateGroup = groupByField && isDateField(groupByField);
    const palette = config.colors || ['#0d6efd'];

    const updateSeries = (index, updates) => {
        const nextSeries = [...seriesList];
        nextSeries[index] = { ...nextSeries[index], ...updates };
        setConfig({ ...config, series: nextSeries });
    };

    const addSeries = (series) => {
        setConfig({ ...config, series: [...seriesList, series] });
    };

    const removeSeries = (index) => {
        setConfig({ ...config, series: seriesList.filter((_, i) => i !== index) });
    };

    const updateSeriesFilter = (seriesIndex, filterIndex, updates) => {
        const nextSeries = [...seriesList];
        const series = { ...nextSeries[seriesIndex] };
        const filters = [...(series.filters || [])];
        filters[filterIndex] = { ...filters[filterIndex], ...updates };
        series.filters = filters;
        nextSeries[seriesIndex] = series;
        setConfig({ ...config, series: nextSeries });
    };

    const addSeriesFilter = (seriesIndex) => {
        const nextSeries = [...seriesList];
        const series = { ...nextSeries[seriesIndex] };
        const filters = [...(series.filters || [])];
        filters.push({ field: undefined, operator: 'equals', value: '', link: filters.length ? 'AND' : undefined });
        series.filters = filters;
        nextSeries[seriesIndex] = series;
        setConfig({ ...config, series: nextSeries });
    };

    const removeSeriesFilter = (seriesIndex, filterIndex) => {
        const nextSeries = [...seriesList];
        const series = { ...nextSeries[seriesIndex] };
        const filters = [...(series.filters || [])];
        filters.splice(filterIndex, 1);
        series.filters = filters;
        nextSeries[seriesIndex] = series;
        setConfig({ ...config, series: nextSeries });
    };

    const updateCustomRange = (seriesIndex, updates) => {
        const nextSeries = [...seriesList];
        const series = { ...nextSeries[seriesIndex], ...updates };
        const start = series.range_start;
        const end = series.range_end;

        if (start && end && groupByField?.id) {
            series.filters = [buildDateRangeFilter(groupByField.id, start, end)];
        } else {
            series.filters = [];
        }

        nextSeries[seriesIndex] = series;
        setConfig({ ...config, series: nextSeries });
    };

    const updateSeriesMode = (mode) => {
        if (mode === 'none') {
            setConfig({ ...config, seriesMode: 'none', series: [] });
            return;
        }

        if (mode === 'time') {
            const nextSeries = seriesPreset === 'custom' || !isDateGroup
                ? seriesList
                : buildTimeSeries({
                    preset: seriesPreset,
                    count: seriesCount,
                    dateFieldId: groupByField?.id,
                    existingSeries: seriesList
                });
            setConfig({
                ...config,
                seriesMode: 'time',
                seriesPreset,
                seriesCount,
                series: nextSeries
            });
            return;
        }

        const nextSeries = seriesList.length
            ? seriesList
            : [{ name: '', filters: [{ field: undefined, operator: 'equals', value: '', link: 'AND' }], filter_mode: 'append', color: '' }];
        setConfig({ ...config, seriesMode: 'filters', series: nextSeries });
    };

    const regenerateTimeSeries = (preset, count) => {
        const nextSeries = isDateGroup
            ? buildTimeSeries({
                preset,
                count,
                dateFieldId: groupByField?.id,
                existingSeries: seriesList
            })
            : [];

        setConfig({
            ...config,
            seriesMode: 'time',
            seriesPreset: preset,
            seriesCount: count,
            series: nextSeries
        });
    };

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
                        value=${config.groupBy?.field || config.groupBy || ''}
                        onChange=${(e) => {
                            const fieldValue = e.target.value ? parseInt(e.target.value) : undefined;
                            const selectedField = fields.groupable?.find(field => field.id === fieldValue);
                            const nextConfig = {
                                ...config,
                                groupBy: fieldValue ? { field: fieldValue, interval: undefined } : undefined
                            };

                            if (seriesMode === 'time') {
                                if (fieldValue && selectedField && isDateField(selectedField)) {
                                    nextConfig.series = seriesPreset === 'custom'
                                        ? seriesList
                                        : buildTimeSeries({
                                            preset: seriesPreset,
                                            count: seriesCount,
                                            dateFieldId: fieldValue,
                                            existingSeries: seriesList
                                        });
                                } else {
                                    nextConfig.series = [];
                                }
                            }

                            setConfig(nextConfig);
                        }}
                    >
                        <option value="">${__('-- No grouping --', 'dashboardng')}</option>
                        ${fields.groupable.map(field => html`
                            <option value=${field.id}>${decodeHTMLEntities(field.name)}</option>
                        `)}
                    </select>
                </div>
            `}

            ${config.groupBy && groupByField && isDateField(groupByField) && html`
                <div class="mb-3">
                    <label class="form-label">${__('Date Interval', 'dashboardng')}</label>
                    <select
                        class="form-select"
                        value=${config.groupBy.interval || ''}
                        onChange=${(e) => setConfig({
                            ...config,
                            groupBy: { ...config.groupBy, interval: e.target.value || undefined }
                        })}
                    >
                        <option value="">${__('-- No interval --', 'dashboardng')}</option>
                        <option value="day">${__('Day', 'dashboardng')}</option>
                        <option value="week">${__('Week', 'dashboardng')}</option>
                        <option value="month">${__('Month', 'dashboardng')}</option>
                        <option value="year">${__('Year', 'dashboardng')}</option>
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
                                        aggregation: { ...config.aggregation, field: e.target.value ? parseInt(e.target.value) : undefined }
                                    })}
                                >
                                    <option value="">${__('-- Select field --', 'dashboardng')}</option>
                                    ${fields.aggregatable.map(field => html`
                                        <option value=${field.id}>${decodeHTMLEntities(field.name)}</option>
                                    `)}
                                </select>
                            </div>
                        `}
                    </div>
                </div>
            `}

            ${config.itemtype && html`
                <div class="mb-3">
                    <label class="form-label">${__('Sort by', 'dashboardng')} (${__('optional', 'dashboardng')})</label>
                    <div class="row">
                        <div class="col-8">
                            <select
                                class="form-select"
                                value=${config.orderBy?.field || ''}
                                onChange=${(e) => setConfig({
                                    ...config,
                                    orderBy: { ...config.orderBy, field: e.target.value ? parseInt(e.target.value) : undefined }
                                })}
                            >
                                <option value="">${__('-- Default sorting --', 'dashboardng')}</option>
                                ${fields.fields?.map(field => html`
                                    <option value=${field.id}>${decodeHTMLEntities(field.name)}</option>
                                `)}
                            </select>
                        </div>
                        <div class="col-4">
                            <select
                                class="form-select"
                                value=${config.orderBy?.direction || 'DESC'}
                                onChange=${(e) => setConfig({
                                    ...config,
                                    orderBy: { ...config.orderBy, direction: e.target.value }
                                })}
                            >
                                <option value="DESC">${__('Descending', 'dashboardng')}</option>
                                <option value="ASC">${__('Ascending', 'dashboardng')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            `}

            ${config.visualization === 'table' && config.itemtype && fields.fields?.length > 0 && html`
                <div class="mb-3">
                    <label class="form-label">${__('Columns', 'dashboardng')}</label>
                    <small class="text-muted d-block mb-2">${__('Select which columns to display', 'dashboardng')}</small>
                    <div class="p-2 border rounded" style="max-height: 200px; overflow-y: auto;">
                        ${fields.fields.map(field => html`
                            <div class="form-check">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id=${`col-${field.id}`}
                                    checked=${(config.outputFields || []).includes(field.id)}
                                    onChange=${(e) => {
                                        const currentColumns = config.outputFields || [];
                                        const newColumns = e.target.checked
                                            ? [...currentColumns, field.id]
                                            : currentColumns.filter(id => id !== field.id);
                                        setConfig({ ...config, outputFields: newColumns });
                                    }}
                                />
                                <label class="form-check-label" for=${`col-${field.id}`}>
                                    ${decodeHTMLEntities(field.name)}
                                </label>
                            </div>
                        `)}
                    </div>
                </div>
            `}

            ${config.visualization === 'chart' && config.itemtype && html`
                <div class="mb-3">
                    <label class="form-label">${__('Series comparison', 'dashboardng')}</label>
                    <small class="text-muted d-block mb-2">${__('Compare time periods or filtered segments', 'dashboardng')}</small>

                    ${!config.groupBy && html`
                        <div class="alert alert-info py-2">
                            ${__('Select a group by field to enable comparisons.', 'dashboardng')}
                        </div>
                    `}

                    ${config.groupBy && html`
                        <div class="row g-2 mb-3">
                            <div class="col-md-5">
                                <label class="form-label small">${__('Mode', 'dashboardng')}</label>
                                <select
                                    class="form-select form-select-sm"
                                    value=${seriesMode}
                                    onChange=${(e) => updateSeriesMode(e.target.value)}
                                >
                                    <option value="none">${__('Single series', 'dashboardng')}</option>
                                    <option value="time">${__('Time-based comparison', 'dashboardng')}</option>
                                    <option value="filters">${__('Filter-based comparison', 'dashboardng')}</option>
                                </select>
                            </div>
                            ${seriesMode === 'time' && html`
                                <div class="col-md-4">
                                    <label class="form-label small">${__('Preset', 'dashboardng')}</label>
                                    <select
                                        class="form-select form-select-sm"
                                        value=${seriesPreset}
                                        onChange=${(e) => {
                                            const preset = e.target.value;
                                            if (preset === 'custom') {
                                                setConfig({ ...config, seriesPreset: preset, seriesMode: 'time' });
                                            } else {
                                                regenerateTimeSeries(preset, seriesCount);
                                            }
                                        }}
                                    >
                                        <option value="yoy">${__('Year over year', 'dashboardng')}</option>
                                        <option value="mom">${__('Month over month', 'dashboardng')}</option>
                                        <option value="qoq">${__('Quarter over quarter', 'dashboardng')}</option>
                                        <option value="custom">${__('Custom ranges', 'dashboardng')}</option>
                                    </select>
                                </div>
                                ${seriesPreset !== 'custom' && html`
                                    <div class="col-md-3">
                                        <label class="form-label small">${__('Periods', 'dashboardng')}</label>
                                        <input
                                            type="number"
                                            class="form-control form-control-sm"
                                            min="2"
                                            max="12"
                                            value=${seriesCount}
                                            onInput=${(e) => regenerateTimeSeries(seriesPreset, Math.max(2, parseInt(e.target.value) || 2))}
                                        />
                                    </div>
                                `}
                            `}
                        </div>

                        ${seriesMode === 'time' && !isDateGroup && html`
                            <div class="alert alert-warning py-2">
                                ${__('Time comparisons require a date-based group by field.', 'dashboardng')}
                            </div>
                        `}

                        ${seriesMode === 'time' && isDateGroup && seriesPreset !== 'custom' && html`
                            ${(seriesList || []).map((series, index) => html`
                                <div class="card mb-2" key=${index}>
                                    <div class="card-body p-2">
                                        <div class="row g-2 align-items-center">
                                            <div class="col-md-4">
                                                <input
                                                    type="text"
                                                    class="form-control form-control-sm"
                                                    value=${series.name || ''}
                                                    onInput=${(e) => updateSeries(index, { name: e.target.value })}
                                                    placeholder=${__('Series name', 'dashboardng')}
                                                />
                                            </div>
                                            <div class="col-md-3">
                                                <select
                                                    class="form-select form-select-sm"
                                                    value=${series.filter_mode || 'append'}
                                                    onChange=${(e) => updateSeries(index, { filter_mode: e.target.value })}
                                                >
                                                    <option value="append">${__('Add to base filters', 'dashboardng')}</option>
                                                    <option value="replace">${__('Replace base filters', 'dashboardng')}</option>
                                                </select>
                                            </div>
                                            <div class="col-md-3">
                                                <input
                                                    type="color"
                                                    class="form-control form-control-color form-control-sm"
                                                    value=${series.color || palette[index % palette.length] || '#0d6efd'}
                                                    onInput=${(e) => updateSeries(index, { color: e.target.value })}
                                                    title=${__('Series color', 'dashboardng')}
                                                />
                                            </div>
                                            <div class="col-md-2 text-end">
                                                <button
                                                    class="btn btn-outline-secondary btn-sm"
                                                    onClick=${() => updateSeries(index, { color: '' })}
                                                >
                                                    ${__('Use palette', 'dashboardng')}
                                                </button>
                                            </div>
                                        </div>
                                        ${series.range_start && series.range_end && html`
                                            <div class="text-muted mt-2">
                                                ${series.range_start} → ${series.range_end}
                                            </div>
                                        `}
                                    </div>
                                </div>
                            `)}
                        `}

                        ${seriesMode === 'time' && isDateGroup && seriesPreset === 'custom' && html`
                            ${(seriesList || []).map((series, index) => html`
                                <div class="card mb-2" key=${index}>
                                    <div class="card-body p-2">
                                        <div class="row g-2 align-items-center">
                                            <div class="col-md-3">
                                                <input
                                                    type="text"
                                                    class="form-control form-control-sm"
                                                    value=${series.name || ''}
                                                    onInput=${(e) => updateSeries(index, { name: e.target.value })}
                                                    placeholder=${__('Series name', 'dashboardng')}
                                                />
                                            </div>
                                            <div class="col-md-3">
                                                <input
                                                    type="date"
                                                    class="form-control form-control-sm"
                                                    value=${series.range_start || ''}
                                                    onInput=${(e) => updateCustomRange(index, { range_start: e.target.value })}
                                                />
                                            </div>
                                            <div class="col-md-3">
                                                <input
                                                    type="date"
                                                    class="form-control form-control-sm"
                                                    value=${series.range_end || ''}
                                                    onInput=${(e) => updateCustomRange(index, { range_end: e.target.value })}
                                                />
                                            </div>
                                            <div class="col-md-2">
                                                <select
                                                    class="form-select form-select-sm"
                                                    value=${series.filter_mode || 'append'}
                                                    onChange=${(e) => updateSeries(index, { filter_mode: e.target.value })}
                                                >
                                                    <option value="append">${__('Add to base filters', 'dashboardng')}</option>
                                                    <option value="replace">${__('Replace base filters', 'dashboardng')}</option>
                                                </select>
                                            </div>
                                            <div class="col-md-1">
                                                <button
                                                    class="btn btn-outline-danger btn-sm w-100"
                                                    onClick=${() => removeSeries(index)}
                                                >
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="row g-2 align-items-center mt-2">
                                            <div class="col-md-3">
                                                <input
                                                    type="color"
                                                    class="form-control form-control-color form-control-sm"
                                                    value=${series.color || palette[index % palette.length] || '#0d6efd'}
                                                    onInput=${(e) => updateSeries(index, { color: e.target.value })}
                                                    title=${__('Series color', 'dashboardng')}
                                                />
                                            </div>
                                            <div class="col-md-3">
                                                <button
                                                    class="btn btn-outline-secondary btn-sm"
                                                    onClick=${() => updateSeries(index, { color: '' })}
                                                >
                                                    ${__('Use palette', 'dashboardng')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `)}
                            <button
                                class="btn btn-outline-primary btn-sm"
                                onClick=${() => addSeries({
                                    name: '',
                                    range_start: '',
                                    range_end: '',
                                    filters: [],
                                    filter_mode: 'append',
                                    color: ''
                                })}
                            >
                                <i class="fas fa-plus me-1"></i>
                                ${__('Add range', 'dashboardng')}
                            </button>
                        `}

                        ${seriesMode === 'filters' && html`
                            ${(seriesList || []).map((series, index) => html`
                                <div class="card mb-2" key=${index}>
                                    <div class="card-body p-2">
                                        <div class="row g-2 align-items-center">
                                            <div class="col-md-4">
                                                <input
                                                    type="text"
                                                    class="form-control form-control-sm"
                                                    value=${series.name || ''}
                                                    onInput=${(e) => updateSeries(index, { name: e.target.value })}
                                                    placeholder=${__('Series name', 'dashboardng')}
                                                />
                                            </div>
                                            <div class="col-md-3">
                                                <select
                                                    class="form-select form-select-sm"
                                                    value=${series.filter_mode || 'append'}
                                                    onChange=${(e) => updateSeries(index, { filter_mode: e.target.value })}
                                                >
                                                    <option value="append">${__('Add to base filters', 'dashboardng')}</option>
                                                    <option value="replace">${__('Replace base filters', 'dashboardng')}</option>
                                                </select>
                                            </div>
                                            <div class="col-md-3">
                                                <input
                                                    type="color"
                                                    class="form-control form-control-color form-control-sm"
                                                    value=${series.color || palette[index % palette.length] || '#0d6efd'}
                                                    onInput=${(e) => updateSeries(index, { color: e.target.value })}
                                                    title=${__('Series color', 'dashboardng')}
                                                />
                                            </div>
                                            <div class="col-md-2 d-flex justify-content-end">
                                                <button
                                                    class="btn btn-outline-secondary btn-sm me-2"
                                                    onClick=${() => updateSeries(index, { color: '' })}
                                                >
                                                    ${__('Use palette', 'dashboardng')}
                                                </button>
                                                <button
                                                    class="btn btn-outline-danger btn-sm"
                                                    onClick=${() => removeSeries(index)}
                                                >
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        </div>

                                        ${(series.filters || []).map((filter, filterIndex) => html`
                                            <div class="filter-row mt-2" key=${filterIndex}>
                                                <div class="card-body p-2">
                                                    <div class="row g-2 align-items-center">
                                                        ${filterIndex > 0 && html`
                                                            <div class="col-auto">
                                                                <select
                                                                    class="form-select form-select-sm"
                                                                    value=${filter.link || 'AND'}
                                                                    onChange=${(e) => updateSeriesFilter(index, filterIndex, { link: e.target.value })}
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
                                                                onChange=${(e) => updateSeriesFilter(index, filterIndex, {
                                                                    field: e.target.value ? parseInt(e.target.value) : undefined
                                                                })}
                                                            >
                                                                <option value="">${__('-- Field --', 'dashboardng')}</option>
                                                                ${fields.fields?.map(field => html`
                                                                    <option value=${field.id}>${decodeHTMLEntities(field.name)}</option>
                                                                `)}
                                                            </select>
                                                        </div>
                                                        <div class="col-auto">
                                                            <select
                                                                class="form-select form-select-sm"
                                                                value=${normalizeOperator(filter.operator)}
                                                                onChange=${(e) => updateSeriesFilter(index, filterIndex, { operator: e.target.value })}
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
                                                                onInput=${(e) => updateSeriesFilter(index, filterIndex, { value: e.target.value })}
                                                                placeholder=${__('Value...', 'dashboardng')}
                                                                disabled=${normalizeOperator(filter.operator) === 'is_null' || normalizeOperator(filter.operator) === 'is_not_null'}
                                                            />
                                                        </div>
                                                        <div class="col-auto">
                                                            <button
                                                                class="btn btn-outline-danger btn-sm"
                                                                onClick=${() => removeSeriesFilter(index, filterIndex)}
                                                            >
                                                                <i class="fas fa-times"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `)}

                                        <button
                                            class="btn btn-outline-primary btn-sm mt-2"
                                            onClick=${() => addSeriesFilter(index)}
                                        >
                                            <i class="fas fa-plus me-1"></i>
                                            ${__('Add filter', 'dashboardng')}
                                        </button>
                                    </div>
                                </div>
                            `)}
                            <button
                                class="btn btn-outline-primary btn-sm"
                                onClick=${() => addSeries({
                                    name: '',
                                    filters: [{ field: undefined, operator: 'equals', value: '', link: 'AND' }],
                                    filter_mode: 'append',
                                    color: ''
                                })}
                            >
                                <i class="fas fa-plus me-1"></i>
                                ${__('Add series', 'dashboardng')}
                            </button>
                        `}
                    `}
                </div>
            `}
        </div>
    `;
};

export default DataSourceStep;
