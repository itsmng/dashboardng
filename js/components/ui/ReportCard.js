import { html } from '../../lib/preact.js';
import { __ } from '../../lib/i18n.js';

/**
 * Shared Report Card Component
 * Displays a card with title, settings button, and content
 *
 * @component
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {import('preact').ComponentChildren} props.children - Card content
 * @param {boolean} [props.loading=false] - Whether content is loading
 * @param {string} [props.error=null] - Error message if any
 * @param {function(): void} [props.onRetry] - Callback for retry action
 * @param {import('preact').ComponentChildren} [props.toolbar] - Additional toolbar content
 * @param {function(): void} [props.onSettingsClick] - Callback when settings button is clicked
 * @returns {import('preact').VNode} Rendered report card
 */
export const ReportCard = ({ title, children, loading = false, error = undefined, onRetry, toolbar, onSettingsClick }) => {
    return html`
        <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0">${title}</h5>
                <div class="d-flex align-items-center gap-2">
                    ${onSettingsClick && html`
                        <button
                            class="btn btn-link btn-sm p-0"
                            onClick=${onSettingsClick}
                            title=${__('Settings', 'dashboardng')}
                            style="color: #6c757d;"
                        >
                            <i class="fas fa-cog"></i>
                        </button>
                    `}
                    ${toolbar && html`<div class="card-toolbar">${toolbar}</div>`}
                </div>
            </div>
            <div class="card-body">
                ${loading && html`
                    <div class="d-flex justify-content-center align-items-center p-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">${__('Loading...', 'dashboardng')}</span>
                        </div>
                    </div>
                `}
                ${error && html`
                    <div class="alert alert-danger d-flex align-items-center" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <div class="flex-grow-1">${error}</div>
                        ${onRetry && html`
                            <button class="btn btn-sm btn-outline-danger ms-2" onClick=${onRetry}>
                                <i class="fas fa-refresh me-1"></i>${__('Retry', 'dashboardng')}
                            </button>
                        `}
                    </div>
                `}
                ${!loading && !error && children}
            </div>
        </div>
    `;
};

export default ReportCard;
