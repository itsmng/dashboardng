import { html } from '../../lib/preact.js';
import { WidgetLibrary } from './WidgetLibrary.js';
import { WidgetConfigModal } from './WidgetConfigModal.js';
import { SharedDashboardModal } from './SharedDashboardModal.js';
import { useDashboard } from '../../context/DashboardContext.js';

export const DashboardModals = () => {
    const {
        showWidgetLibrary,
        closeWidgetLibrary,
        addWidget,
        createCustomWidget,
        showWidgetConfig,
        openWidgetConfig,
        closeWidgetConfig,
        editingWidget,
        permissions,
        updateWidget,
        showSharedDashboard,
        closeSharedDashboard,
        sharedDashboardMode
    } = useDashboard();

    const handleAddWidget = async (widgetData) => {
        if (widgetData.openConfig) {
            closeWidgetLibrary();
            openWidgetConfig();
            return;
        }
        await addWidget(widgetData);
        closeWidgetLibrary();
    };

    const handleSaveWidgetConfig = async (widgetData) => {
        if (editingWidget) {
            await updateWidget(editingWidget.id, widgetData.config || widgetData);
        } else {
            await createCustomWidget(widgetData);
        }
        closeWidgetConfig();
    };

    const isPersonalMode = window.DASHBOARDNG_CONFIG?.pageMode === 'personal';

    return html`
        ${isPersonalMode && html`
            <${SharedDashboardModal}
                isOpen=${showSharedDashboard}
                onClose=${closeSharedDashboard}
                initialMode=${sharedDashboardMode}
            />
        `}
        ${permissions?.canEdit && html`
            <${WidgetLibrary}
                isOpen=${showWidgetLibrary}
                onClose=${closeWidgetLibrary}
                onAddWidget=${handleAddWidget}
            />
            <${WidgetConfigModal}
                isOpen=${showWidgetConfig}
                onClose=${closeWidgetConfig}
                onSave=${handleSaveWidgetConfig}
                initialConfig=${editingWidget?.config}
                editMode=${Boolean(editingWidget)}
            />
        `}
    `;
};

export default DashboardModals;
