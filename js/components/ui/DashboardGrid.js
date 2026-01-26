import { html } from '../../lib/preact.js';
import { GridStackWidget } from './GridStackWidget.js';
import { useDashboard } from '../../context/DashboardContext.js';
import { getWidgetComponent } from '../../widgets/registry.js';

export const WidgetWrapper = ({ widget, onDeleteWidget, onEditWidget, editMode }) => {
    const renderWidgetContent = () => {
        const config = widget.config || {};
        const visualization = config.visualization || widget.visualization || 'card';

        const WidgetComponent = getWidgetComponent('custom', { visualization });

        if (!WidgetComponent) {
            return html`<div class="alert alert-warning">
                Unknown visualization: ${visualization}
                <pre style="font-size: 10px; margin-top: 10px;">${JSON.stringify(config, undefined, 2)}</pre>
            </div>`;
        }

        return html`<${WidgetComponent} config=${config} widgetId=${widget.id} />`;
    };

    return html`
        <${GridStackWidget}
            id=${widget.id}
            x=${widget.x}
            y=${widget.y}
            width=${widget.width || widget.w}
            height=${widget.height || widget.h}
            editMode=${editMode}
        >
            <div class="h-100 widget-wrapper ${editMode ? 'edit-mode' : ''}">
                ${editMode && html`
                    <div class="widget-controls">
                        <button
                            class="btn btn-sm btn-outline-primary widget-edit-btn"
                            onClick=${(e) => { e.stopPropagation(); onEditWidget(widget); }}
                            title=${__('Edit Widget', 'dashboardng')}
                        >
                            <i class="fas fa-cog"></i>
                        </button>
                        <button
                            class="btn btn-sm btn-outline-danger widget-delete-btn"
                            onClick=${(e) => { e.stopPropagation(); onDeleteWidget(widget.id); }}
                            title=${__('Remove Widget', 'dashboardng')}
                        >
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `}
                ${renderWidgetContent()}
            </div>
        <//>
    `;
};

export const DashboardGrid = ({ gridRef, onDeleteWidget, onEditWidget }) => {
    const { widgets, editMode } = useDashboard();

    return html`
        <div ref=${gridRef} class="grid-stack">
            ${widgets.filter(w => w.enabled !== false).map(widget => html`
                <${WidgetWrapper} key=${widget.id} widget=${widget} onDeleteWidget=${onDeleteWidget} onEditWidget=${onEditWidget} editMode=${editMode} />
            `)}
        </div>
    `;
};

export default DashboardGrid;
