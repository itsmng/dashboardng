import { html } from '../../lib/preact.js';
import { KPICard } from './KPICard.js';

/**
 * KPI Grid component
 * Displays a grid of key performance indicator cards
 *
 * @component
 * @param {Object} props
 * @param {KPIData} props.data - KPI data object with metric values
 * @param {boolean} props.loading - Whether data is loading
 * @returns {import('preact').VNode} Rendered KPI grid
 */
export const KPIGrid = ({ data, loading }) => {
