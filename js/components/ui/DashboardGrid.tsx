import { h } from '../../lib/preact.js';
import type { FunctionalComponent } from '../../lib/preact.js';
import { GridStackWidget } from './GridStackWidget.js';
import { useDashboard } from '../../context/DashboardContext.js';
import { getWidgetComponent } from '../../widgets/registry.js';
import type { Widget } from '../../types/index.js';

interface WidgetWrapperProps {
    widget: Widget;
    onDeleteWidget: (id: string | number) => void;
    onEditWidget: (widget: Widget) => void;
    editMode: boolean;
}

interface DashboardGridProps {
    gridRef: preact.RefObject<HTMLElement>;
    onDeleteWidget: (id: string | number) => void;
    onEditWidget: (widget: Widget) => void;
}

export const WidgetWrapper = ({ widget, onDeleteWidget, onEditWidget, editMode }: WidgetWrapperProps) => {
    const renderWidgetContent = () => {
        const config = widget.config || {};
        const visualization = config.visualization || widget.visualization || 'card';

        const WidgetComponent = getWidgetComponent('custom', { visualization }) as unknown as FunctionalComponent<{ config: Record<string, unknown>; widgetId: string | number }>;

        if (!WidgetComponent) {
            return (
                <div className="alert alert-warning">
                    Unknown visualization: {visualization}
                    <pre style={{ fontSize: '10px', marginTop: '10px' }}>{JSON.stringify(config, undefined, 2)}</pre>
                </div>
            );
        }

        return <WidgetComponent config={config} widgetId={widget.id} />;
    };

    return (
        <GridStackWidget
            id={widget.id}
            x={widget.x}
            y={widget.y}
            width={widget.width || widget.w!}
            height={widget.height || widget.h!}
            editMode={editMode}
        >
            <div className={`h-100 widget-wrapper ${editMode ? 'edit-mode' : ''}`}>
                {editMode && (
                    <div className="widget-controls">
                        <button
                            className="btn btn-sm btn-outline-primary widget-edit-btn"
                            onClick={(e) => { e.stopPropagation(); onEditWidget(widget); }}
                            title={__('Edit Widget', 'dashboardng')}
                        >
                            <i className="fas fa-cog"></i>
                        </button>
                        <button
                            className="btn btn-sm btn-outline-danger widget-delete-btn"
                            onClick={(e) => { e.stopPropagation(); onDeleteWidget(widget.id); }}
                            title={__('Remove Widget', 'dashboardng')}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}
                {renderWidgetContent()}
            </div>
        </GridStackWidget>
    );
};

export const DashboardGrid = ({ gridRef, onDeleteWidget, onEditWidget }: DashboardGridProps) => {
    const { widgets, editMode } = useDashboard();

    return (
        <div ref={gridRef} className="grid-stack">
            {widgets.filter(w => w.enabled !== false).map(widget => (
                <WidgetWrapper key={widget.id} widget={widget} onDeleteWidget={onDeleteWidget} onEditWidget={onEditWidget} editMode={editMode} />
            ))}
        </div>
    );
};

export default DashboardGrid;
