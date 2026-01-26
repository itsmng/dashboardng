import { html } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

export const EmptyState = ({ message }) => {
  return html`
    <div class="text-center text-muted p-5">
      <i class="fas fa-chart-bar" style="font-size: 3rem;"></i>
      <p class="mt-3">${message || __("No data available", "dashboardng")}</p>
    </div>
  `;
};

export default EmptyState;
