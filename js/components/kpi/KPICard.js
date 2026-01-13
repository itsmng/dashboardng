import { html } from '../../lib/preact.js';

/**
 * KPI Card component
 * Displays a key performance indicator with optional trend indicator
 *
 * @component
 * @param {Object} props
 * @param {string} props.title - KPI label
 * @param {number|null} props.value - KPI numeric value
 * @param {string} props.icon - Font Awesome icon class (e.g., 'fa-ticket-alt')
 * @param {string} [props.color='primary'] - Bootstrap color name
 * @param {boolean} [props.loading=false] - Whether data is loading
 * @param {number|null} [props.trend] - Trend percentage (positive=up, negative=down)
 * @returns {import('preact').VNode} Rendered KPI card
 */
export const KPICard = ({ title, value, icon, color = 'primary', loading = false, trend = null }) => {
    return html`
        <div class="card kpi-card h-100 border-0 shadow-sm kpi-${color}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="d-flex align-items-center gap-2 min-width-0">
                        <div class="kpi-icon">
                            <i class="fas ${icon} text-${color}"></i>
                        </div>
                        <p class="kpi-title text-muted small mb-0">${title}</p>
                    </div>
                    ${trend !== null && html`
                        <small class="text-${trend >= 0 ? 'success' : 'danger'}">
                            <i class="fas fa-arrow-${trend >= 0 ? 'up' : 'down'} me-1"></i>
                            ${Math.abs(trend)}%
                        </small>
                    `}
                </div>
                ${loading
                    ? html`<div class="placeholder-glow"><span class="placeholder col-6"></span></div>`
                    : html`<h3 class="mb-0 fw-bold text-${color}">${value?.toLocaleString() ?? '-'}</h3>`
                }
            </div>
        </div>
    `;
};

export default KPICard;
