export interface WidgetConfig {
    visualization?: string;
    itemtype?: string;
    filters?: WidgetFilter[];
    title?: string;
    period?: string;
    groupBy?: string;
    sortBy?: string;
    limit?: number;
    [key: string]: unknown;
}

export interface WidgetPosition {
    id: string | number;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    width?: number;
    height?: number;
}

export interface WidgetFilter {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
    value: string | number | boolean | string[] | number[];
}

export interface Widget {
    id: string | number;
    x: number;
    y: number;
    width?: number;
    height?: number;
    w?: number;
    h?: number;
    config?: WidgetConfig;
    visualization?: string;
    itemtype?: string;
    widget_type?: string;
    widget_definition_id?: string | number;
    default_width?: number;
    default_height?: number;
    enabled?: boolean;
    name?: string;
    description?: string;
}

export interface Dashboard {
    id: number;
    name: string;
    is_global?: boolean;
    is_personal?: boolean;
    user_id?: number;
    created_at?: string;
    updated_at?: string;
    widgets?: Widget[];
}

export interface DashboardPermissions {
    canEdit: boolean;
    canEditGlobal: boolean;
    isPersonal: boolean;
    isGlobal: boolean;
    canViewWidgets?: boolean;
    canUpdateWidgets?: boolean;
    canCreateWidgets?: boolean;
}

export interface PeriodState {
    period: string;
    startDate: Date | null;
    endDate: Date | null;
}

export interface PeriodContextValue extends PeriodState {
    setPeriod: (period: string) => void;
    setCustomRange: (start: Date, end: Date) => void;
    getPeriodParams: () => { period?: string; start?: string; end?: string };
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface WidgetDefinition {
    id: string | number;
    name: string;
    description?: string;
    widget_type: string;
    visualization?: string;
    default_width?: number;
    default_height?: number;
    config?: WidgetConfig;
    itemtype?: string;
}

export interface WidgetLibraryItem extends WidgetDefinition {
    category?: string;
    icon?: string;
}

export type SharedDashboardMode = 'load' | 'save';

export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

export interface ChartDataset {
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
}

export interface KPIData {
    label: string;
    value: string | number;
    change?: number;
    changeType?: 'increase' | 'decrease' | 'neutral';
    icon?: string;
}

export interface TableData {
    headers: string[];
    rows: Record<string, unknown>[];
}

export interface ReportData {
    data: Record<string, unknown>[];
    total?: number;
    summary?: Record<string, number>;
}
