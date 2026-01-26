import { html, useState, useEffect } from '../../lib/preact.js';
import { useDashboard } from '../../context/DashboardContext.js';
import { __ } from '../../lib/i18n.js';

export const SharedDashboardModal = ({ isOpen, onClose }) => {
    if (!isOpen) {return null;}

    const { loadDashboards, createPersonalDashboard, createSharedDashboard, dashboard } = useDashboard();
    const [dashboards, setDashboards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState('load');
    const [newDashboardName, setNewDashboardName] = useState('');
    const [sourceDashboardId, setSourceDashboardId] = useState('');
    const canEditGlobal = window.DASHBOARDNG_CONFIG?.canEditGlobalDashboard;

    useEffect(() => {
        if (isOpen) {
            loadAvailableDashboards();
        }
    }, [isOpen]);

    const loadAvailableDashboards = async () => {
        setIsLoading(true);
        const availableDashboards = await loadDashboards();
        setDashboards(availableDashboards.filter(d => d.is_global));
        setIsLoading(false);
    };

    const handleUseTemplate = async (selectedDashboardId) => {
        if (confirm(__('Replace your personal dashboard with this template?', 'dashboardng'))) {
            const success = await createPersonalDashboard(selectedDashboardId);
            if (success) {
                onClose();
            }
        }
    };

    const handleCreateShared = async (e) => {
        e.preventDefault();
        if (!newDashboardName.trim()) {return;}

        const success = await createSharedDashboard(newDashboardName, sourceDashboardId || dashboard?.id);
        if (success) {
            setNewDashboardName('');
            setSourceDashboardId('');
            setMode('load');
            loadAvailableDashboards();
        }
    };

    const sharedDashboards = dashboards.filter(d => !d.is_default);
    const canCreateShared = canEditGlobal;

    return html`
        <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            ${mode === 'load' 
                                ? __('Load Shared Dashboard', 'dashboardng') 
                                : __('Create Shared Dashboard', 'dashboardng')}
                        </h5>
                        <button type="button" class="btn-close" onClick=${onClose}></button>
                    </div>
                    <div class="modal-body">
                        ${mode === 'load' ? html`
                            ${canCreateShared && html`
                                <button 
                                    class="btn btn-outline-primary mb-3"
                                    onClick=${() => setMode('create')}
                                >
                                    ${__('Create New Shared Dashboard', 'dashboardng')}
                                </button>
                            `}
                            ${isLoading ? html`
                                <div class="text-center py-5">
                                    <div class="spinner-border" role="status"></div>
                                </div>
                            ` : (sharedDashboards.length === 0 ? html`
                                <div class="alert alert-info">
                                    ${__('No shared dashboards available', 'dashboardng')}
                                </div>
                            ` : html`
                                <div class="list-group">
                                    ${sharedDashboards.map(d => html`
                                        <div class="list-group-item list-group-item-action">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 class="mb-1">${d.name}</h6>
                                                    <small class="text-muted">
                                                        ${__('Shared Dashboard Template', 'dashboardng')}
                                                    </small>
                                                </div>
                                                <button 
                                                    class="btn btn-sm btn-primary"
                                                    onClick=${() => handleUseTemplate(d.id)}
                                                >
                                                    ${__('Use Template', 'dashboardng')}
                                                </button>
                                            </div>
                                        </div>
                                    `)}
                                </div>
                            `)}
                        ` : html`
                            <form onSubmit=${handleCreateShared}>
                                <div class="mb-3">
                                    <label class="form-label">
                                        ${__('Dashboard Name', 'dashboardng')}
                                    </label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        value=${newDashboardName}
                                        onInput=${(e) => setNewDashboardName(e.target.value)}
                                        placeholder=${__('Enter dashboard name', 'dashboardng')}
                                        required
                                    />
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">
                                        ${__('Source Dashboard', 'dashboardng')}
                                    </label>
                                    <select 
                                        class="form-select"
                                        value=${sourceDashboardId}
                                        onChange=${(e) => setSourceDashboardId(e.target.value)}
                                    >
                                        <option value="">-- ${__('Copy from global default', 'dashboardng')} --</option>
                                        ${sharedDashboards.map(d => html`
                                            <option value=${d.id}>${d.name}</option>
                                        `)}
                                    </select>
                                    <div class="form-text">
                                        ${__('Leave empty to copy from the default global dashboard', 'dashboardng')}
                                    </div>
                                </div>
                            </form>
                        `}
                    </div>
                    <div class="modal-footer">
                        ${mode === 'create' ? html`
                            <button type="button" class="btn btn-secondary" onClick=${() => setMode('load')}>
                                ${__('Back', 'dashboardng')}
                            </button>
                            <button 
                                type="submit" 
                                class="btn btn-primary" 
                                onClick=${handleCreateShared}
                                disabled=${!newDashboardName.trim()}
                            >
                                ${__('Create', 'dashboardng')}
                            </button>
                        ` : html`
                            <button type="button" class="btn btn-secondary" onClick=${onClose}>
                                ${__('Close', 'dashboardng')}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
};
