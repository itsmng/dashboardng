import { render, html, useEffect, useRef } from './lib/preact.js';

import { PeriodProvider } from './context/PeriodContext.js';
import { RefreshProvider } from './lib/hooks/useRefresh.js';
import { DashboardProvider } from './context/DashboardContext.js';

import { DashboardHeader } from './components/ui/DashboardHeader.js';
import { DashboardGrid } from './components/ui/DashboardGrid.js';
import { DashboardModals } from './components/ui/DashboardModals.js';

import { useDashboard } from './context/DashboardContext.js';

import './components/ui/ErrorBoundary.js';

const DashboardAppInner = () => {
    const {
        dashboard,
        widgets,
        editMode,
        loadDashboard,
        loadDashboardById,
        getSelectedDashboardId,
        saveWidgetPositions,
        toggleEditMode,
        openWidgetLibrary,
        openWidgetConfig,
        updateWidget: _updateWidget,
        deleteWidget,
        openSharedDashboard
    } = useDashboard();

    const gridRef = useRef(null);
    const saveWidgetPositionsRef = useRef(saveWidgetPositions);

    useEffect(() => {
        saveWidgetPositionsRef.current = saveWidgetPositions;
    }, [saveWidgetPositions]);

    useEffect(() => {
        const storedId = getSelectedDashboardId();
        if (storedId) {
            loadDashboardById(storedId).then((success) => {
                if (!success) {
                    loadDashboard();
                }
            });
            return;
        }
        loadDashboard();
    }, [getSelectedDashboardId, loadDashboard, loadDashboardById]);

    useEffect(() => {
        if (!gridRef.current?.gridstack) {
            return;
        }

        gridRef.current.gridstack.destroy(false);
        gridRef.current.gridstack = null;
        gridRef.current.grid = null;
    }, [dashboard?.id]);

    useEffect(() => {
        if (!gridRef.current || widgets.length === 0) {
            return;
        }

        if (gridRef.current.gridstack) {
            return;
        }

        try {
            const grid = GridStack.init({
                column: 12,
                cellHeight: '80px',
                float: false,
                animate: true,
                disableOneColumnMode: false,
                columnOpts: {
                    breakpoints: [
                        { w: 768, c: 1 },
                        { w: 992, c: 6 },
                        { w: 1200, c: 12 }
                    ]
                }
            }, gridRef.current);

            grid.on('change', (event, items) => {
                const positions = items.map(item => ({
                    id: item.id,
                    x: item.x,
                    y: item.y,
                    w: item.w,
                    h: item.h
                }));
                saveWidgetPositionsRef.current(positions);
            });

            gridRef.current.grid = grid;

            grid.disable();
        } catch (error) {
            console.error('GridStack initialization error:', error);
        }
    }, [widgets, saveWidgetPositions]);

    useEffect(() => {
        if (!gridRef.current?.gridstack) {
            return;
        }

        const grid = gridRef.current.gridstack;
        const items = gridRef.current.querySelectorAll('.grid-stack-item');
        items.forEach((item) => {
            if (!item.gridstackNode) {
                grid.makeWidget(item);
            }
        });

        if (editMode) {
            grid.enable();
        } else {
            grid.disable();
        }
    }, [editMode, widgets]);

    const handleToggleEditMode = () => {
        const success = toggleEditMode(!editMode);
        if (success && gridRef.current?.gridstack) {
            if (!editMode) {
                gridRef.current.gridstack.enable();
            } else {
                gridRef.current.gridstack.disable();
            }
        }
    };

    const handleDeleteWidget = async (widgetId) => {
        const success = await deleteWidget(widgetId);
        if (success && gridRef.current?.gridstack) {
            const el = gridRef.current.querySelector(`[gs-id="${widgetId}"]`);
            if (el) {
                gridRef.current.gridstack.removeWidget(el);
            }
        }
    };

    const handleEditWidget = (widget) => {
        openWidgetConfig(widget);
    };

    return html`
        <div class="dashboard-ng ${editMode ? 'edit-mode' : ''}">
            <${DashboardHeader}
                onOpenWidgetLibrary=${openWidgetLibrary}
                onToggleEditMode=${handleToggleEditMode}
                onOpenSharedDashboard=${() => openSharedDashboard('load')}
            />
            <${DashboardGrid} gridRef=${gridRef} onDeleteWidget=${handleDeleteWidget} onEditWidget=${handleEditWidget} />
            <${DashboardModals} />
        </div>
    `;
};

const DashboardApp = () => {
    return html`
        <${PeriodProvider}>
            <${RefreshProvider}>
                <${DashboardProvider}>
                    <${DashboardAppInner} />
                <//>
            <//>
        <//>
    `;
};

const container = document.getElementById('dashboardng-app');
if (container) {
    render(html`<${DashboardApp} />`, container);
}
