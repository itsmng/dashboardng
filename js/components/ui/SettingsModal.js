import { html, useState, useEffect } from '../../lib/preact.js';
import { __ } from '../../lib/i18n.js';

/**
 * Settings Modal Component for Report Cards
 * Allows users to configure chart-specific settings like Top K for pie charts
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {function(): void} props.onClose - Callback when modal closes
 * @param {function(Object): void} props.onSave - Callback when settings are saved
 * @param {Object} props.settings - Current settings object
 * @param {string} [props.chartType=null] - Type of chart (pie, doughnut, etc.)
 * @returns {import('preact').VNode|null} Modal or null if not open
 */
export const SettingsModal = ({ isOpen, onClose, onSave, settings = {}, chartType = undefined }) => {
    const [localSettings, setLocalSettings] = useState(settings);

    // Reset local settings when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
        }
    }, [isOpen, settings]);

    const isTopKChart = ['pie', 'doughnut', 'bar', 'line'].includes(chartType);

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    const handleChange = (key, value) => {
        setLocalSettings({ ...localSettings, [key]: value });
    };

    if (!isOpen) {return null;}

    return html`
        <div class="modal-backdrop show" onClick=${onClose}></div>
        <div class="modal show d-block" tabindex="-1" style="z-index: 1060;">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-cog me-2"></i>
                            ${__('Chart Settings', 'dashboardng')}
                        </h5>
                        <button type="button" class="btn-close" onClick=${onClose}></button>
                    </div>
                    <div class="modal-body">
                        ${isTopKChart && html`
                            <div class="mb-3">
                                <label class="form-label">
                                    ${__('Top K elements', 'dashboardng')}
                                    <small class="text-muted d-block">
                                        ${__('Show only the top K elements; group the rest as Others', 'dashboardng')}
                                    </small>
                                </label>
                                <div class="input-group" style="max-width: 200px;">
                                    <input
                                        type="number"
                                        class="form-control"
                                        value=${localSettings.topK ?? ''}
                                        onInput=${(e) => handleChange('topK', parseInt(e.target.value) || undefined)}
                                        min="1"
                                        max="50"
                                        placeholder="${__('All', 'dashboardng')}"
                                    />
                                    <span class="input-group-text">${__('items', 'dashboardng')}</span>
                                </div>
                                ${localSettings.topK !== undefined && localSettings.topK !== null && html`
                                    <small class="text-info mt-1 d-block">
                                        <i class="fas fa-info-circle me-1"></i>
                                        ${__('Elements beyond the top K will be grouped into "Others"', 'dashboardng')}
                                    </small>
                                `}
                            </div>
                        `}
                        ${!isTopKChart && html`
                            <div class="text-center text-muted py-4">
                                <i class="fas fa-info-circle fa-2x mb-3"></i>
                                <p>${__('No specific settings available for this chart type.', 'dashboardng')}</p>
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onClick=${onClose}>
                            <i class="fas fa-times me-1"></i>
                            ${__('Cancel', 'dashboardng')}
                        </button>
                        ${isTopKChart && html`
                            <button
                                class="btn btn-primary"
                                onClick=${handleSave}
                            >
                                <i class="fas fa-check me-1"></i>
                                ${__('Save', 'dashboardng')}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
};

export default SettingsModal;
