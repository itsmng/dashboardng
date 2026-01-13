import { render, html, useState, useEffect, useRef, useCallback, useContext } from './lib/preact.js';
import { CONFIG, api } from './lib/config.js';

import { PeriodProvider, usePeriod } from './context/PeriodContext.js';
import { RefreshProvider, useRefresh } from './lib/hooks/useRefresh.js';

import { getWidgetComponent } from './widgets/registry.js';

import { PeriodSelector } from './components/ui/PeriodSelector.js';
import { GridStackWidget } from './components/ui/GridStackWidget.js';
import { WidgetConfigModal } from './components/ui/WidgetConfigModal.js';
import { WidgetLibrary } from './components/ui/WidgetLibrary.js';

/**
 * Dashboard Application Inner Component
 * Manages dashboard widgets, layout, and user interactions
 *
 * @component
 * @returns {import('preact').VNode} Rendered dashboard interface
 */
const DashboardAppInner = () => {
    const { period, setPeriod } = usePeriod();
    const { refreshSignal, triggerRefresh } = useRefresh();

    const [dashboard, setDashboard] = useState(null);
    const [widgets, setWidgets] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
    const [showWidgetConfig, setShowWidgetConfig] = useState(false);
    const [editingWidget, setEditingWidget] = useState(null);
    const gridRef = useRef(null);

    useEffect(() => {
        setLastUpdate(new Date());
    }, [refreshSignal]);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const result = await api.fetch('/dashboards/widgets');
                if (result.success) {
                    setDashboard(result.data.dashboard);
                    setWidgets(result.data.widgets || []);
                }
            } catch (err) {
                console.error('Failed to load dashboard:', err);
            }
        };
        loadDashboard();
    }, []);

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
                cellHeight: '70px',
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

                clearTimeout(window.gridstackSaveTimeout);
                window.gridstackSaveTimeout = setTimeout(() => {
                    api.post('/dashboards/positions', {
                        positions,
                        dashboard_id: dashboard?.id
                    }).catch(err => {
                        console.error('Failed to save widget positions:', err);
                    });
                }, 500);
            });

            grid.on('dragstop', (event, item) => {
                setWidgets(prev => prev.map(w => {
                    if (w.id === item.id) {
                        return { ...w, x: item.x, y: item.y };
                    }
                    return w;
                }));
            });

            grid.on('resizestop', (event, item) => {
                setWidgets(prev => prev.map(w => {
                    if (w.id === item.id) {
                        return { ...w, w: item.w, h: item.h };
                    }
                    return w;
                }));

                window.dispatchEvent(new Event('resize'));
            });

            gridRef.current.grid = grid;

            grid.disable();
        } catch (err) {
            console.error('GridStack initialization error:', err);
        }
    }, [widgets]);

    const toggleEditMode = useCallback((enabled) => {
        setEditMode(enabled);
        if (gridRef.current?.gridstack) {
            if (enabled) {
                gridRef.current.gridstack.enable();
            } else {
                gridRef.current.gridstack.disable();
            }
        }
    }, []);

    const handleAddWidget = useCallback(async (widgetData) => {
        if (widgetData.openConfig) {
            setEditingWidget(null);
            setShowWidgetConfig(true);
            setShowWidgetLibrary(false);
            return;
        }

        try {
            const result = await api.post('/dashboards/widgets', {
                widget_definition_id: widgetData.id || widgetData.widget_definition_id,
                dashboard_id: dashboard?.id,
                x: widgetData.x ?? 0,
                y: widgetData.y,
                width: widgetData.width || widgetData.default_width || 4,
                height: widgetData.height || widgetData.default_height || 4,
            });

            if (result.success) {
                setWidgets(result.data.widgets || []);

                if (result.data.dashboard_id && result.data.dashboard_id !== dashboard?.id) {
                    const dashResult = await api.fetch('/dashboards/widgets');
                    if (dashResult.success) {
                        setDashboard(dashResult.data.dashboard);
                    }
                }

                setShowWidgetLibrary(false);
            }
        } catch (err) {
            console.error('Failed to add widget:', err);
        }
    }, [dashboard]);

    const handleDeleteWidget = useCallback(async (widgetId) => {
        if (!confirm(__('Are you sure you want to remove this widget from the dashboard?', 'dashboardng'))) {
            return;
        }

        // Check if this is a global dashboard
        if (dashboard?.users_id === 0 || dashboard?.is_global) {
            alert(__('Cannot edit global dashboard. Create a personal dashboard first.', 'dashboardng'));
            return;
        }

        try {
            const result = await api.delete(`/dashboards/widgets/${widgetId}`);

            if (result.success) {
                if (gridRef.current?.gridstack) {
                    const el = gridRef.current.querySelector(`[gs-id="${widgetId}"]`);
                    if (el) {
                        gridRef.current.gridstack.removeWidget(el);
                    }
                }

                setWidgets(prev => prev.filter(w => w.id !== widgetId));
            }
        } catch (err) {
            console.error('Failed to delete widget:', err);
        }
    }, [dashboard]);

    const handleEditWidget = useCallback((widget) => {
        setEditingWidget(widget);
        setShowWidgetConfig(true);
    }, []);

    const handleSaveWidgetConfig = useCallback(async (widgetData) => {
        try {
            const result = await api.post('/widgets/create', {
                config: widgetData.config,
                dashboard_id: dashboard?.id,
                width: widgetData.width || 4,
                height: widgetData.height || 4,
                add_to_dashboard: true,
            });

            if (result.success && result.data.dashboard_id) {
                const dashResult = await api.fetch(`/dashboards/${result.data.dashboard_id}/widgets`);
                if (dashResult.success) {
                    setDashboard(dashResult.data.dashboard);
                    setWidgets(dashResult.data.widgets || []);
                }
            }

            setShowWidgetConfig(false);
            setEditingWidget(null);
        } catch (err) {
            console.error('Failed to save widget config:', err);
        }
    }, [dashboard]);

    const formatTimeAgo = (date) => {
        if (!date) return '';
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        return date.toLocaleTimeString();
    };

    // Render widget content based on visualization type
    const renderWidgetContent = (widget) => {
        const config = widget.config || {};
        const visualization = config.visualization || widget.visualization || 'card';

        const WidgetComponent = getWidgetComponent('custom', { visualization });

        if (!WidgetComponent) {
            return html`<div class="alert alert-warning">
                Unknown visualization: ${visualization}
                <pre style="font-size: 10px; margin-top: 10px;">${JSON.stringify(config, null, 2)}</pre>
            </div>`;
        }

        return html`<${WidgetComponent} config=${config} widgetId=${widget.id} />`;
    };

    const renderWidget = (widget) => html`
        <${GridStackWidget}
            key=${widget.id}
            id=${widget.id}
            x=${widget.x}
            y=${widget.y}
            w=${widget.w || widget.width}
            h=${widget.h || widget.height}
            editMode=${editMode}
        >
            <div class="h-100 widget-wrapper ${editMode ? 'edit-mode' : ''}">
                ${editMode && html`
                    <div class="widget-controls">
                        <button
                            class="btn btn-sm btn-outline-danger widget-delete-btn"
                            onClick=${(e) => { e.stopPropagation(); handleDeleteWidget(widget.id); }}
                            title=${__('Remove Widget', 'dashboardng')}
                        >
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `}
                ${renderWidgetContent(widget)}
            </div>
        <//>
    `;

    return html`
        <div class="dashboard-ng ${editMode ? 'edit-mode' : ''}">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="d-flex align-items-center gap-3">
                    <${PeriodSelector} value=${period} onChange=${setPeriod} />
                    ${lastUpdate && html`
                        <small class="text-muted">
                            <i class="fas fa-sync-alt me-1"></i>
                            ${__('Last updated', 'dashboardng')}: ${formatTimeAgo(lastUpdate)}
                        </small>
                    `}
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button
                        class="btn btn-outline-primary btn-sm"
                        onClick=${triggerRefresh}
                    >
                        <i class="fas fa-refresh me-1"></i>
                        ${__('Refresh', 'dashboardng')}
                    </button>
                    <button
                        class="btn btn-outline-success btn-sm"
                        onClick=${() => setShowWidgetLibrary(true)}
                    >
                        <i class="fas fa-plus me-1"></i>
                        ${__('Add Widget', 'dashboardng')}
                    </button>
                    <button
                        class="btn btn-outline-secondary btn-sm"
                        onClick=${() => toggleEditMode(!editMode)}
                    >
                        <i class="fas fa-${editMode ? 'check' : 'edit'} me-1"></i>
                        ${editMode ? __('Done', 'dashboardng') : __('Edit Layout', 'dashboardng')}
                    </button>
                </div>
            </div>

            <div ref=${gridRef} class="grid-stack">
                ${widgets.filter(w => w.enabled !== false).map(widget => renderWidget(widget))}
            </div>

            <${WidgetLibrary}
                isOpen=${showWidgetLibrary}
                onClose=${() => setShowWidgetLibrary(false)}
                onAddWidget=${handleAddWidget}
            />

            <${WidgetConfigModal}
                isOpen=${showWidgetConfig}
                onClose=${() => { setShowWidgetConfig(false); setEditingWidget(null); }}
                onSave=${handleSaveWidgetConfig}
                initialConfig=${editingWidget?.config}
                editMode=${!!editingWidget}
            />
        </div>
    `;
};

