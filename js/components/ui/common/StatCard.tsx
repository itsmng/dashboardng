import { h } from '../../../lib/preact.js';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  trend?: number;
}

export const StatCard = ({ label, value, icon, color = "primary", trend }: StatCardProps) => {
  return (
    <div className={`card h-100 border-${color} border-start border-4`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="text-muted mb-1">{label}</h6>
            <h3 className="mb-0">{value}</h3>
            {trend !== undefined && (
              <small className={`text-${trend >= 0 ? "success" : "danger"}`}>
                <i className={`fas fa-arrow-${trend >= 0 ? "up" : "down"} me-1`}></i>
                {Math.abs(trend)}%
              </small>
            )}
          </div>
          {icon && (
            <div className={`text-${color} opacity-50`}>
              <i className={`fas fa-${icon}`} style={{ fontSize: '2.5rem' }}></i>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
