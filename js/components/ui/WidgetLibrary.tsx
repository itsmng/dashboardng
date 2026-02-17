import { h, Fragment, useState, useEffect } from '../../lib/preact.js';
import { api } from '../../lib/config.js';
import { __ } from '../../lib/i18n.js';

interface Widget {
    id: string;
    name: string;
    itemtype?: string;
    visualization?: string;
    config?: {
        title?: string;
        icon?: string;
        color?: string;
        itemtype?: string;
        visualization?: string;
    };
    default_width?: number;
    default_height?: number;
    is_global?: boolean;
}

interface WidgetLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    onAddWidget: (widget: Record<string, unknown>) => void;
}

export const WidgetLibrary = ({ isOpen, onClose, onAddWidget }: WidgetLibraryProps) => {
    const [activeTab, setActiveTab] = useState('library');
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadWidgets();
        }
    }, [isOpen]);

    const loadWidgets = async () => {
        setLoading(true);
        try {
            const result = await api.fetch('/widgets/library');
            if (result.success) {
                setWidgets((result.data as any)?.widgets || []);
            }
        } catch (error) {
            console.error('Failed to load widget library:', error);
        }
        setLoading(false);
    };

    const filteredWidgets = widgets.filter(w => 
        searchQuery === '' || 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.config?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedWidgets = filteredWidgets.reduce<Record<string, Widget[]>>((acc, widget) => {
        const cat = widget.visualization || 'other';
        if (!acc[cat]) {acc[cat] = [];}
        acc[cat].push(widget);
        return acc;
    }, {});

    const handleAddWidget = (widget: Widget) => {
        const config = widget.config ? { ...widget.config } : {};
        if (!config.itemtype && widget.itemtype) {
            config.itemtype = widget.itemtype;
        }
        if (!config.visualization && widget.visualization) {
            config.visualization = widget.visualization;
        }

        onAddWidget({
            id: widget.id,
            widget_definition_id: widget.id,
            name: widget.name,
            itemtype: widget.itemtype,
            visualization: widget.visualization,
            config,
            default_width: widget.default_width,
            default_height: widget.default_height,
            width: widget.default_width,
            height: widget.default_height,
        });
    };

    const categoryLabels: Record<string, string> = {
        card: __('KPI Cards', 'dashboardng'),
        chart: __('Charts', 'dashboardng'),
        table: __('Tables', 'dashboardng'),
        other: __('Other', 'dashboardng')
    };

    const categoryIcons: Record<string, string> = {
        card: 'fa-id-card',
        chart: 'fa-chart-bar',
        table: 'fa-table',
        other: 'fa-puzzle-piece'
    };

    const getWidgetIcon = (widget: Widget) => {
        const config = widget.config || {};
        if (config.icon) {return config.icon;}
        switch (widget.visualization) {
            case 'card': { return 'fa-id-card';
            }
            case 'bar': { return 'fa-chart-bar';
            }
            case 'line': { return 'fa-chart-line';
            }
            case 'pie': 
            case 'doughnut': { return 'fa-chart-pie';
            }
            case 'table': { return 'fa-table';
            }
            default: { return 'fa-cube';
            }
        }
    };

    const getWidgetColor = (widget: Widget) => {
        const config = widget.config || {};
        if (config.color) {
            if (config.color.startsWith('#')) {return config.color;}
            return;
        }
        return;
    };

    const getWidgetColorClass = (widget: Widget) => {
        const config = widget.config || {};
        if (config.color && !config.color.startsWith('#')) {
            return `text-${config.color}`;
        }
        return 'text-secondary';
    };

    if (!isOpen) {return null;}

    return (
        <>
            <div className="widget-library-overlay" onClick={onClose}></div>
            <div className={`widget-library-panel ${isOpen ? 'open' : ''}`}>
                <div className="widget-library-header">
                    <h5 className="mb-0">
                        <i className="fas fa-shapes me-2"></i>
                        {__('Widget Library', 'dashboardng')}
                    </h5>
                    <button className="btn-close" onClick={onClose}></button>
                </div>

                <div className="widget-library-search p-3 border-bottom">
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className="fas fa-search"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder={__('Search widgets...', 'dashboardng')}
                            value={searchQuery}
                            onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                        />
                    </div>
                </div>

                <div className="widget-library-tabs">
                    <ul className="nav nav-tabs">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'library' ? 'active' : ''}`}
                                onClick={() => setActiveTab('library')}
                            >
                                <i className="fas fa-box me-1"></i>
                                {__('Available', 'dashboardng')}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'custom' ? 'active' : ''}`}
                                onClick={() => setActiveTab('custom')}
                            >
                                <i className="fas fa-plus me-1"></i>
                                {__('Custom', 'dashboardng')}
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="widget-library-content">
                    {loading && (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'library' && !loading && (
                        <div className="widget-list">
                            {Object.entries(groupedWidgets).map(([category, items]) => (
                                <div className="widget-category mb-4" key={category}>
                                    <h6 className="widget-category-title">
                                        <i className={`fas ${categoryIcons[category] || 'fa-folder'} me-2`}></i>
                                        {categoryLabels[category] || category}
                                        <span className="badge bg-secondary ms-2">{items.length}</span>
                                    </h6>
                                    <div className="widget-items">
                                        {items.map(widget => (
                                            <div
                                                className="widget-item card mb-2"
                                                key={widget.id}
                                                onClick={() => handleAddWidget(widget)}
                                            >
                                                <div className="card-body p-2">
                                                    <div className="d-flex align-items-center">
                                                        <div className="widget-icon me-3">
                                                            <i 
                                                                className={`fas ${getWidgetIcon(widget)} fa-lg ${getWidgetColorClass(widget)}`}
                                                                style={getWidgetColor(widget) ? { color: getWidgetColor(widget) } : undefined}
                                                            ></i>
                                                        </div>
                                                        <div className="widget-info flex-grow-1">
                                                            <div className="widget-name fw-bold">{widget.name}</div>
                                                            <div className="widget-description text-muted">
                                                                {widget.itemtype || ''} · {widget.visualization || 'widget'}
                                                                {widget.is_global ? null : <span className="badge bg-info ms-1">Custom</span>}
                                                            </div>
                                                        </div>
                                                        <div className="widget-add">
                                                            <i className="fas fa-plus-circle text-primary"></i>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(groupedWidgets).length === 0 && !loading && (
                                <div className="text-center text-muted py-4">
                                    <i className="fas fa-search fa-2x mb-2"></i>
                                    <div>{__('No widgets found', 'dashboardng')}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'custom' && (
                        <div className="custom-widget-prompt p-4 text-center">
                            <i className="fas fa-magic fa-3x text-primary mb-3"></i>
                            <h6>{__('Create a Custom Widget', 'dashboardng')}</h6>
                            <p className="text-muted">
                                {__('Build a widget from any GLPI collection with custom filters, grouping, and visualization.', 'dashboardng')}
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => onAddWidget({ openConfig: true })}
                            >
                                <i className="fas fa-plus me-2"></i>
                                {__('Create Widget', 'dashboardng')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default WidgetLibrary;
