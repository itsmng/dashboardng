import { h, Fragment } from '../../lib/preact.js';
import { WidgetLibrary } from './WidgetLibrary.js';
import { WidgetConfigModal } from './WidgetConfigModal.js';
import { SharedDashboardModal } from './SharedDashboardModal.js';
import { useDashboard } from '../../context/DashboardContext.js';

interface WidgetDataWithConfig {
    openConfig?: boolean;
    config?: Record<string, unknown>;
    widget_type?: string;
    [key: string]: unknown;
}

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

    const handleAddWidget = async (widgetData: WidgetDataWithConfig) => {
        if (widgetData.openConfig) {
            closeWidgetLibrary();
            openWidgetConfig();
            return;
        }
        await addWidget(widgetData as Parameters<typeof addWidget>[0]);
        closeWidgetLibrary();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSaveWidgetConfig = async (result: any) => {
        if (editingWidget) {
            await updateWidget(editingWidget.id, result.config || result);
        } else {
            await createCustomWidget(result as Parameters<typeof createCustomWidget>[0]);
        }
        closeWidgetConfig();
    };

    const isPersonalMode = window.DASHBOARDNG_CONFIG?.pageMode === 'personal';

    return (
        <>
            {isPersonalMode && (
                <SharedDashboardModal
                    isOpen={showSharedDashboard}
                    onClose={closeSharedDashboard}
                    initialMode={sharedDashboardMode as "load" | "create-personal" | "create-shared"}
                />
            )}
            {permissions?.canEdit && (
                <>
                    <WidgetLibrary
                        isOpen={showWidgetLibrary}
                        onClose={closeWidgetLibrary}
                        onAddWidget={handleAddWidget}
                    />
                    <WidgetConfigModal
                        isOpen={showWidgetConfig}
                        onClose={closeWidgetConfig}
                        onSave={handleSaveWidgetConfig}
                        initialConfig={editingWidget?.config as Record<string, unknown>}
                        editMode={Boolean(editingWidget)}
                    />
                </>
            )}
        </>
    );
};

export default DashboardModals;
