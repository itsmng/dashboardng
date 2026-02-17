import { h } from '../../lib/preact.js';
import type { ComponentChildren } from '../../lib/preact.js';
import { __ } from '../../lib/i18n.js';

interface ReportCardProps {
  title: string;
  children: ComponentChildren;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  toolbar?: ComponentChildren;
  onSettingsClick?: () => void;
}

export const ReportCard = ({ title, children, loading = false, error = undefined, onRetry, toolbar, onSettingsClick }: ReportCardProps) => {
    return (
        <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">{title}</h5>
                <div className="d-flex align-items-center gap-2">
                    {onSettingsClick && (
                        <button
                            className="btn btn-link btn-sm p-0"
                            onClick={onSettingsClick}
                            title={__('Settings', 'dashboardng')}
                            style={{ color: '#6c757d' }}
                        >
                            <i className="fas fa-cog"></i>
                        </button>
                    )}
                    {toolbar && <div className="card-toolbar">{toolbar}</div>}
                </div>
            </div>
            <div className="card-body">
                {loading && (
                    <div className="d-flex justify-content-center align-items-center p-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">{__('Loading...', 'dashboardng')}</span>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="alert alert-danger d-flex align-items-center" role="alert">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <div className="flex-grow-1">{error}</div>
                        {onRetry && (
                            <button className="btn btn-sm btn-outline-danger ms-2" onClick={onRetry}>
                                <i className="fas fa-refresh me-1"></i>{__('Retry', 'dashboardng')}
                            </button>
                        )}
                    </div>
                )}
                {!loading && !error && children}
            </div>
        </div>
    );
};

export default ReportCard;
