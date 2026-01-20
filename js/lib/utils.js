/**
 * Shared utility functions for DashboardNG widgets
 * @module utils
 */

/**
 * Process dynamic filter values by replacing placeholder strings with actual values
 * Replaces date/time placeholders with current date and user ID placeholders
 *
 * @param {FilterConfig[]} filters - Array of filter configurations
 * @param {number} period - Current period value
 * @returns {FilterConfig[]} Processed filters with resolved values
 */
export const processFilters = (filters, period) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const thisYear = `${now.getFullYear()}-01-01`;
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return filters.map(filter => {
        let value = filter.value;

        if (typeof value === 'string') {
            value = value
                .replace('$$NOW$$', now.toISOString())
                .replace('$$TODAY$$', today)
                .replace('$$YESTERDAY$$', yesterday)
                .replace('$$TODAY-1DAY$$', yesterday)
                .replace('$$TODAY-7DAY$$', lastWeek)
                .replace('$$TODAY-30DAY$$', thirtyDaysAgo)
                .replace('$$LASTWEEK$$', lastWeek)
                .replace('$$THISMONTH$$', thisMonth)
                .replace('$$THISYEAR$$', thisYear)
                .replace('$$MYSELF$$', String(window.DASHBOARDNG_CONFIG?.userId || 0));
        }

        return { ...filter, value };
    });
};

/**
 * Extract date range from filters for time-series gap filling.
 *
 * @param {FilterConfig[]} filters - Array of filter configurations
 * @param {Object|null} groupBy - Grouping configuration
 * @returns {Object|null} Date range object
 */
export const extractDateRange = (filters, groupBy) => {
    if (!groupBy || typeof groupBy !== 'object' || !groupBy.interval) {
        return null;
    }

    const groupField = groupBy.field;
    let startDate = null;
    let endDate = null;

    for (const filter of filters) {
        if (filter.field !== groupField) continue;

        const searchType = filter.searchtype || filter.operator;
        const value = filter.value;

        if (!value) continue;

        const dateValue = value.split(' ')[0];

        if (['morethan', 'greater_or_equal', 'greater_than'].includes(searchType)) {
            if (!startDate || dateValue > startDate) {
                startDate = dateValue;
            }
        } else if (['lessthan', 'less_or_equal', 'less_than'].includes(searchType)) {
            if (!endDate || dateValue < endDate) {
                endDate = dateValue;
            }
        }
    }

    if (startDate && !endDate) {
        endDate = new Date().toISOString().split('T')[0];
    }

    if (startDate && endDate) {
        return {
            start: startDate,
            end: endDate,
            interval: groupBy.interval,
            field: groupField,
        };
    }

    return null;
};

/**
 * @typedef {Object} FilterConfig
 * @property {string|number} field - Field ID to filter on
 * @property {string} operator - Comparison operator ('equals', 'contains', 'greater_than', 'less_than', 'is_null', 'is_not_null')
 * @property {string|number} value - Filter value
 * @property {string} [link] - Logical link ('AND' or 'OR')
 */