/**
 * Dashboard Application Main Component
 * Wraps dashboard with context providers
 *
 * @component
 * @returns {import('preact').VNode} Rendered dashboard with providers
 */
const DashboardApp = () => {
    return html`
        <${PeriodProvider}>
            <${RefreshProvider}>
                <${DashboardAppInner} />
            <//>
        <//>
    `;
};

const container = document.getElementById('dashboardng-app');
if (container) {
    render(html`<${DashboardApp} />`, container);
}

/**
 * @typedef {Object} DashboardData
 * @property {Object} dashboard - Dashboard metadata
 * @property {string} dashboard.id - Dashboard ID
 * @property {number} dashboard.users_id - Owner user ID
 * @property {boolean} dashboard.is_global - Whether dashboard is global
 * @property {DashboardWidget[]} widgets - Array of dashboard widgets
 */

/**
 * @typedef {Object} DashboardWidget
 * @property {string|number} id - Widget ID
 * @property {number} x - X grid position
 * @property {number} y - Y grid position
 * @property {number} [w] - Width in grid units
 * @property {number} [h] - Height in grid units
 * @property {number} [width] - Alternative width field
 * @property {number} [height] - Alternative height field
 * @property {WidgetConfig} [config] - Widget configuration
 * @property {string} [visualization] - Visualization type
 * @property {boolean} [enabled] - Whether widget is enabled
 */
