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
    const formatDate = (date) => date.toISOString().split('T')[0];
    const shiftDays = (days) => {
        const date = new Date(now);
        date.setDate(date.getDate() + days);
        return formatDate(date);
    };
    const shiftMonths = (months) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() + months);
        return formatDate(date);
    };

    const today = formatDate(now);
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const thisYear = `${now.getFullYear()}-01-01`;
    const yesterday = shiftDays(-1);
    const thirtyDaysAgo = shiftDays(-30);
    const lastWeek = shiftDays(-7);
    const lastSixMonths = shiftMonths(-6);

    return filters.map(filter => {
        let {value} = filter;

        if (typeof value === 'string') {
            value = value
                .replace('$$NOW$$', now.toISOString())
                .replace('$$TODAY$$', today)
                .replace('$$YESTERDAY$$', yesterday)
                .replace('$$TODAY-1DAY$$', yesterday)
                .replace('$$TODAY-7DAY$$', lastWeek)
                .replace('$$TODAY-30DAY$$', thirtyDaysAgo)
                .replace('$$LASTWEEK$$', lastWeek)
                .replace('$$LAST6MONTH$$', lastSixMonths)
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
        return ;
    }

    const groupField = groupBy.field;
    let startDate;
    let endDate;

    for (const filter of filters) {
        if (filter.field !== groupField) {continue;}

        const searchType = filter.searchtype || filter.operator;
        const {value} = filter;

        if (!value) {continue;}

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

    return ;
};

/**
 * @typedef {Object} FilterConfig
 * @property {string|number} field - Field ID to filter on
 * @property {string} operator - Comparison operator ('equals', 'contains', 'greater_than', 'less_than', 'is_null', 'is_not_null')
 * @property {string|number} value - Filter value
 * @property {string} [link] - Logical link ('AND' or 'OR')
 */
