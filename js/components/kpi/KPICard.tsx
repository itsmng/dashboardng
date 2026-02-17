import { h } from '../../lib/preact.js';

interface KPICardProps {
  title: string;
  value: number | null;
  icon: string;
  color?: string;
  loading?: boolean;
  trend?: number | null;
}

export const KPICard = ({ title, value, icon, color = 'primary', loading = false, trend = undefined }: KPICardProps) => {
    return (
        <div className={`card kpi-card h-100 border-0 shadow-sm kpi-${color}`}>
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2 min-width-0">
                        <div className="kpi-icon">
                            <i className={`fas ${icon} text-${color}`}></i>
                        </div>
                        <p className="kpi-title text-muted small mb-0">{title}</p>
                    </div>
                    {trend != null && (
                        <small className={`text-${trend >= 0 ? 'success' : 'danger'}`}>
                            <i className={`fas fa-arrow-${trend >= 0 ? 'up' : 'down'} me-1`}></i>
                            {Math.abs(trend)}%
                        </small>
                    )}
                </div>
                {loading
                    ? <div className="placeholder-glow"><span className="placeholder col-6"></span></div>
                    : <h3 className={`mb-0 fw-bold text-${color}`}>{value?.toLocaleString() ?? '-'}</h3>
                }
            </div>
        </div>
    );
};

export default KPICard;
