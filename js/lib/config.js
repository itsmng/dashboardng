/**
 * Global configuration object from window.DASHBOARDNG_CONFIG
 * @type {Object}
 * @property {string} [apiUrl] - Base API URL
 * @property {number} [userId] - Current user ID
 * @property {string} [ticketUrl] - URL to ticket forms
 */
export const CONFIG = window.DASHBOARDNG_CONFIG || {};

/**
 * API utility object for making HTTP requests
 * @namespace
 */
export const api = {
    /**
     * Make an HTTP request to the API
     * @param {string} endpoint - API endpoint path
     * @param {Object} [params={}] - Query parameters or request body
     * @param {string} [method='GET'] - HTTP method
     * @returns {Promise<ApiResponse>} Response data with success flag
     * @throws {Error} If HTTP response is not OK
     */
    async fetch(endpoint, params = {}, method = 'GET') {
        const url = new URL(CONFIG.apiUrl + endpoint, window.location.origin);

        if (method === 'GET') {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value);
                }
            });
        }

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        };

        if (method !== 'GET' && Object.keys(params).length > 0) {
            options.body = JSON.stringify(params);
        }

        const response = await fetch(url.toString(), options);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    },

    /**
     * Make a POST request to the API
     * @param {string} endpoint - API endpoint path
     * @param {Object} [data={}] - Request body data
     * @returns {Promise<ApiResponse>} Response data with success flag
     * @throws {Error} If HTTP response is not OK
     */
    async post(endpoint, data = {}) {
        const response = await fetch(CONFIG.apiUrl + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    },

    /**
     * Make a DELETE request to the API
     * @param {string} endpoint - API endpoint path
     * @returns {Promise<ApiResponse>} Response data with success flag
     * @throws {Error} If HTTP response is not OK
     */
    async delete(endpoint) {
        const response = await fetch(CONFIG.apiUrl + endpoint, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }
};

/**
 * Available time period options for filtering data
 * @type {PeriodOption[]}
 */
export const PERIODS = [
    { value: 0, label: __('All Time', 'dashboardng') },
    { value: 1, label: __('Current Year', 'dashboardng') },
    { value: 2, label: __('Current Month', 'dashboardng') },
    { value: 3, label: __('Last Week', 'dashboardng') },
    { value: 4, label: __('Last 15 Days', 'dashboardng') },
    { value: 5, label: __('Last 30 Days', 'dashboardng') },
    { value: 6, label: __('Last 90 Days', 'dashboardng') },
    { value: 7, label: __('Last 180 Days', 'dashboardng') },
];

/**
 * Color palette for charts and UI elements
 * @type {Object}
 * @property {string} primary - Primary blue color
 * @property {string} success - Success green color
 * @property {string} warning - Warning yellow color
 * @property {string} danger - Danger red color
 * @property {string} info - Info cyan color
 * @property {string} secondary - Secondary gray color
 * @property {string[]} chart - Array of chart colors
 */
export const COLORS = {
    primary: '#0d6efd',
    success: '#198754',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#0dcaf0',
    secondary: '#6c757d',
    chart: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0', '#6f42c1', '#fd7e14', '#20c997']
};

/**
 * @typedef {Object} PeriodOption
 * @property {number} value - Period identifier (0-7)
 * @property {string} label - Human-readable period label
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {*} [data] - Response data payload
 * @property {string} [error] - Error message if request failed
 * @property {Object} [meta] - Additional metadata
 */
