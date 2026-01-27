import { html, useState, useEffect } from '../../lib/preact.js';
import { useDashboard } from '../../context/DashboardContext.js';
import { __ } from '../../lib/i18n.js';

export const SharedDashboardModal = ({ isOpen, onClose, initialMode = 'load' }) => {
    if (!isOpen) {return null;}

    const {
        loadDashboards,
        createPersonalDashboard,
        createSharedDashboard,
        setDefaultDashboard,
        loadDashboardById,
        dashboard
    } = useDashboard();
    const [dashboards, setDashboards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState(initialMode);
    const [newDashboardName, setNewDashboardName] = useState('');
    const [sourceDashboardId, setSourceDashboardId] = useState('');
    const canEditGlobal = window.DASHBOARDNG_CONFIG?.canEditGlobalDashboard;
    const userId = window.DASHBOARDNG_CONFIG?.userId;

    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            loadAvailableDashboards();
        }
    }, [isOpen, initialMode]);

    useEffect(() => {
        if (isOpen) {
            setNewDashboardName('');
            setSourceDashboardId('');
        }
    }, [isOpen, mode]);

    const loadAvailableDashboards = async () => {
        setIsLoading(true);
        const availableDashboards = await loadDashboards();
        setDashboards(availableDashboards);
        setIsLoading(false);
    };

    const handleSwitchShared = async (selectedDashboardId) => {
        await loadDashboardById(selectedDashboardId);
        onClose();
    };

    const handleSwitchPersonal = async (selectedDashboardId) => {
        const success = await setDefaultDashboard(selectedDashboardId);
        if (success) {
            await loadDashboardById(selectedDashboardId);
            onClose();
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

    const handleCreatePersonal = async (e) => {
        e.preventDefault();
        if (!newDashboardName.trim()) {return;}

        const created = await createPersonalDashboard(newDashboardName, sourceDashboardId || dashboard?.id);
        if (created?.id) {
            setNewDashboardName('');
            setSourceDashboardId('');
            await loadDashboardById(created.id);
            onClose();
        }
    };

    const currentDashboardIdString = dashboard?.id ? String(dashboard.id) : '';
    const personalDashboards = dashboards.filter(d => !d.is_global && String(d.users_id) === String(userId));
    const globalDashboards = dashboards.filter(d => d.is_global);
    const canCreateShared = canEditGlobal;
    const sourceDashboards = mode === 'create-personal' ? dashboards : globalDashboards;

    return html`
        <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            ${mode === 'load'
                                ? __('Switch Dashboard', 'dashboardng')
                                : (mode === 'create-personal'
                                    ? __('Create Personal Dashboard', 'dashboardng')
                                    : __('Create Shared Dashboard', 'dashboardng'))}
                        </h5>
                        <button type="button" class="btn-close" onClick=${onClose}></button>
                    </div>
                    <div class="modal-body">
                        ${mode === 'load' ? html`
                            <div class="d-flex flex-wrap gap-2 mb-3">
                                <button 
                                    class="btn btn-outline-primary"
                                    onClick=${() => setMode('create-personal')}
                                >
                                    ${__('Create Personal Dashboard', 'dashboardng')}
                                </button>
                                ${canCreateShared && html`
                                    <button 
                                        class="btn btn-outline-primary"
                                        onClick=${() => setMode('create-shared')}
                                    >
                                        ${__('Create New Shared Dashboard', 'dashboardng')}
                                    </button>
                                `}
                            </div>
                            ${isLoading ? html`
                                <div class="text-center py-5">
                                    <div class="spinner-border" role="status"></div>
                                </div>
                            ` : html`
                                <div class="mb-4">
                                    <h6 class="mb-2">${__('Your Dashboards', 'dashboardng')}</h6>
                                    ${personalDashboards.length === 0 ? html`
                                        <div class="alert alert-info">
                                            ${__('No personal dashboards yet', 'dashboardng')}
                                        </div>
                                    ` : html`
                                        <div class="list-group dashboardng-personal-list">
                                            ${personalDashboards.map(d => {
                                                const isCurrent = String(d.id) === currentDashboardIdString;
                                                return html`
                                                <button
                                                    type="button"
                                                    class="list-group-item list-group-item-action text-start ${isCurrent ? 'active is-current' : ''}"
                                                    aria-current=${isCurrent ? 'true' : 'false'}
                                                    onClick=${() => handleSwitchPersonal(d.id)}
                                                    disabled=${isCurrent}
                                                >
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <h6 class="mb-1 d-flex align-items-center gap-2">
                                                                <span>${d.name}</span>
                                                                ${isCurrent ? html`
                                                                    <span class="badge bg-success">${__('Current', 'dashboardng')}</span>
                                                                ` : ''}
                                                            </h6>
                                                            <small class="text-muted">
                                                                ${__('Personal dashboard', 'dashboardng')}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </button>
                                            `;})}
                                        </div>
                                    `}
                                </div>
                                <div>
                                    <h6 class="mb-2">${__('Shared Templates', 'dashboardng')}</h6>
                                    ${globalDashboards.length === 0 ? html`
                                        <div class="alert alert-info">
                                            ${__('No shared dashboards available', 'dashboardng')}
                                        </div>
                                    ` : html`
                                        <div class="list-group dashboardng-shared-list">
                                            ${globalDashboards.map(d => {
                                                const isCurrent = String(d.id) === currentDashboardIdString;
                                                return html`
                                                <button
                                                    type="button"
                                                    class="list-group-item list-group-item-action text-start ${isCurrent ? 'active is-current' : ''}"
                                                    aria-current=${isCurrent ? 'true' : 'false'}
                                                    onClick=${() => handleSwitchShared(d.id)}
                                                >
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <h6 class="mb-1 d-flex align-items-center gap-2">
                                                                <span>${d.name}</span>
                                                                ${d.is_default ? html`
                                                                    <span class="badge ${isCurrent ? 'bg-light text-dark' : 'bg-secondary'}">${__('Default', 'dashboardng')}</span>
                                                                ` : ''}
                                                                ${isCurrent ? html`
                                                                    <span class="badge bg-success">${__('Current', 'dashboardng')}</span>
                                                                ` : ''}
                                                            </h6>
                                                            <small class="text-muted">
                                                                ${d.is_default
                                                                    ? __('Global default dashboard', 'dashboardng')
                                                                    : __('Shared dashboard template', 'dashboardng')}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </button>
                                            `;})}
                                        </div>
                                    `}
                                </div>
                            `}
                        ` : html`
                            <form onSubmit=${mode === 'create-personal' ? handleCreatePersonal : handleCreateShared}>
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
                                        <option value="">-- ${__('Copy from current dashboard', 'dashboardng')} --</option>
                                        ${sourceDashboards.map(d => html`
                                            <option value=${d.id}>${d.name}</option>
                                        `)}
                                    </select>
                                    <div class="form-text">
                                        ${__('Leave empty to copy from the currently loaded dashboard', 'dashboardng')}
                                    </div>
                                </div>
                            </form>
                        `}
                    </div>
                    <div class="modal-footer">
                        ${mode !== 'load' ? html`
                            <button type="button" class="btn btn-secondary" onClick=${() => setMode('load')}>
                                ${__('Back', 'dashboardng')}
                            </button>
                            <button 
                                type="submit" 
                                class="btn btn-primary" 
                                onClick=${mode === 'create-personal' ? handleCreatePersonal : handleCreateShared}
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
