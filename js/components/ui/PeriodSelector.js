import { html } from '../../lib/preact.js';
import { PERIODS } from '../../lib/config.js';

/**
 * Period Selector dropdown component
 * Allows users to select time period for data filtering
 *
 * @component
 * @param {Object} props
 * @param {number} props.value - Currently selected period value
 * @param {function(number): void} props.onChange - Callback when selection changes
 * @returns {import('preact').VNode} Period selector dropdown
 * @example
 */
export const PeriodSelector = ({ value, onChange }) => {
    return html`
        <select
            class="form-select form-select-sm"
            style="width: auto;"
            value=${value}
            onChange=${(e) => onChange(parseInt(e.target.value))}
        >
            ${PERIODS.map(p => html`
                <option key=${p.value} value=${p.value}>${p.label}</option>
            `)}
        </select>
    `;
};

export default PeriodSelector;
