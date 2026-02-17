import { h, Fragment, useState, useEffect } from '../../lib/preact.js';
import { __ } from '../../lib/i18n.js';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: Record<string, unknown>) => void;
    settings?: Record<string, unknown>;
    chartType?: string;
}

export const SettingsModal = ({ isOpen, onClose, onSave, settings = {}, chartType = undefined }: SettingsModalProps) => {
    const [localSettings, setLocalSettings] = useState(settings);

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

    const handleChange = (key: string, value: unknown) => {
        setLocalSettings({ ...localSettings, [key]: value });
    };

    if (!isOpen) {return null;}

    return (
        <Fragment>
            <div className="modal-backdrop show" onClick={onClose}></div>
            <div className="modal show d-block" tabIndex={-1} style={{ zIndex: 1060 }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                <i className="fas fa-cog me-2"></i>
                                {__('Chart Settings', 'dashboardng')}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            {isTopKChart && (
                                <div className="mb-3">
                                    <label className="form-label">
                                        {__('Top K elements', 'dashboardng')}
                                        <small className="text-muted d-block">
                                            {__('Show only the top K elements; group the rest as Others', 'dashboardng')}
                                        </small>
                                    </label>
                                    <div className="input-group" style={{ maxWidth: '200px' }}>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={localSettings.topK ?? ''}
                                            onInput={(e) => handleChange('topK', parseInt((e.target as HTMLInputElement).value) || undefined)}
                                            min="1"
                                            max="50"
                                            placeholder={__('All', 'dashboardng')}
                                        />
                                        <span className="input-group-text">{__('items', 'dashboardng')}</span>
                                    </div>
                                    {localSettings.topK !== undefined && localSettings.topK !== null && (
                                        <small className="text-info mt-1 d-block">
                                            <i className="fas fa-info-circle me-1"></i>
                                            {__('Elements beyond the top K will be grouped into "Others"', 'dashboardng')}
                                        </small>
                                    )}
                                </div>
                            )}
                            {!isTopKChart && (
                                <div className="text-center text-muted py-4">
                                    <i className="fas fa-info-circle fa-2x mb-3"></i>
                                    <p>{__('No specific settings available for this chart type.', 'dashboardng')}</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={onClose}>
                                <i className="fas fa-times me-1"></i>
                                {__('Cancel', 'dashboardng')}
                            </button>
                            {isTopKChart && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                >
                                    <i className="fas fa-check me-1"></i>
                                    {__('Save', 'dashboardng')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default SettingsModal;
