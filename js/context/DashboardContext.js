import { h, createContext, useState, useCallback, useContext, useRef } from '../lib/preact.js';
import { api } from '../lib/config.js';
import { __ } from '../lib/i18n.js';

const DASHBOARD_STORAGE_KEY = 'dashboardng_unsaved_changes';

const getStorageKey = (dashboardId) => {
    if (!dashboardId) {
        return DASHBOARD_STORAGE_KEY;
    }
    return `${DASHBOARD_STORAGE_KEY}_${dashboardId}`;
};

const saveToLocalStorage = (data, dashboardId = data?.dashboard?.id) => {
    try {
        const key = getStorageKey(dashboardId);
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
};

const loadFromLocalStorage = (dashboardId) => {
    try {
        const key = getStorageKey(dashboardId);
        const data = localStorage.getItem(key);
        if (data) {
            return JSON.parse(data);
        }
        if (dashboardId) {
            const legacy = localStorage.getItem(DASHBOARD_STORAGE_KEY);
            if (legacy) {
                const parsed = JSON.parse(legacy);
                if (String(parsed?.dashboard?.id) === String(dashboardId)) {
                    return parsed;
                }
            }
        }
        return undefined;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return undefined;
    }
};

const clearLocalStorage = (dashboardId) => {
    try {
        if (dashboardId) {
            localStorage.removeItem(getStorageKey(dashboardId));
            const legacy = localStorage.getItem(DASHBOARD_STORAGE_KEY);
            if (legacy) {
                const parsed = JSON.parse(legacy);
                if (String(parsed?.dashboard?.id) === String(dashboardId)) {
                    localStorage.removeItem(DASHBOARD_STORAGE_KEY);
                }
            }
            return;
        }
        localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear localStorage:', error);
    }
};

const SELECTED_DASHBOARD_KEY = 'dashboardng_selected_dashboard';

const getSelectedDashboardKey = () => {
    const userId = window.DASHBOARDNG_CONFIG?.userId ?? 'guest';
    return `${SELECTED_DASHBOARD_KEY}_${userId}`;
};

const saveSelectedDashboardId = (dashboardId) => {
    if (!dashboardId) {
        return;
    }
    if (window.DASHBOARDNG_CONFIG?.pageMode !== 'personal') {
        return;
    }
    try {
        localStorage.setItem(getSelectedDashboardKey(), String(dashboardId));
    } catch (error) {
        console.error('Failed to save selected dashboard:', error);
    }
};

const loadSelectedDashboardId = () => {
    if (window.DASHBOARDNG_CONFIG?.pageMode !== 'personal') {
        return undefined;
    }
    try {
        const stored = localStorage.getItem(getSelectedDashboardKey());
        return stored ? stored : undefined;
    } catch (error) {
        console.error('Failed to load selected dashboard:', error);
        return undefined;
    }
};

const normalizePositions = (positions = []) => positions.map((pos) => ({
    id: pos.id,
    x: pos.x,
    y: pos.y,
    w: pos.w ?? pos.width,
    h: pos.h ?? pos.height
}));

const isTempWidgetId = (id) => typeof id === 'string' && id.startsWith('temp_');

const DashboardContext = createContext(undefined);

export const DashboardProvider = ({ children }) => {
    const [dashboard, setDashboard] = useState(undefined);
    const [widgets, setWidgets] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(undefined);
    const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
    const [showWidgetConfig, setShowWidgetConfig] = useState(false);
    const [showSharedDashboard, setShowSharedDashboard] = useState(false);
    const [sharedDashboardMode, setSharedDashboardMode] = useState('load');
    const [editingWidget, setEditingWidget] = useState(undefined);
    const [authzError, setAuthzError] = useState(undefined);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [permissions, setPermissions] = useState({
        canEdit: false,
        canEditGlobal: false,
        isPersonal: false,
        isGlobal: false,
    });
    const pendingTempPositionsRef = useRef(new Map());

    const resetChanges = useCallback((dashboardId) => {
        const savedData = loadFromLocalStorage(dashboardId);
        if (savedData) {
            if (confirm(__('You have unsaved changes from a previous session. Would you like to restore them?', 'dashboardng'))) {
                setDashboard(savedData.dashboard);
                setWidgets(savedData.widgets);
                setUnsavedChanges(true);
            } else {
                clearLocalStorage(dashboardId || savedData.dashboard?.id);
            }
        }
    }, []);

    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await api.fetch('/dashboards/widgets');
            if (result.success) {
                const nextDashboard = result.data.dashboard;
                const nextWidgets = result.data.widgets || [];

                setDashboard(nextDashboard);
                setWidgets(nextWidgets);
                setAuthzError(undefined);
                setEditMode(false);
                setUnsavedChanges(false);
                setPermissions({
                    canEdit: Boolean(result.data.can_edit),
                    canEditGlobal: Boolean(result.data.can_edit_global),
                    isPersonal: Boolean(result.data.is_personal),
                    isGlobal: Boolean(result.data.is_global ?? nextDashboard?.is_global),
                });
                saveSelectedDashboardId(nextDashboard?.id);
                resetChanges(nextDashboard?.id);
            } else if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
                setPermissions({
                    canEdit: false,
                    canEditGlobal: false,
                    isPersonal: false,
                    isGlobal: false,
                });
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    }, [resetChanges]);

    const loadDashboardById = useCallback(async (dashboardId) => {
        setIsLoading(true);
        try {
            const result = await api.fetch(`/dashboards/${dashboardId}/widgets`);
            if (result.success) {
                const nextDashboard = result.data.dashboard;
                const nextWidgets = result.data.widgets || [];

                setDashboard(nextDashboard);
                setWidgets(nextWidgets);
                setAuthzError(undefined);
                setEditMode(false);
                setUnsavedChanges(false);
                setPermissions({
                    canEdit: Boolean(result.data.can_edit),
                    canEditGlobal: Boolean(result.data.can_edit_global),
                    isPersonal: Boolean(result.data.is_personal),
                    isGlobal: Boolean(result.data.is_global ?? nextDashboard?.is_global),
                });
                saveSelectedDashboardId(nextDashboard?.id);
                resetChanges(nextDashboard?.id);
                return true;
            } else if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
                setPermissions({
                    canEdit: false,
                    canEditGlobal: false,
                    isPersonal: false,
                    isGlobal: false,
                });
                return false;
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
        return false;
    }, [resetChanges]);

    const loadGlobalDashboard = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await api.fetch('/dashboards/global/widgets');
            if (result.success) {
                const nextDashboard = result.data.dashboard;
                const nextWidgets = result.data.widgets || [];

                setDashboard(nextDashboard);
                setWidgets(nextWidgets);
                setAuthzError(undefined);
                setEditMode(false);
                setUnsavedChanges(false);
                setPermissions({
                    canEdit: Boolean(result.data.can_edit),
                    canEditGlobal: Boolean(result.data.can_edit_global),
                    isPersonal: Boolean(result.data.is_personal),
                    isGlobal: Boolean(result.data.is_global ?? nextDashboard?.is_global),
                    canViewWidgets: Boolean(result.data.can_view_widgets),
                    canUpdateWidgets: Boolean(result.data.can_update_widgets),
                    canCreateWidgets: Boolean(result.data.can_create_widgets),
                });
                resetChanges(nextDashboard?.id);
            } else if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
                setPermissions({
                    canEdit: false,
                    canEditGlobal: false,
                    isPersonal: false,
                    isGlobal: false,
                    canViewWidgets: false,
                    canUpdateWidgets: false,
                    canCreateWidgets: false,
                });
            }
        } catch (error) {
            console.error('Failed to load global dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    }, [resetChanges]);

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

    const createPersonalDashboard = useCallback(async (name, sourceDashboardId) => {
        try {
            const result = await api.post('/dashboards/personal', {
                name: name || 'My Dashboard',
                source_dashboard_id: sourceDashboardId
            });
            if (result.success) {
                return result.data?.dashboard || result.data;
            }
            return ;
        } catch (error) {
            console.error('Failed to create personal dashboard:', error);
            return ;
        }
    }, []);

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
                clearLocalStorage(dashboard?.id);
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
        const pendingTempPositions = pendingTempPositionsRef.current;
        normalizedPositions.forEach((pos) => {
            const posId = String(pos.id);
            if (isTempWidgetId(posId)) {
                pendingTempPositions.set(posId, {
                    x: pos.x,
                    y: pos.y,
                    w: pos.w,
                    h: pos.h,
                });
            }
        });
        const realPositions = normalizedPositions.filter((pos) => !isTempWidgetId(String(pos.id)));
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

        if (realPositions.length === 0) {
            setWidgets(nextWidgets);
            return;
        }

        try {
            const result = await api.post('/dashboards/positions', {
                positions: realPositions.map(p => ({
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
                    clearLocalStorage(dashboard?.id);
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
        const tempId = `temp_${Date.now()}`;
        newWidgets.push({
            ...widgetData,
            id: tempId,
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
                const pendingTempPositions = pendingTempPositionsRef.current;
                const placementId = result.data?.placement_id;
                const pendingPosition = pendingTempPositions.get(tempId);
                let updatedWidgets = result.data.widgets || [];

                if (pendingPosition && placementId) {
                    updatedWidgets = updatedWidgets.map(widget => {
                        if (String(widget.id) !== String(placementId)) {
                            return widget;
                        }
                        return {
                            ...widget,
                            x: pendingPosition.x ?? widget.x,
                            y: pendingPosition.y ?? widget.y,
                            width: pendingPosition.w ?? widget.width ?? widget.w,
                            height: pendingPosition.h ?? widget.height ?? widget.h,
                        };
                    });

                    pendingTempPositions.delete(tempId);

                    try {
                        await api.post('/dashboards/positions', {
                            positions: [{
                                id: placementId,
                                x: pendingPosition.x,
                                y: pendingPosition.y,
                                w: pendingPosition.w,
                                h: pendingPosition.h,
                            }],
                            dashboard_id: result.data?.dashboard_id ?? dashboard?.id,
                        });
                    } catch (error) {
                        console.error('Failed to persist widget position:', error);
                    }
                } else if (pendingPosition) {
                    pendingTempPositions.delete(tempId);
                }

                setWidgets(updatedWidgets);
                setUnsavedChanges(false);
                clearLocalStorage(result.data?.dashboard_id ?? dashboard?.id);

                if (result.data.dashboard_id && result.data.dashboard_id !== dashboard?.id) {
                    const dashResult = await api.fetch('/dashboards/widgets');
                    if (dashResult.success) {
                        setDashboard(dashResult.data.dashboard);
                        setPermissions({
                            canEdit: Boolean(dashResult.data.can_edit),
                            canEditGlobal: Boolean(dashResult.data.can_edit_global),
                            isPersonal: Boolean(dashResult.data.is_personal),
                            isGlobal: Boolean(dashResult.data.is_global ?? dashResult.data.dashboard?.is_global),
                        });
                    }
                }
                return true;
            }

            if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
            } else if (result.error) {
                setAuthzError(result.error);
            }

            pendingTempPositionsRef.current.delete(tempId);
            setWidgets(previousWidgets);
            setUnsavedChanges(wasUnsaved);
            return false;
        } catch (error) {
            console.error('Failed to add widget:', error);
            setAuthzError(__('Failed to add widget', 'dashboardng'));
            pendingTempPositionsRef.current.delete(tempId);
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
        const newWidgets = widgets.map(w => {
            if (w.id !== widgetId) {
                return w;
            }

            return {
                ...w,
                config: configUpdates ? { ...w.config, ...configUpdates } : w.config,
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
            const result = await api.post('/dashboards/widgets/config', {
                placement_id: widgetId,
                dashboard_id: dashboard?.id,
                config: configUpdates
            });
            if (result.success) {
                setUnsavedChanges(false);
                clearLocalStorage(dashboard?.id);
                return true;
            }
            if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
            }
        } catch (error) {
            console.error('Failed to update widget:', error);
        }
        return false;
    }, [dashboard, widgets]);

    const deleteWidget = useCallback(async (widgetId) => {
        const newWidgets = widgets.filter(w => w.id !== widgetId);
        setWidgets(newWidgets);
        setUnsavedChanges(true);

        try {
            const dashboardParam = dashboard?.id ? `?dashboard_id=${dashboard.id}` : '';
            const result = await api.delete(`/dashboards/widgets/${widgetId}${dashboardParam}`);
            if (result.success) {
                setUnsavedChanges(false);
                clearLocalStorage(dashboard?.id);
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
    }, [dashboard, widgets]);

    const toggleEditMode = useCallback((enabled) => {
        if (enabled && unsavedChanges) {
            if (!confirm(__('You have unsaved changes. Do you want to save them before entering edit mode?', 'dashboardng'))) {
                return false;
            }
        }

        if (enabled && !permissions.canEdit) {
            const message = permissions.isGlobal
                ? __('You are not authorized to edit the global dashboard', 'dashboardng')
                : __('You are not authorized to edit this dashboard', 'dashboardng');
            setAuthzError(message);
            return false;
        }
        setAuthzError(undefined);
        setEditMode(enabled);
        return true;
    }, [permissions, unsavedChanges]);

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

    const openSharedDashboard = useCallback((mode = 'load') => {
        setSharedDashboardMode(mode);
        setShowSharedDashboard(true);
    }, []);

    const closeSharedDashboard = useCallback(() => {
        setShowSharedDashboard(false);
        setSharedDashboardMode('load');
    }, []);

    const getSelectedDashboardId = useCallback(() => {
        const stored = loadSelectedDashboardId();
        return stored ? Number(stored) : undefined;
    }, []);

    const setDefaultDashboard = useCallback(async (dashboardId) => {
        try {
            const result = await api.post('/dashboards/default', {
                dashboard_id: dashboardId,
            });
            if (result.success) {
                return true;
            }
            if (result.error === 'Unauthorized') {
                setAuthzError(__('You are not authorized to perform this action', 'dashboardng'));
            } else if (result.error) {
                setAuthzError(result.error);
            }
        } catch (error) {
            console.error('Failed to set default dashboard:', error);
        }
        return false;
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
        sharedDashboardMode,
        editingWidget,
        authzError,
        permissions,
        unsavedChanges,
        isLoading,
        loadDashboard,
        loadGlobalDashboard,
        loadDashboardById,
        getSelectedDashboardId,
        loadDashboards,
        createPersonalDashboard,
        createSharedDashboard,
        setDefaultDashboard,
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
