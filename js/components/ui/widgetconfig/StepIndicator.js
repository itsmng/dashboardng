import { html } from '../../../lib/preact.js';

export const StepIndicator = ({ step, onStepClick }) => {
    return html`
        <div class="step-indicator mb-4">
            ${[
                { num: 1, label: __('Data Source', 'dashboardng') },
                { num: 2, label: __('Filters', 'dashboardng') },
                { num: 3, label: __('Visualization', 'dashboardng') },
                { num: 4, label: __('Preview', 'dashboardng') }
            ].map(s => html`
                <div class="step ${step >= s.num ? 'active' : ''} ${step === s.num ? 'current' : ''}"
                     onClick=${() => s.num < step && onStepClick(s.num)}>
                    <div class="step-number">${s.num}</div>
                    <div class="step-label">${s.label}</div>
                </div>
            `)}
        </div>
    `;
};

export default StepIndicator;
