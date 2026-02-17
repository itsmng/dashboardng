import { h, Fragment } from '../../lib/preact.js';
import { useState, useEffect } from '../../lib/preact.js';
import { useDashboard } from '../../context/DashboardContext.js';
import { __ } from '../../lib/i18n.js';
import type { Dashboard } from '../../types/index.js';

interface SharedDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'load' | 'create-personal' | 'create-shared';
}

export const SharedDashboardModal = ({ isOpen, onClose, initialMode = 'load' }: SharedDashboardModalProps) => {
    if (!isOpen) {return null;}

    const {
        loadDashboards,
        createPersonalDashboard,
        createSharedDashboard,
        setDefaultDashboard,
        loadDashboardById,
        loadDashboard,
        deleteDashboard,
        dashboard
    } = useDashboard();
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState(initialMode);
    const [newDashboardName, setNewDashboardName] = useState('');
    const [sourceDashboardId, setSourceDashboardId] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [dashboardToDelete, setDashboardToDelete] = useState<Dashboard | null>(null);
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
        setDashboards(availableDashboards as Dashboard[]);
        setIsLoading(false);
    };

    const handleSwitchShared = async (selectedDashboardId: number) => {
        await loadDashboardById(selectedDashboardId);
        onClose();
    };

    const handleSwitchPersonal = async (selectedDashboardId: number) => {
        const success = await setDefaultDashboard(selectedDashboardId);
        if (success) {
            await loadDashboardById(selectedDashboardId);
            onClose();
        }
    };

    const handleCreateShared = async (e: Event) => {
        e.preventDefault();
        if (!newDashboardName.trim()) {return;}

        const sourceId = sourceDashboardId ? Number(sourceDashboardId) : dashboard?.id;
        const success = await createSharedDashboard(newDashboardName, sourceId);
        if (success) {
            setNewDashboardName('');
            setSourceDashboardId('');
            setMode('load');
            loadAvailableDashboards();
        }
    };

    const handleCreatePersonal = async (e: Event) => {
        e.preventDefault();
        if (!newDashboardName.trim()) {return;}

        const sourceId = sourceDashboardId ? Number(sourceDashboardId) : dashboard?.id;
        const created = await createPersonalDashboard(newDashboardName, sourceId);
        if (created?.id) {
            setNewDashboardName('');
            setSourceDashboardId('');
            await loadDashboardById(created.id as number);
            onClose();
        }
    };

    const handleDeleteDashboard = (e: Event, dashboardId: number) => {
        e.stopPropagation();
        const dashToDelete = dashboards.find(d => d.id === dashboardId);
        setDashboardToDelete(dashToDelete || null);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!dashboardToDelete) {return;}

        const success = await deleteDashboard(dashboardToDelete.id);
        if (success) {
            await loadAvailableDashboards();
            if (dashboard?.id === dashboardToDelete.id) {
                await loadDashboard();
            }
            setShowDeleteConfirm(false);
            setDashboardToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setDashboardToDelete(null);
    };

    const currentDashboardIdString = dashboard?.id ? String(dashboard.id) : '';
    const personalDashboards = dashboards.filter(d => !d.is_global && String((d as any).user_id) === String(userId));
    const globalDashboards = dashboards.filter(d => d.is_global);
    const canCreateShared = canEditGlobal;
    const sourceDashboards = mode === 'create-personal' ? dashboards : globalDashboards;

    return (
        <Fragment>
            <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                {mode === 'load'
                                    ? __('Switch Dashboard', 'dashboardng')
                                    : (mode === 'create-personal'
                                        ? __('Create Personal Dashboard', 'dashboardng')
                                        : __('Create Shared Dashboard', 'dashboardng'))}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            {mode === 'load' ? (
                                <>
                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() => setMode('create-personal')}
                                        >
                                            {__('Create Personal Dashboard', 'dashboardng')}
                                        </button>
                                        {canCreateShared && (
                                            <button
                                                className="btn btn-outline-primary"
                                                onClick={() => setMode('create-shared')}
                                            >
                                                {__('Create New Shared Dashboard', 'dashboardng')}
                                            </button>
                                        )}
                                    </div>
                                    {isLoading ? (
                                        <div className="text-center py-5">
                                            <div className="spinner-border" role="status"></div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-4">
                                                <h6 className="mb-2">{__('Your Dashboards', 'dashboardng')}</h6>
                                                {personalDashboards.length === 0 ? (
                                                    <div className="alert alert-info">
                                                        {__('No personal dashboards yet', 'dashboardng')}
                                                    </div>
                                                ) : (
                                                    <div className="list-group dashboardng-personal-list">
                                                        {personalDashboards.map(d => {
                                                            const isCurrent = String(d.id) === currentDashboardIdString;
                                                            return (
                                                                <button
                                                                    key={d.id}
                                                                    type="button"
                                                                    className={`list-group-item list-group-item-action text-start ${isCurrent ? 'active is-current' : ''}`}
                                                                    aria-current={isCurrent ? 'true' : 'false'}
                                                                    onClick={() => handleSwitchPersonal(d.id)}
                                                                    disabled={isCurrent}
                                                                >
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <div>
                                                                            <h6 className="mb-1 d-flex align-items-center gap-2">
                                                                                <span>{d.name}</span>
                                                                                {isCurrent && (
                                                                                    <span className="badge bg-success">{__('Current', 'dashboardng')}</span>
                                                                                )}
                                                                            </h6>
                                                                            <small className="text-muted">
                                                                                {__('Personal dashboard', 'dashboardng')}
                                                                            </small>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-outline-danger dashboardng-delete-btn"
                                                                            onClick={(e: Event) => handleDeleteDashboard(e, d.id)}
                                                                            title={__('Delete', 'dashboardng')}
                                                                        >
                                                                            <i className="fas fa-trash-alt"></i>
                                                                        </button>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h6 className="mb-2">{__('Shared Templates', 'dashboardng')}</h6>
                                                {globalDashboards.length === 0 ? (
                                                    <div className="alert alert-info">
                                                        {__('No shared dashboards available', 'dashboardng')}
                                                    </div>
                                                ) : (
                                                    <div className="list-group dashboardng-shared-list">
                                                        {globalDashboards.map(d => {
                                                            const isCurrent = String(d.id) === currentDashboardIdString;
                                                            const canDeleteGlobal = canEditGlobal && !(d as any).is_default;
                                                            return (
                                                                <button
                                                                    key={d.id}
                                                                    type="button"
                                                                    className={`list-group-item list-group-item-action text-start ${isCurrent ? 'active is-current' : ''}`}
                                                                    aria-current={isCurrent ? 'true' : 'false'}
                                                                    onClick={() => handleSwitchShared(d.id)}
                                                                >
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <div>
                                                                            <h6 className="mb-1 d-flex align-items-center gap-2">
                                                                                <span>{d.name}</span>
                                                                                {(d as any).is_default && (
                                                                                    <span className={`badge ${isCurrent ? 'bg-light text-dark' : 'bg-secondary'}`}>{__('Default', 'dashboardng')}</span>
                                                                                )}
                                                                                {isCurrent && (
                                                                                    <span className="badge bg-success">{__('Current', 'dashboardng')}</span>
                                                                                )}
                                                                            </h6>
                                                                            <small className="text-muted">
                                                                                {(d as any).is_default
                                                                                    ? __('Global default dashboard', 'dashboardng')
                                                                                    : __('Shared dashboard template', 'dashboardng')}
                                                                            </small>
                                                                        </div>
                                                                        {canDeleteGlobal && (
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-outline-danger dashboardng-delete-btn"
                                                                                onClick={(e: Event) => handleDeleteDashboard(e, d.id)}
                                                                                title={__('Delete', 'dashboardng')}
                                                                            >
                                                                                <i className="fas fa-trash-alt"></i>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <form onSubmit={mode === 'create-personal' ? handleCreatePersonal : handleCreateShared}>
                                    <div className="mb-3">
                                        <label className="form-label">
                                            {__('Dashboard Name', 'dashboardng')}
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newDashboardName}
                                            onInput={(e: Event) => setNewDashboardName((e.target as HTMLInputElement).value)}
                                            placeholder={__('Enter dashboard name', 'dashboardng')}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">
                                            {__('Source Dashboard', 'dashboardng')}
                                        </label>
                                        <select
                                            className="form-select"
                                            value={sourceDashboardId}
                                            onChange={(e: Event) => setSourceDashboardId((e.target as HTMLSelectElement).value)}
                                        >
                                            <option value="">-- {__('Copy from current dashboard', 'dashboardng')} --</option>
                                            {sourceDashboards.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        <div className="form-text">
                                            {__('Leave empty to copy from the currently loaded dashboard', 'dashboardng')}
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                        <div className="modal-footer">
                            {mode !== 'load' ? (
                                <>
                                    <button type="button" className="btn btn-secondary" onClick={() => setMode('load')}>
                                        {__('Back', 'dashboardng')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        onClick={mode === 'create-personal' ? handleCreatePersonal : handleCreateShared}
                                        disabled={!newDashboardName.trim()}
                                    >
                                        {__('Create', 'dashboardng')}
                                    </button>
                                </>
                            ) : (
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    {__('Close', 'dashboardng')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {showDeleteConfirm && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-sm">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{__('Delete Dashboard', 'dashboardng')}</h5>
                                <button type="button" className="btn-close" onClick={handleCancelDelete}></button>
                            </div>
                            <div className="modal-body">
                                <p>{__('Are you sure you want to delete this dashboard?', 'dashboardng')}</p>
                                {dashboardToDelete && (
                                    <p className="text-muted"><strong>{dashboardToDelete.name}</strong></p>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={handleCancelDelete}>
                                    {__('Cancel', 'dashboardng')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleConfirmDelete}
                                >
                                    {__('Delete', 'dashboardng')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
};
