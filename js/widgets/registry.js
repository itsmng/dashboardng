import { GenericCardWidget, GenericChartWidget, GenericTableWidget, getGenericWidgetComponent } from './generic/index.js';

/**
 * Widget registry - maps visualization types to components
 * @type {Object<string, WidgetRegistryEntry>}
 */
export const WIDGET_REGISTRY = {
    'card': {
        component: GenericCardWidget,
        titleKey: 'card',
        category: 'card',
        defaultGrid: { w: 3, h: 2 }
    },

    'chart': {
        component: GenericChartWidget,
        titleKey: 'chart',
        category: 'chart',
        defaultGrid: { w: 6, h: 4 }
    },
    'bar': {
        component: GenericChartWidget,
        titleKey: 'barChart',
        category: 'chart',
        defaultGrid: { w: 6, h: 4 }
    },
    'line': {
        component: GenericChartWidget,
        titleKey: 'lineChart',
        category: 'chart',
        defaultGrid: { w: 8, h: 4 }
    },
    'pie': {
        component: GenericChartWidget,
        titleKey: 'pieChart',
        category: 'chart',
        defaultGrid: { w: 4, h: 4 }
    },
    'doughnut': {
        component: GenericChartWidget,
        titleKey: 'doughnutChart',
        category: 'chart',
        defaultGrid: { w: 4, h: 4 }
    },
    'table': {
        component: GenericTableWidget,
        titleKey: 'table',
        category: 'table',
        defaultGrid: { w: 6, h: 4 }
    },
    'custom': {
        component: undefined, // Determined dynamically
        titleKey: 'customWidget',
        category: 'custom',
        defaultGrid: { w: 4, h: 4 },
        isCustom: true
    }
};

/**
 * Get widget component by visualization type
 * @param {string} widgetType - The widget/visualization type
 * @param {Object|null} [config=null] - Widget configuration (used for 'custom' type)
 * @returns {import('preact').FunctionComponent|null} The widget component or null if not found
 */
export const getWidgetComponent = (widgetType, config = undefined) => {
    if (widgetType === 'custom' && config) {
        const visualization = config.visualization || 'card';
        return getGenericWidgetComponent(visualization);
    }
    
    const registryEntry = WIDGET_REGISTRY[widgetType];
    if (registryEntry && registryEntry.component) {
        return registryEntry.component;
    }
    
    return getGenericWidgetComponent(widgetType);
};

/**
 * Get widget registry entry by type
 * @param {string} widgetType - The widget type identifier
 * @returns {WidgetRegistryEntry|null} The registry entry or null if not found
 */
export const getWidgetEntry = (widgetType) => {
    return WIDGET_REGISTRY[widgetType] ?? undefined;
};

/**
 * Check if widget type exists in registry
 * @param {string} widgetType - The widget type identifier
 * @returns {boolean}
 */
export const isValidWidgetType = (widgetType) => {
    return widgetType in WIDGET_REGISTRY;
};

/**
 * Get all widget types
 * @returns {string[]} Array of all widget type identifiers
 */
export const getAllWidgetTypes = () => {
    return Object.keys(WIDGET_REGISTRY);
};

// ========================================
// Type Definitions
// ========================================

/**
 * @typedef {Object} WidgetRegistryEntry
 * @property {import('preact').FunctionComponent} component - Widget component
 * @property {string} titleKey - Translation key for widget title
 * @property {string} category - Widget category ('card', 'chart', 'table', 'custom')
 * @property {Object} defaultGrid - Default grid configuration
 * @property {number} defaultGrid.w - Default width (grid columns)
 * @property {number} defaultGrid.h - Default height (grid rows)
 * @property {boolean} [isCustom] - Whether this is a custom widget type
 */

export { GenericCardWidget, GenericChartWidget, GenericTableWidget, getGenericWidgetComponent };

export default WIDGET_REGISTRY;
