import { __ } from './i18n.js';

export interface PeriodOption {
    value: number;
    label: string;
}

export interface ApiResponse {
    success: boolean;
    data?: unknown;
    error?: string;
    meta?: Record<string, unknown>;
}

export const CONFIG = window.DASHBOARDNG_CONFIG || {};

export const api = {
    async _request(endpoint: string, method: string, params: Record<string, unknown> = {}): Promise<ApiResponse> {
        const baseUrl = CONFIG.apiUrl || '/plugins/dashboardng/api.php';
        const url = new URL(baseUrl + endpoint, window.location.origin);

        if (method === 'GET') {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }

        const options: RequestInit = {
            method: method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
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

    async fetch(endpoint: string, params: Record<string, unknown> = {}): Promise<ApiResponse> {
        return this._request(endpoint, 'GET', params);
    },

    async post(endpoint: string, data: Record<string, unknown> = {}): Promise<ApiResponse> {
        return this._request(endpoint, 'POST', data);
    },

    async delete(endpoint: string): Promise<ApiResponse> {
        return this._request(endpoint, 'DELETE', {});
    }
};

export const PERIODS: PeriodOption[] = [
    { value: 0, label: __('All Time', 'dashboardng') },
    { value: 1, label: __('Current Year', 'dashboardng') },
    { value: 2, label: __('Current Month', 'dashboardng') },
    { value: 3, label: __('Last 7 Days', 'dashboardng') },
    { value: 4, label: __('Last 15 Days', 'dashboardng') },
    { value: 5, label: __('Last 30 Days', 'dashboardng') },
    { value: 6, label: __('Last 90 Days', 'dashboardng') },
    { value: 7, label: __('Last 180 Days', 'dashboardng') },
    { value: 8, label: __('Custom Range', 'dashboardng') },
];

export const COLORS = {
    primary: '#0d6efd',
    success: '#198754',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#0dcaf0',
    secondary: '#6c757d',
    chart: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0', '#6f42c1', '#fd7e14', '#20c997']
};
