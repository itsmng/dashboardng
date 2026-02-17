import { h } from '../../lib/preact.js';
import { KPICard } from './KPICard.js';

interface KPIDataItem {
    title: string;
    value: number | null;
    icon: string;
    color?: string;
    trend?: number | null;
}

interface KPIGridProps {
    data: KPIDataItem[];
    loading?: boolean;
}

export const KPIGrid = ({ data, loading = false }: KPIGridProps) => {
    if (!data || data.length === 0) {
        return (
            <div className="kpi-grid empty">
                <div className="text-muted text-center p-4">
                    No KPI data available
                </div>
            </div>
        );
    }

    return (
        <div className="kpi-grid row g-3">
            {data.map((kpi, index) => (
                <div className="col-12 col-md-6 col-lg-3" key={index}>
                    <KPICard
                        title={kpi.title}
                        value={kpi.value}
                        icon={kpi.icon}
                        color={kpi.color ?? 'primary'}
                        loading={loading}
                        trend={kpi.trend}
                    />
                </div>
            ))}
        </div>
    );
};

export default KPIGrid;
