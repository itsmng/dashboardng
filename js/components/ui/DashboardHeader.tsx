import { h, Fragment } from '../../lib/preact.js';
import { useDashboard } from '../../context/DashboardContext.js';
import { CONFIG } from '../../lib/config.js';
import { __ } from '../../lib/i18n.js';

interface DashboardHeaderProps {
    onOpenWidgetLibrary: () => void;
    onToggleEditMode: () => void;
    onOpenSharedDashboard?: () => void;
}

export const DashboardHeader = ({ onOpenWidgetLibrary, onToggleEditMode, onOpenSharedDashboard = () => {} }: DashboardHeaderProps) => {
    const { editMode, lastUpdate, permissions } = useDashboard();

    const formatTimeAgo = (date: Date | null) => {
        if (!date) { return ''; }
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) { return `${seconds}s ago`; }
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) { return `${minutes}m ago`; }
        return date.toLocaleTimeString();
    };

    const isPersonalMode = CONFIG.pageMode === 'personal';
    const canEdit = permissions?.canEdit;

    return (
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-3">
                {lastUpdate && (
                    <small className="text-muted">
                        <i className="fas fa-sync-alt me-1"></i>
                        {__('Last updated', 'dashboardng')}: {formatTimeAgo(lastUpdate)}
                    </small>
                )}
            </div>
            <div className="d-flex align-items-center gap-2">
                {isPersonalMode && (
                    <button
                        className="btn btn-outline-info btn-sm"
                        title={__('Switch Dashboard', 'dashboardng')}
                        onClick={onOpenSharedDashboard}
                    >
                        <i className="fas fa-share-alt"></i>
                    </button>
                )}
                {canEdit && (
                    <>
                        <button
                            className="btn btn-outline-success btn-sm"
                            title={__('Add Widget', 'dashboardng')}
                            onClick={onOpenWidgetLibrary}
                        >
                            <i className="fas fa-plus"></i>
                        </button>
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            title={editMode ? __('Finish Editing', 'dashboardng') : __('Edit Layout', 'dashboardng')}
                            onClick={onToggleEditMode}
                        >
                            <i className={`fas fa-${editMode ? 'check' : 'edit'}`}></i>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardHeader;
