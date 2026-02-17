import { h } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

interface StepIndicatorProps {
    step: number;
    onStepClick: (num: number) => void;
}

export const StepIndicator = ({ step, onStepClick }: StepIndicatorProps) => {
    const steps = [
        { num: 1, label: __('Data Source', 'dashboardng') },
        { num: 2, label: __('Filters', 'dashboardng') },
        { num: 3, label: __('Visualization', 'dashboardng') },
        { num: 4, label: __('Preview', 'dashboardng') }
    ];

    return (
        <div className="step-indicator mb-4">
            {steps.map(s => (
                <div
                    key={s.num}
                    className={`step ${step >= s.num ? 'active' : ''} ${step === s.num ? 'current' : ''}`}
                    onClick={() => s.num < step && onStepClick(s.num)}
                >
                    <div className="step-number">{s.num}</div>
                    <div className="step-label">{s.label}</div>
                </div>
            ))}
        </div>
    );
};

export default StepIndicator;
