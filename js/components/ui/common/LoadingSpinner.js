import { html } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

export const LoadingSpinner = () => {
  return html`
    <div class="d-flex justify-content-center align-items-center p-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">${__("Loading...", "dashboardng")}</span>
      </div>
    </div>
  `;
};

export default LoadingSpinner;
