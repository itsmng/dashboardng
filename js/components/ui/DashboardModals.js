import { html } from '../../lib/preact.js';
import { WidgetLibrary } from './WidgetLibrary.js';
import { WidgetConfigModal } from './WidgetConfigModal.js';
import { useDashboard } from '../../context/DashboardContext.js';

export const DashboardModals = () => {
    const {
        showWidgetLibrary,
        closeWidgetLibrary,
        addWidget,
        showWidgetConfig,
        closeWidgetConfig,
        editingWidget,
        dashboard,
        updateWidget
    } = useDashboard();

    const handleAddWidget = async (widgetData) => {
        if (widgetData.openConfig) {
            closeWidgetLibrary();
            return;
        }
        await addWidget(widgetData);
        closeWidgetLibrary();
    };

    const handleSaveWidgetConfig = async (widgetData) => {
        if (editingWidget) {
            await updateWidget(editingWidget.widget_definition_id ?? editingWidget.id, widgetData.config || widgetData);
        } else {
            await addWidget(widgetData);
        }
        closeWidgetConfig();
    };



    return html`
        ${(!dashboard?.is_global || window.DASHBOARDNG_CONFIG?.canEditGlobalDashboard) && html`
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
                editMode=${!!editingWidget}
            />
        `}
    `;
};

export default DashboardModals;
