import { h, createContext, useState, useCallback, useContext } from '../lib/preact.js';
import { api } from '../lib/config.js';

const DASHBOARD_STORAGE_KEY = 'dashboardng_unsaved_changes';

const saveToLocalStorage = (data) => {
    try {
        localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.error('Failed to save to localStorage:', err);
    }
};

const loadFromLocalStorage = () => {
    try {
        const data = localStorage.getItem(DASHBOARD_STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error('Failed to load from localStorage:', err);
        return null;
    }
};

const clearLocalStorage = () => {
    try {
        localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    } catch (err) {
        console.error('Failed to clear localStorage:', err);
    }
};

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
    const [dashboard, setDashboard] = useState(null);
    const [widgets, setWidgets] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
    const [showWidgetConfig, setShowWidgetConfig] = useState(false);
    const [editingWidget, setEditingWidget] = useState(null);
    const [authzError, setAuthzError] = useState(null);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await api.fetch('/dashboards/widgets');
            if (result.success) {
                setDashboard(result.data.dashboard);
                setWidgets(result.data.widgets || []);
                setAuthzError(null);
                setEditMode(false);
                setUnsavedChanges(false);
                clearLocalStorage();
            } else if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveDashboard = useCallback(async () => {
        if (!unsavedChanges) return true;

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
        } catch (err) {
            console.error('Failed to save dashboard:', err);
            setAuthzError(__('Failed to save dashboard', 'dashboardng'));
            return false;
        }
    }, [dashboard, widgets, unsavedChanges]);

    const saveWidgetPositions = useCallback(async (positions) => {
        saveToLocalStorage({
            dashboard,
            widgets: widgets.map(w => {
                const pos = positions.find(p => p.id === w.id);
                return pos ? { ...w, x: pos.x, y: pos.y, width: pos.w, height: pos.h } : w;
            }),
            timestamp: new Date().toISOString()
        });

        try {
            const result = await api.post('/dashboards/positions', {
                positions: positions.map(p => ({
                    ...p,
                    width: p.w,
                    height: p.h
                })),
                dashboard_id: dashboard?.id
            });
            if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
                setEditMode(false);
            }
        } catch (err) {
            console.error('Failed to save widget positions:', err);
        }
    }, [dashboard, widgets]);

    const addWidget = useCallback(async (widgetData) => {
        const newWidgets = [...widgets];
        newWidgets.push({
            ...widgetData,
            id: `temp_${Date.now()}`,
            width: widgetData.width || widgetData.default_width || 4,
            height: widgetData.height || widgetData.default_height || 4
        });
        setWidgets(newWidgets);
        setUnsavedChanges(true);

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
                setUnsavedChanges(false);
                clearLocalStorage();

                if (result.data.dashboard_id && result.data.dashboard_id !== dashboard?.id) {
                    const dashResult = await api.fetch('/dashboards/widgets');
                    if (dashResult.success) {
                        setDashboard(dashResult.data.dashboard);
                    }
                }
                return true;
            } else if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
                setWidgets(widgets);
                return false;
            }
        } catch (err) {
            console.error('Failed to add widget:', err);
            setWidgets(widgets);
            return false;
        }
        return false;
    }, [dashboard, widgets]);

    const updateWidget = useCallback(async (widgetId, updates) => {
        const configUpdates = updates?.config ?? updates;
        const width = updates?.width ?? updates?.default_width;
        const height = updates?.height ?? updates?.default_height;
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
        } catch (err) {
            console.error('Failed to update widget:', err);
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
        } catch (err) {
            console.error('Failed to delete widget:', err);
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
        setAuthzError(null);
        setEditMode(enabled);
        return true;
    }, [dashboard, unsavedChanges]);

    const openWidgetLibrary = useCallback(() => {
        setShowWidgetLibrary(true);
    }, []);

    const closeWidgetLibrary = useCallback(() => {
        setShowWidgetLibrary(false);
    }, []);

    const openWidgetConfig = useCallback((widget = null) => {
        setEditingWidget(widget);
        setShowWidgetConfig(true);
    }, []);

    const closeWidgetConfig = useCallback(() => {
        setShowWidgetConfig(false);
        setEditingWidget(null);
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
        editingWidget,
        authzError,
        unsavedChanges,
        isLoading,
        loadDashboard,
        saveDashboard,
        saveWidgetPositions,
        addWidget,
        updateWidget,
        deleteWidget,
        toggleEditMode,
        openWidgetLibrary,
        closeWidgetLibrary,
        openWidgetConfig,
        closeWidgetConfig,
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
