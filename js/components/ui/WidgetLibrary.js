import { html, useState, useEffect } from '../../lib/preact.js';
import { api, COLORS } from '../../lib/config.js';

/**
 * Widget Library Panel - Sidebar for adding widgets from library
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {function(): void} props.onClose - Callback when panel closes
 * @param {function(Object): void} props.onAddWidget - Callback when widget is added
 * @returns {import('preact').VNode|null} Library panel or null if not open
 */
export const WidgetLibrary = ({ isOpen, onClose, onAddWidget }) => {
    const [activeTab, setActiveTab] = useState('library');
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Load widget definitions from server
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
                setWidgets(result.data.widgets || []);
            }
        } catch (err) {
            console.error('Failed to load widget library:', err);
        }
        setLoading(false);
    };

    const filteredWidgets = widgets.filter(w => 
        searchQuery === '' || 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.config?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedWidgets = filteredWidgets.reduce((acc, widget) => {
        let cat = widget.visualization || 'other';
        // Map chart types to 'chart' category
        if (['bar', 'line', 'pie', 'doughnut'].includes(cat)) {
            cat = 'chart';
        }
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(widget);
        return acc;
    }, {});

    const handleAddWidget = (widget) => {
        // Pass the widget definition ID to the parent
        onAddWidget({
            id: widget.id,
            widget_definition_id: widget.id,
            width: widget.default_width,
            height: widget.default_height,
        });
    };

    const categoryLabels = {
        card: __('KPI Cards', 'dashboardng'),
        chart: __('Charts', 'dashboardng'),
        table: __('Tables', 'dashboardng'),
        other: __('Other', 'dashboardng')
    };

    const categoryIcons = {
        card: 'fa-id-card',
        chart: 'fa-chart-bar',
        table: 'fa-table',
        other: 'fa-puzzle-piece'
    };

    const getWidgetIcon = (widget) => {
        const config = widget.config || {};
        if (config.icon) return config.icon;
        switch (widget.visualization) {
            case 'card': return 'fa-id-card';
            case 'bar': return 'fa-chart-bar';
            case 'line': return 'fa-chart-line';
            case 'pie': 
            case 'doughnut': return 'fa-chart-pie';
            case 'table': return 'fa-table';
            default: return 'fa-cube';
        }
    };

    const getWidgetColor = (widget) => {
        const config = widget.config || {};
        if (config.color) {
            // Handle hex colors or bootstrap color names
            if (config.color.startsWith('#')) return config.color;
            return null; // Use text-{color} class instead
        }
        return null;
    };

    const getWidgetColorClass = (widget) => {
        const config = widget.config || {};
        if (config.color && !config.color.startsWith('#')) {
            return `text-${config.color}`;
        }
        return 'text-secondary';
    };

    if (!isOpen) return null;

    return html`
        <div class="widget-library-overlay" onClick=${onClose}></div>
        <div class="widget-library-panel ${isOpen ? 'open' : ''}">
            <div class="widget-library-header">
                <h5 class="mb-0">
                    <i class="fas fa-shapes me-2"></i>
                    ${__('Widget Library', 'dashboardng')}
                </h5>
                <button class="btn-close" onClick=${onClose}></button>
            </div>

            <div class="widget-library-search p-3 border-bottom">
                <div class="input-group">
                    <span class="input-group-text">
                        <i class="fas fa-search"></i>
                    </span>
                    <input
                        type="text"
                        class="form-control"
                        placeholder=${__('Search widgets...', 'dashboardng')}
                        value=${searchQuery}
                        onInput=${(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div class="widget-library-tabs">
                <ul class="nav nav-tabs">
                    <li class="nav-item">
                        <button
                            class="nav-link ${activeTab === 'library' ? 'active' : ''}"
                            onClick=${() => setActiveTab('library')}
                        >
                            <i class="fas fa-box me-1"></i>
                            ${__('Available', 'dashboardng')}
                        </button>
                    </li>
                    <li class="nav-item">
                        <button
                            class="nav-link ${activeTab === 'custom' ? 'active' : ''}"
                            onClick=${() => setActiveTab('custom')}
                        >
                            <i class="fas fa-plus me-1"></i>
                            ${__('Custom', 'dashboardng')}
                        </button>
                    </li>
                </ul>
            </div>

            <div class="widget-library-content">
                ${loading && html`
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                `}

                ${activeTab === 'library' && !loading && html`
                    <div class="widget-list">
                        ${Object.entries(groupedWidgets).map(([category, items]) => html`
                            <div class="widget-category mb-4" key=${category}>
                                <h6 class="widget-category-title">
                                    <i class="fas ${categoryIcons[category] || 'fa-folder'} me-2"></i>
                                    ${categoryLabels[category] || category}
                                    <span class="badge bg-secondary ms-2">${items.length}</span>
                                </h6>
                                <div class="widget-items">
                                    ${items.map(widget => html`
                                        <div
                                            class="widget-item card mb-2"
                                            key=${widget.id}
                                            onClick=${() => handleAddWidget(widget)}
                                        >
                                            <div class="card-body p-2">
                                                <div class="d-flex align-items-center">
                                                    <div class="widget-icon me-3">
                                                        <i 
                                                            class="fas ${getWidgetIcon(widget)} fa-lg ${getWidgetColorClass(widget)}"
                                                            style=${getWidgetColor(widget) ? `color: ${getWidgetColor(widget)}` : ''}
                                                        ></i>
                                                    </div>
                                                    <div class="widget-info flex-grow-1">
                                                        <div class="widget-name fw-bold">${widget.name}</div>
                                                        <div class="widget-description text-muted">
                                                            ${widget.itemtype || ''} · ${widget.visualization || 'widget'}
                                                            ${widget.is_global ? '' : html`<span class="badge bg-info ms-1">Custom</span>`}
                                                        </div>
                                                    </div>
                                                    <div class="widget-add">
                                                        <i class="fas fa-plus-circle text-primary"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `)}
                                </div>
                            </div>
                        `)}
                        ${Object.keys(groupedWidgets).length === 0 && !loading && html`
                            <div class="text-center text-muted py-4">
                                <i class="fas fa-search fa-2x mb-2"></i>
                                <div>${__('No widgets found', 'dashboardng')}</div>
                            </div>
                        `}
                    </div>
                `}

                ${activeTab === 'custom' && html`
                    <div class="custom-widget-prompt p-4 text-center">
                        <i class="fas fa-magic fa-3x text-primary mb-3"></i>
                        <h6>${__('Create a Custom Widget', 'dashboardng')}</h6>
                        <p class="text-muted">
                            ${__('Build a widget from any GLPI collection with custom filters, grouping, and visualization.', 'dashboardng')}
                        </p>
                        <button
                            class="btn btn-primary"
                            onClick=${() => onAddWidget({ openConfig: true })}
                        >
                            <i class="fas fa-plus me-2"></i>
                            ${__('Create Widget', 'dashboardng')}
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
};

export default WidgetLibrary;
