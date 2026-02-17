import { h } from '../../lib/preact.js';
import type { ComponentChildren } from '../../lib/preact.js';
import { __ } from '../../lib/i18n.js';

interface ChartCardProps {
    title: string;
    children: ComponentChildren;
    loading?: boolean;
    className?: string;
}

export const ChartCard = ({ title, children, loading = false, className = '' }: ChartCardProps) => {
    return (
        <div className={`card border-0 shadow-sm h-100 ${className}`}>
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-semibold">{title}</h6>
                {loading && (
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">{__('Loading...', 'dashboardng')}</span>
                    </div>
                )}
            </div>
            <div className="card-body pt-0">
                {children}
            </div>
        </div>
    );
};

export default ChartCard;
