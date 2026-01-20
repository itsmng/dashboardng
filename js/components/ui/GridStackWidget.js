import { html } from '../../lib/preact.js';

/**
 * GridStack Widget wrapper component
 * Wraps widget content in GridStack item with positioning attributes
 *
 * @component
 * @param {Object} props
 * @param {string|number} props.id - Widget ID
 * @param {number} props.x - X grid position
 * @param {number} props.y - Y grid position
 * @param {number} props.width - Width in grid units
 * @param {number} props.height - Height in grid units
 * @param {import('preact').ComponentChildren} props.children - Widget content
 * @param {boolean} [props.editMode] - Whether dashboard is in edit mode
 * @returns {import('preact').VNode} GridStack item wrapper
 */
export const GridStackWidget = ({ id, x, y, width, height, children, editMode }) => {
    return html`
        <div class="grid-stack-item" gs-id="${id}" gs-x="${x}" gs-y="${y}" gs-w="${width}" gs-h="${height}">
            <div class="grid-stack-item-content">
                ${children}
            </div>
        </div>
    `;
};

export default GridStackWidget;
