import { html } from '../../../lib/preact.js';

export const StatCard = ({ label, value, icon, color = "primary", trend }) => {
  return html`
    <div class="card h-100 border-${color} border-start border-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="text-muted mb-1">${label}</h6>
            <h3 class="mb-0">${value}</h3>
            ${trend !== undefined &&
            html`
              <small class="text-${trend >= 0 ? "success" : "danger"}">
                <i
                  class="fas fa-arrow-${trend >= 0 ? "up" : "down"} me-1"
                ></i>
                ${Math.abs(trend)}%
              </small>
            `}
          </div>
          ${icon &&
          html`
            <div class="text-${color} opacity-50">
              <i class="fas fa-${icon}" style="font-size: 2.5rem;"></i>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
};

export default StatCard;
