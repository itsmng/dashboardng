import { html } from '../../lib/preact.js';
import { __ } from '../../lib/i18n.js';

export const CustomRangePicker = ({ value, onChange }) => {
  const handleChange = (key, dateValue) => {
    onChange({ ...value, [key]: dateValue || '' });
  };

  return html`
    <div class="d-flex align-items-center gap-2">
      <label class="form-label mb-0 text-muted">${__("From", "dashboardng")}</label>
      <input
        type="date"
        class="form-control form-control-sm"
        value=${value.start || ''}
        onChange=${(e) => handleChange('start', e.target.value)}
      />
      <label class="form-label mb-0 text-muted">${__("To", "dashboardng")}</label>
      <input
        type="date"
        class="form-control form-control-sm"
        value=${value.end || ''}
        onChange=${(e) => handleChange('end', e.target.value)}
      />
    </div>
  `;
};

export default CustomRangePicker;
