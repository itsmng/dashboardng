/**
 * Generic Widget Components Index
 * Re-exports all generic visualization widgets
 * @module widgets/generic/index
 */

import { GenericChartWidget } from './GenericChartWidget.js';
import { GenericCardWidget } from './GenericCardWidget.js';
import { GenericTableWidget } from './GenericTableWidget.js';

const CHART_VISUALIZATIONS = new Set(['chart', 'bar', 'line', 'pie', 'doughnut']);

/** Re-export generic chart widget component */
export { GenericChartWidget, GenericCardWidget, GenericTableWidget };

/**
 * Get appropriate generic widget component based on visualization type
 * @param {string} visualization - Visualization type ('card', 'chart', 'table')
 * @returns {import('preact').FunctionComponent} The widget component
 */
export const getGenericWidgetComponent = (visualization) => {
    if (CHART_VISUALIZATIONS.has(visualization)) {
        return GenericChartWidget;
    }

    switch (visualization) {
        case 'card': {
            return GenericCardWidget;
        }
        case 'table': {
            return GenericTableWidget;
        }
        default: {
            // Default to card for unknown types
            return GenericCardWidget;
        }
    }
};
