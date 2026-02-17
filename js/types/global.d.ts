/// <reference types="preact" />

declare const preact: typeof import('preact');
declare const preactHooks: typeof import('preact/hooks');

interface I18n {
    dcnpgettext(domain: string, context: string | undefined, msgid: string, msgidPlural: string | undefined, n: number | undefined, ...extra: unknown[]): string;
}

declare global {
    interface GridStackOptions {
        column?: number | 'auto';
        cellHeight?: string | number;
        float?: boolean;
        animate?: boolean;
        disableOneColumnMode?: boolean;
        columnOpts?: {
            breakpoints?: Array<{ w: number; c: number }>;
        };
        [key: string]: unknown;
    }

    interface GridStackNode {
        id?: string | number;
        x: number;
        y: number;
        w: number;
        h: number;
        width?: number;
        height?: number;
        el?: HTMLElement;
        gridstackNode?: GridStackNode;
        [key: string]: unknown;
    }

    interface GridStack {
        init(options?: GridStackOptions, el?: HTMLElement): GridStack;
        destroy(removeDOM?: boolean): void;
        enable(): void;
        disable(): void;
        makeWidget(el: HTMLElement): GridStackNode;
        removeWidget(el: HTMLElement): void;
        on(event: string, callback: (event: Event, items: GridStackNode[]) => void): void;
        off(event: string): void;
        update(el: HTMLElement, opts: Partial<GridStackNode>): void;
        moveNode(node: GridStackNode, opts: Partial<GridStackNode>): GridStackNode | undefined;
        engine: {
            nodes: GridStackNode[];
        };
    }

    interface GridStackHTMLElement extends HTMLElement {
        gridstack?: GridStack;
        grid?: GridStack;
    }

    interface GridStackElement extends Element {
        gridstackNode?: GridStackNode;
    }

    interface GridStackStatic {
        init(options?: GridStackOptions, el?: HTMLElement): GridStack;
    }

    interface Window {
        preact: typeof import('preact');
        preactHooks: typeof import('preact/hooks');
        htm: typeof import('htm');
        GridStack: GridStackStatic;
        i18n: I18n;
        Chart: typeof import('chart.js').Chart;
        CFG_GLPI?: {
            root_doc?: string;
            [key: string]: unknown;
        };
        DashboardNGAssetReports?: {
            init?: () => void;
            AssetReportsApp?: () => void;
            AssetTypeReport?: unknown;
            ExportDropdown?: unknown;
            ASSET_TYPES?: unknown;
        };
        DashboardNGTaskReports?: {
            TaskReportsApp?: unknown;
            OverviewReport?: unknown;
            TechnicianReport?: unknown;
            EntityReport?: unknown;
            TicketReport?: unknown;
            ExportDropdown?: unknown;
        };
        DashboardNGTicketReports?: {
            TicketReportsApp?: unknown;
            OverviewReport?: unknown;
            EntityReport?: unknown;
            TechnicianReport?: unknown;
            SlaReport?: unknown;
            CategoryReport?: unknown;
            GroupReport?: unknown;
            PriorityReport?: unknown;
            SourceReport?: unknown;
            MonthlyReport?: unknown;
            ExportDropdown?: unknown;
        };
        DASHBOARDNG_CONFIG: {
            userId?: number | string;
            pageMode?: 'personal' | 'global';
            apiUrl?: string;
            apiBase?: string;
            csrfToken?: string;
            locale?: string;
            [key: string]: unknown;
        };
    }

    function __(text: string, domain?: string): string;
    
    const Chart: typeof import('chart.js').Chart;
}

declare module 'gridstack' {
    export interface GridStack {
        init(options?: GridStackOptions, el?: HTMLElement): GridStack;
        destroy(removeDOM?: boolean): void;
        enable(): void;
        disable(): void;
        makeWidget(el: HTMLElement): GridStackNode;
        removeWidget(el: HTMLElement): void;
        on(event: string, callback: (event: Event, items: GridStackNode[]) => void): void;
        off(event: string): void;
        update(el: HTMLElement, opts: Partial<GridStackNode>): void;
    }

    export interface GridStackOptions {
        column?: number | 'auto';
        cellHeight?: string | number;
        float?: boolean;
        animate?: boolean;
        disableOneColumnMode?: boolean;
        columnOpts?: {
            breakpoints?: Array<{ w: number; c: number }>;
        };
        [key: string]: unknown;
    }

    export interface GridStackNode {
        id?: string | number;
        x: number;
        y: number;
        w: number;
        h: number;
        width?: number;
        height?: number;
        el?: HTMLElement;
        gridstackNode?: GridStackNode;
        [key: string]: unknown;
    }

    const GridStack: {
        init(options?: GridStackOptions, el?: HTMLElement): GridStack;
    };

    export default GridStack;
}

export {};
