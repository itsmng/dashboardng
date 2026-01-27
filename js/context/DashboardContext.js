import { h, createContext, useState, useCallback, useContext } from '../lib/preact.js';
import { api } from '../lib/config.js';
import { __ } from '../lib/i18n.js';

const DASHBOARD_STORAGE_KEY = 'dashboardng_unsaved_changes';

const saveToLocalStorage = (data) => {
    try {
        localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
};

const loadFromLocalStorage = () => {
    try {
        const data = localStorage.getItem(DASHBOARD_STORAGE_KEY);
        return data ? JSON.parse(data) : undefined;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return ;
    }
};

const clearLocalStorage = () => {
    try {
        localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear localStorage:', error);
    }
};

const normalizePositions = (positions = []) => positions.map((pos) => ({
    id: pos.id,
    x: pos.x,
    y: pos.y,
    w: pos.w ?? pos.width,
    h: pos.h ?? pos.height
}));

const DashboardContext = createContext(undefined);

export const DashboardProvider = ({ children }) => {
    const [dashboard, setDashboard] = useState(undefined);
    const [widgets, setWidgets] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(undefined);
    const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
    const [showWidgetConfig, setShowWidgetConfig] = useState(false);
    const [showSharedDashboard, setShowSharedDashboard] = useState(false);
    const [editingWidget, setEditingWidget] = useState(undefined);
    const [authzError, setAuthzError] = useState(undefined);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await api.fetch('/dashboards/widgets');
            if (result.success) {
                setDashboard(result.data.dashboard);
                setWidgets(result.data.widgets || []);
                setAuthzError(undefined);
                setEditMode(false);
                setUnsavedChanges(false);
                clearLocalStorage();
            } else if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadDashboardById = useCallback(async (dashboardId) => {
        setIsLoading(true);
        try {
            const result = await api.fetch(`/dashboards/${dashboardId}/widgets`);
            if (result.success) {
                setDashboard(result.data.dashboard);
                setWidgets(result.data.widgets || []);
                setAuthzError(undefined);
                setEditMode(false);
                setUnsavedChanges(false);
                clearLocalStorage();
            } else if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadDashboards = useCallback(async () => {
        try {
            const result = await api.fetch('/dashboards');
            if (result.success) {
                if (Array.isArray(result.data)) {
                    return result.data;
                }
                return result.data?.dashboards || [];
            }
            return [];
        } catch (error) {
            console.error('Failed to load dashboards:', error);
            return [];
        }
    }, []);

    const createPersonalDashboard = useCallback(async (sourceDashboardId) => {
        try {
            const result = await api.post('/dashboards/personal', {
                name: 'My Dashboard',
                source_dashboard_id: sourceDashboardId
            });
            if (result.success) {
                const nextDashboard = result.data?.dashboard || result.data;
                if (nextDashboard?.id) {
                    await loadDashboardById(nextDashboard.id);
                    return nextDashboard;
                }
                await loadDashboard();
                return nextDashboard;
            }
            return ;
        } catch (error) {
            console.error('Failed to create personal dashboard:', error);
            return ;
        }
    }, [loadDashboard, loadDashboardById]);

    const createSharedDashboard = useCallback(async (name, sourceDashboardId) => {
        try {
            const result = await api.post('/dashboards/shared', {
                name,
                source_dashboard_id: sourceDashboardId
            });
            if (result.success) {
                return result.dashboard || result.data?.dashboard || result.data;
            }
            return ;
        } catch (error) {
            console.error('Failed to create shared dashboard:', error);
            return ;
        }
    }, []);

    const saveDashboard = useCallback(async () => {
        if (!unsavedChanges) {return true;}

        saveToLocalStorage({
            dashboard,
            widgets,
            timestamp: new Date().toISOString()
        });

        try {
            const result = await api.post('/dashboards/widgets', {
                dashboard_id: dashboard?.id,
                widgets: widgets.map(w => ({
                    ...w,
                    width: w.width || w.w,
                    height: w.height || w.h
                }))
            });

            if (result.success) {
                setUnsavedChanges(false);
                clearLocalStorage();
                if (result.data.dashboard) {
                    setDashboard(result.data.dashboard);
                }
                if (result.data.widgets) {
                    setWidgets(result.data.widgets);
                }
                return true;
            } else {
                setAuthzError(result.error || __('Failed to save dashboard', 'dashboardng'));
                return false;
            }
        } catch (error) {
            console.error('Failed to save dashboard:', error);
            setAuthzError(__('Failed to save dashboard', 'dashboardng'));
            return false;
        }
    }, [dashboard, widgets, unsavedChanges]);

    const saveWidgetPositions = useCallback(async (positions) => {
        const normalizedPositions = normalizePositions(positions);
        const nextWidgets = widgets.map(w => {
            const pos = normalizedPositions.find(p => String(p.id) === String(w.id));
            return pos ? {
                ...w,
                x: pos.x ?? w.x,
                y: pos.y ?? w.y,
                width: pos.w ?? w.width ?? w.w,
                height: pos.h ?? w.height ?? w.h
            } : w;
        });

        saveToLocalStorage({
            dashboard,
            widgets: nextWidgets,
            timestamp: new Date().toISOString()
        });

        try {
            const result = await api.post('/dashboards/positions', {
                positions: normalizedPositions.map(p => ({
                    id: p.id,
                    x: p.x,
                    y: p.y,
                    w: p.w,
                    h: p.h
                })),
                dashboard_id: dashboard?.id
            });
            if (result.success) {
                setWidgets(nextWidgets);
                if (!unsavedChanges) {
                    clearLocalStorage();
                }
                return;
            }
            if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
                setEditMode(false);
            }
        } catch (error) {
            console.error('Failed to save widget positions:', error);
        }
    }, [dashboard, unsavedChanges, widgets]);

    const addWidget = useCallback(async (widgetData) => {
        const previousWidgets = widgets;
        const wasUnsaved = unsavedChanges;
        const defaultWidth = widgetData.default_width ?? widgetData.width ?? 4;
        const defaultHeight = widgetData.default_height ?? widgetData.height ?? 4;
        const x = widgetData.x ?? 0;
        const nextY = widgetData.y ?? previousWidgets.reduce((maxY, widget) => {
            const widgetY = widget.y ?? 0;
            const widgetHeight = widget.height ?? widget.h ?? 0;
            const bottom = widgetY + widgetHeight;
            return bottom > maxY ? bottom : maxY;
        }, 0);
        const config = widgetData.config ? { ...widgetData.config } : {};
        if (!config.itemtype && widgetData.itemtype) {
            config.itemtype = widgetData.itemtype;
        }
        if (!config.visualization && widgetData.visualization) {
            config.visualization = widgetData.visualization;
        }

        const newWidgets = [...previousWidgets];
        newWidgets.push({
            ...widgetData,
            id: `temp_${Date.now()}`,
            x,
            y: nextY,
            width: widgetData.width ?? defaultWidth,
            height: widgetData.height ?? defaultHeight,
            config,
        });
        setWidgets(newWidgets);
        setUnsavedChanges(true);

        try {
            const result = await api.post('/dashboards/widgets', {
                widget_definition_id: widgetData.id || widgetData.widget_definition_id,
                dashboard_id: dashboard?.id,
                x,
                y: nextY,
                width: defaultWidth,
                height: defaultHeight,
            });

            if (result.success) {
                setWidgets(result.data.widgets || []);
                setUnsavedChanges(false);
                clearLocalStorage();

                if (result.data.dashboard_id && result.data.dashboard_id !== dashboard?.id) {
                    const dashResult = await api.fetch('/dashboards/widgets');
                    if (dashResult.success) {
                        setDashboard(dashResult.data.dashboard);
                    }
                }
                return true;
            }

            if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
            } else if (result.error) {
                setAuthzError(result.error);
            }

            setWidgets(previousWidgets);
            setUnsavedChanges(wasUnsaved);
            return false;
        } catch (error) {
            console.error('Failed to add widget:', error);
            setAuthzError(__('Failed to add widget', 'dashboardng'));
            setWidgets(previousWidgets);
            setUnsavedChanges(wasUnsaved);
            return false;
        }
    }, [dashboard, unsavedChanges, widgets]);

    const createCustomWidget = useCallback(async (widgetData) => {
        const config = widgetData?.config ?? widgetData;
        if (!config) {
            return false;
        }

        const defaultWidth = widgetData?.default_width ?? widgetData?.width ?? 4;
        const defaultHeight = widgetData?.default_height ?? widgetData?.height ?? 4;

        try {
            const result = await api.post('/widgets/create', {
                config,
                widget_type: widgetData?.widget_type ?? 'custom',
                add_to_dashboard: false,
                default_width: defaultWidth,
                default_height: defaultHeight
            });

            if (result.success) {
                return await addWidget({
                    id: result.data.widget_id,
                    widget_definition_id: result.data.widget_id,
                    default_width: defaultWidth,
                    default_height: defaultHeight,
                    widget_type: widgetData?.widget_type ?? 'custom',
                    visualization: config?.visualization,
                    itemtype: config?.itemtype,
                    config
                });
            }

            if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
            } else if (result.error) {
                setAuthzError(result.error);
            }
        } catch (error) {
            console.error('Failed to create widget:', error);
            setAuthzError(__('Failed to create widget', 'dashboardng'));
        }
        return false;
    }, [addWidget]);

    const updateWidget = useCallback(async (widgetId, updates) => {
        const configUpdates = updates?.config ?? updates;
        const width = updates?.default_width;
        const height = updates?.default_height;
        const newWidgets = widgets.map(w => {
            if (w.id !== widgetId && w.widget_definition_id !== widgetId) {
                return w;
            }

            return {
                ...w,
                config: configUpdates ? { ...w.config, ...configUpdates } : w.config,
                ...(width !== undefined ? { width } : {}),
                ...(height !== undefined ? { height } : {})
            };
        });
        setWidgets(newWidgets);
        setUnsavedChanges(true);

        saveToLocalStorage({
            dashboard,
            widgets: newWidgets,
            timestamp: new Date().toISOString()
        });

        try {
            const result = await api.post('/widgets/create', {
                widget_id: widgetId,
                update_only: true,
                config: configUpdates,
                width,
                height
            });
            if (result.success) {
                setUnsavedChanges(false);
                clearLocalStorage();
            }
        } catch (error) {
            console.error('Failed to update widget:', error);
        }
    }, [dashboard, widgets]);

    const deleteWidget = useCallback(async (widgetId) => {
        const newWidgets = widgets.filter(w => w.id !== widgetId);
        setWidgets(newWidgets);
        setUnsavedChanges(true);

        try {
            const result = await api.delete(`/dashboards/widgets/${widgetId}`);
            if (result.success) {
                setUnsavedChanges(false);
                clearLocalStorage();
                return true;
            } else if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
                setWidgets(widgets);
                return false;
            }
        } catch (error) {
            console.error('Failed to delete widget:', error);
            setWidgets(widgets);
            return false;
        }
        return false;
    }, [widgets]);

    const toggleEditMode = useCallback((enabled) => {
        if (enabled && unsavedChanges) {
            if (!confirm(__('You have unsaved changes. Do you want to save them before entering edit mode?', 'dashboardng'))) {
                return false;
            }
        }

        if (enabled && dashboard?.is_global && !window.DASHBOARDNG_CONFIG?.canEditGlobalDashboard) {
            setAuthzError(__('You are not authorized to edit the global dashboard', 'dashboardng'));
            return false;
        }
        setAuthzError(undefined);
        setEditMode(enabled);
        return true;
    }, [dashboard, unsavedChanges]);

    const openWidgetLibrary = useCallback(() => {
        setShowWidgetLibrary(true);
    }, []);

    const closeWidgetLibrary = useCallback(() => {
        setShowWidgetLibrary(false);
    }, []);

    const openWidgetConfig = useCallback((widget = undefined) => {
        setEditingWidget(widget);
        setShowWidgetConfig(true);
    }, []);

    const closeWidgetConfig = useCallback(() => {
        setShowWidgetConfig(false);
        setEditingWidget(undefined);
    }, []);

    const openSharedDashboard = useCallback(() => {
        setShowSharedDashboard(true);
    }, []);

    const closeSharedDashboard = useCallback(() => {
        setShowSharedDashboard(false);
    }, []);

    const resetChanges = useCallback(() => {
        const savedData = loadFromLocalStorage();
        if (savedData) {
            if (confirm(__('You have unsaved changes from a previous session. Would you like to restore them?', 'dashboardng'))) {
                setDashboard(savedData.dashboard);
                setWidgets(savedData.widgets);
                setUnsavedChanges(true);
            } else {
                clearLocalStorage();
            }
        }
    }, []);

    const value = {
        dashboard,
        widgets,
        editMode,
        lastUpdate,
        setLastUpdate,
        showWidgetLibrary,
        showWidgetConfig,
        showSharedDashboard,
        editingWidget,
        authzError,
        unsavedChanges,
        isLoading,
        loadDashboard,
        loadDashboardById,
        loadDashboards,
        createPersonalDashboard,
        createSharedDashboard,
        saveDashboard,
        saveWidgetPositions,
        addWidget,
        createCustomWidget,
        updateWidget,
        deleteWidget,
        toggleEditMode,
        openWidgetLibrary,
        closeWidgetLibrary,
        openWidgetConfig,
        closeWidgetConfig,
        openSharedDashboard,
        closeSharedDashboard,
        resetChanges
    };

    return h(DashboardContext.Provider, { value }, children);
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within DashboardProvider');
    }
    return context;
};

export default DashboardContext;
