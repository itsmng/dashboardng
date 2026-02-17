/**
 * Generic Widget Components Index
 * Re-exports all generic visualization widgets
 * @module widgets/generic/index
 */

import { GenericChartWidget } from './GenericChartWidget.js';
import { GenericCardWidget } from './GenericCardWidget.js';
import { GenericTableWidget } from './GenericTableWidget.js';

/** Re-export generic chart widget component */
export { GenericChartWidget, GenericCardWidget, GenericTableWidget };

/**
 * Get appropriate generic widget component based on visualization type
 * @param {string} visualization - Visualization type ('card', 'chart', 'table')
 * @returns {import('preact').FunctionComponent} The widget component
 */
export const getGenericWidgetComponent = (visualization) => {
    switch (visualization) {
        case 'card': {
            return GenericCardWidget;
        }
        case 'chart': {
            return GenericChartWidget;
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
