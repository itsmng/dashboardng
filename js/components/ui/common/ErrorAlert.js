import { html } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

export const ErrorAlert = ({ message, onRetry }) => {
  return html`
    <div class="alert alert-danger d-flex align-items-center" role="alert">
      <i class="fas fa-exclamation-triangle me-2"></i>
      <div class="flex-grow-1">${message}</div>
      ${onRetry &&
      html`
        <button class="btn btn-sm btn-outline-danger ms-2" onClick=${onRetry}>
          <i class="fas fa-refresh me-1"></i>${__("Retry", "dashboardng")}
        </button>
      `}
    </div>
  `;
};

export default ErrorAlert;
