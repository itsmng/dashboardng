import { h } from '../../lib/preact.js';
import { __ } from '../../lib/i18n.js';

interface CustomRange {
  start: string;
  end: string;
}

interface CustomRangePickerProps {
  value: CustomRange;
  onChange: (range: CustomRange) => void;
}

export const CustomRangePicker = ({ value, onChange }: CustomRangePickerProps) => {
  const handleChange = (key: 'start' | 'end', dateValue: string) => {
    onChange({ ...value, [key]: dateValue || '' });
  };

  return (
    <div className="d-flex align-items-center gap-2">
      <label className="form-label mb-0 text-muted">{__("From", "dashboardng")}</label>
      <input
        type="date"
        className="form-control form-control-sm"
        value={value.start || ''}
        onChange={(e) => handleChange('start', (e.target as HTMLInputElement).value)}
      />
      <label className="form-label mb-0 text-muted">{__("To", "dashboardng")}</label>
      <input
        type="date"
        className="form-control form-control-sm"
        value={value.end || ''}
        onChange={(e) => handleChange('end', (e.target as HTMLInputElement).value)}
      />
    </div>
  );
};

export default CustomRangePicker;
