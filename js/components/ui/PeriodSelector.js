import { html } from '../../lib/preact.js';
import { PERIODS } from '../../lib/config.js';
import { CustomRangePicker } from './CustomRangePicker.js';

/**
 * Period Selector dropdown component
 * Allows users to select time period for data filtering
 *
 * @component
 * @param {Object} props
 * @param {number} props.value - Currently selected period value
 * @param {function(number): void} props.onChange - Callback when selection changes
 * @param {boolean} [props.showCustomRange=false] - Whether to show custom range picker
 * @param {Object} [props.customRange] - Custom range object with start and end dates
 * @param {function(Object): void} [props.onCustomRangeChange] - Callback when custom range changes
 * @returns {import('preact').VNode} Period selector dropdown
 * @example
 */
export const PeriodSelector = ({ value, onChange, showCustomRange = false, customRange, onCustomRangeChange }) => {
    return html`
        <div class="d-flex align-items-center gap-2">
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
            ${showCustomRange && value === 8 && html`
                <${CustomRangePicker}
                    value=${customRange || { start: '', end: '' }}
                    onChange=${onCustomRangeChange}
                />
            `}
        </div>
    `;
};

export default PeriodSelector;
