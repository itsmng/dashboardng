import { h } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';

export const LoadingSpinner = () => {
  return (
    <div className="d-flex justify-content-center align-items-center p-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">{__("Loading...", "dashboardng")}</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
