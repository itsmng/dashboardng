import { h } from '../../lib/preact.js';
import { PERIODS } from '../../lib/config.js';
import { CustomRangePicker } from './CustomRangePicker.js';

interface CustomRange {
  start: string;
  end: string;
}

interface PeriodSelectorProps {
  value: number;
  onChange: (value: number) => void;
  showCustomRange?: boolean;
  customRange?: CustomRange;
  onCustomRangeChange?: (range: CustomRange) => void;
}

export const PeriodSelector = ({ value, onChange, showCustomRange = false, customRange, onCustomRangeChange }: PeriodSelectorProps) => {
    return (
        <div className="d-flex align-items-center gap-2">
            <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={value}
                onChange={(e) => onChange(parseInt((e.target as HTMLSelectElement).value))}
            >
                {PERIODS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>
            {showCustomRange && value === 8 && (
                <CustomRangePicker
                    value={customRange || { start: '', end: '' }}
                    onChange={onCustomRangeChange!}
                />
            )}
        </div>
    );
};

export default PeriodSelector;
