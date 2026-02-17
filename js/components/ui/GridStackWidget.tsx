import { h } from '../../lib/preact.js';
import type { ComponentChildren } from '../../lib/preact.js';

interface GridStackWidgetProps {
    id: string | number;
    x: number;
    y: number;
    width: number;
    height: number;
    children?: ComponentChildren;
    editMode?: boolean;
}

export const GridStackWidget = ({ id, x, y, width, height, children }: GridStackWidgetProps) => {
    return (
        <div className="grid-stack-item" gs-id={String(id)} gs-x={x} gs-y={y} gs-w={width} gs-h={height}>
            <div className="grid-stack-item-content">
                {children}
            </div>
        </div>
    );
};

export default GridStackWidget;
