import { html } from '../../lib/preact.js';
import { PeriodSelector } from './PeriodSelector.js';
import { useDashboard } from '../../context/DashboardContext.js';
import { CONFIG } from '../../lib/config.js';
import { __ } from '../../lib/i18n.js';

export const DashboardHeader = ({ onOpenWidgetLibrary, onToggleEditMode, onOpenSharedDashboard }) => {
    const { editMode, lastUpdate, permissions } = useDashboard();

    const formatTimeAgo = (date) => {
        if (!date) {return '';}
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) {return `${seconds}s ago`;}
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {return `${minutes}m ago`;}
        return date.toLocaleTimeString();
    };

    const isPersonalMode = CONFIG.pageMode === 'personal';
    const canEdit = permissions?.canEdit;

    return html`
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="d-flex align-items-center gap-3">
                <${PeriodSelector} />
                ${lastUpdate && html`
                    <small class="text-muted">
                        <i class="fas fa-sync-alt me-1"></i>
                        ${__('Last updated', 'dashboardng')}: ${formatTimeAgo(lastUpdate)}
                    </small>
                `}
            </div>
            <div class="d-flex align-items-center gap-2">
                ${isPersonalMode && html`
                    <button
                        class="btn btn-outline-info btn-sm"
                        onClick=${onOpenSharedDashboard}
                    >
                        <i class="fas fa-share-alt me-1"></i>
                        ${__('Switch Dashboard', 'dashboardng')}
                    </button>
                `}
                ${canEdit && html`
                    <button
                        class="btn btn-outline-success btn-sm"
                        onClick=${onOpenWidgetLibrary}
                    >
                        <i class="fas fa-plus me-1"></i>
                        ${__('Add Widget', 'dashboardng')}
                    </button>
                    <button
                        class="btn btn-outline-secondary btn-sm"
                        onClick=${onToggleEditMode}
                    >
                        <i class="fas fa-${editMode ? 'check' : 'edit'} me-1"></i>
                        ${editMode ? __('Done', 'dashboardng') : __('Edit Layout', 'dashboardng')}
                    </button>
                `}
            </div>
        </div>
    `;
};

export default DashboardHeader;
