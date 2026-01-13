import { html } from '../../lib/preact.js';

/**
 * Chart Card component
 * Displays a chart in a card container with optional loading state
 *
 * @component
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {import('preact').ComponentChildren} props.children - Chart content
 * @param {boolean} [props.loading=false] - Whether data is loading
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {import('preact').VNode} Rendered chart card
 */
export const ChartCard = ({ title, children, loading = false, className = '' }) => {
    return html`
        <div class="card border-0 shadow-sm h-100 ${className}">
            <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
                <h6 class="mb-0 fw-semibold">${title}</h6>
                ${loading && html`
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">${__('Loading...', 'dashboardng')}</span>
                    </div>
                `}
            </div>
            <div class="card-body pt-0">
                ${children}
            </div>
        </div>
    `;
};

export default ChartCard;
