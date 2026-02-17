import { h } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

interface EmptyStateProps {
  message?: string;
}

export const EmptyState = ({ message }: EmptyStateProps) => {
  return (
    <div className="text-center text-muted p-5">
      <i className="fas fa-chart-bar" style={{ fontSize: '3rem' }}></i>
      <p className="mt-3">{message || __("No data available", "dashboardng")}</p>
    </div>
  );
};

export default EmptyState;
