import { h } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorAlert = ({ message, onRetry }: ErrorAlertProps) => {
  return (
    <div className="alert alert-danger d-flex align-items-center" role="alert">
      <i className="fas fa-exclamation-triangle me-2"></i>
      <div className="flex-grow-1">{message}</div>
      {onRetry && (
        <button className="btn btn-sm btn-outline-danger ms-2" onClick={onRetry}>
          <i className="fas fa-refresh me-1"></i>{__("Retry", "dashboardng")}
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;
