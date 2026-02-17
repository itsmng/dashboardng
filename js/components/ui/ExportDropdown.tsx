import { h, Fragment } from '../../lib/preact.js';
import { useState, useEffect, useRef } from '../../lib/preact.js';
import { CONFIG } from '../../lib/config.js';
import { __ } from '../../lib/i18n.js';

interface BulkOption {
  id: string;
  label: string;
}

interface CustomRange {
  start?: string;
  end?: string;
}

interface ExportDropdownProps {
  reportType: string;
  period: number;
  itemtype?: string;
  entities?: string;
  customRange?: CustomRange;
  bulkOptions?: BulkOption[];
}

interface Format {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const getExportUrl = (type: string, format: string, params: Record<string, string | undefined> = {}) => {
  const url = new URL(`${CONFIG.apiUrl || "/plugins/dashboardng/api.php"}/reports/${type}/export`, window.location.origin);
  url.searchParams.append("format", format);
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      url.searchParams.append(key, val);
    }
  });
  return url.toString();
};

const getBulkExportUrl = (types: string[], format: string, params: Record<string, string | undefined> = {}) => {
  const url = new URL(`${CONFIG.apiUrl || "/plugins/dashboardng/api.php"}/reports/export-bulk`, window.location.origin);
  url.searchParams.append("format", format);
  url.searchParams.append("types", types.join(","));
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      url.searchParams.append(key, val);
    }
  });
  return url.toString();
};

export const ExportDropdown = ({ reportType, period, itemtype, entities, customRange = {}, bulkOptions = [] }: ExportDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFormat, setBulkFormat] = useState("xlsx");
  const [bulkSelections, setBulkSelections] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bulkAvailable = Array.isArray(bulkOptions) && bulkOptions.length > 0;
  const bulkIds = bulkAvailable ? bulkOptions.map((option) => option.id) : [];
  const bulkIdsKey = bulkIds.join("|");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!bulkAvailable) {
      return;
    }
    setBulkSelections((current) => {
      const filtered = current.filter((id) => bulkIds.includes(id));
      const next = filtered.length ? filtered : bulkIds;
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }
      return next;
    });
  }, [bulkIdsKey]);

  const handleExport = async (format: string) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      const params: Record<string, string | undefined> = { period: String(period) };
      if (itemtype) {
        params.itemtype = itemtype;
      }
      if (entities) {
        params.entities = entities;
      }
      if (period === 8) {
        params.start_date = customRange?.start || undefined;
        params.end_date = customRange?.end || undefined;
      }

      const url = getExportUrl(reportType, format, params);
      const link = document.createElement("a");
      link.href = url;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      alert(__("Export failed. Please try again.", "dashboardng"));
    } finally {
      setIsExporting(false);
    }
  };

  const toggleBulkSelection = (id: string) => {
    setBulkSelections((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  };

  const handleSelectAll = () => {
    setBulkSelections(bulkIds);
  };

  const handleBulkExport = async () => {
    if (!bulkSelections.length) {
      alert(__("Select at least one report.", "dashboardng"));
      return;
    }

    const orderedSelections = bulkOptions
      .filter((option) => bulkSelections.includes(option.id))
      .map((option) => option.id);

    setIsExporting(true);
    setIsOpen(false);
    setShowBulkModal(false);

    try {
      const params: Record<string, string | undefined> = { period: String(period) };
      if (itemtype) {
        params.itemtype = itemtype;
      }
      if (entities) {
        params.entities = entities;
      }
      if (period === 8) {
        params.start_date = customRange?.start || undefined;
        params.end_date = customRange?.end || undefined;
      }

      const url = getBulkExportUrl(orderedSelections, bulkFormat, params);
      const link = document.createElement("a");
      link.href = url;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Bulk export failed:", error);
      alert(__("Bulk export failed. Please try again.", "dashboardng"));
    } finally {
      setIsExporting(false);
    }
  };

  const formats: Format[] = [
    {
      id: "csv",
      label: "CSV",
      icon: "file-alt",
      description: __("Comma-separated values", "dashboardng"),
    },
    {
      id: "xlsx",
      label: "Excel (XLSX)",
      icon: "file-excel",
      description: __("Microsoft Excel format", "dashboardng"),
    },
    {
      id: "pdf",
      label: "PDF",
      icon: "file-pdf",
      description: __("Portable Document Format", "dashboardng"),
    },
  ];

  return (
    <Fragment>
      <div className="dropdown" ref={dropdownRef}>
        <button
          className="btn btn-sm btn-outline-primary dropdown-toggle d-flex align-items-center"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isExporting}
        >
          {isExporting ? (
            <span
              className="spinner-border spinner-border-sm me-1"
              role="status"
            ></span>
          ) : (
            <i className="fas fa-download me-1"></i>
          )}
          {__("Export", "dashboardng")}
        </button>
        {isOpen && (
          <ul className="dropdown-menu show" style={{ position: "absolute", right: 0 }}>
            {formats.map((format) => (
              <li key={format.id}>
                <button
                  className="dropdown-item d-flex align-items-center"
                  onClick={() => handleExport(format.id)}
                >
                  <i className={`fas fa-${format.icon} me-2`}></i>
                  <div>
                    <div>{format.label}</div>
                    <small className="text-muted">{format.description}</small>
                  </div>
                </button>
              </li>
            ))}
            {bulkAvailable && (
              <Fragment>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button
                    className="dropdown-item d-flex align-items-center"
                    onClick={() => { setIsOpen(false); setShowBulkModal(true); }}
                  >
                    <i className="fas fa-layer-group me-2"></i>
                    <div>
                      <div>{__("Bulk export", "dashboardng")}</div>
                      <small className="text-muted">{__("Choose tabs to export", "dashboardng")}</small>
                    </div>
                  </button>
                </li>
              </Fragment>
            )}
          </ul>
        )}
      </div>
      {showBulkModal && bulkAvailable && (
        <Fragment>
          <div className="modal-backdrop show" onClick={() => setShowBulkModal(false)}></div>
          <div className="modal show d-block" tabIndex={-1} style={{ zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-layer-group me-2"></i>
                    {__("Bulk export", "dashboardng")}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowBulkModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label mb-0">{__("Reports", "dashboardng")}</label>
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleSelectAll}>
                      {__("Select all", "dashboardng")}
                    </button>
                  </div>
                  <div className="border rounded p-2" style={{ maxHeight: 220, overflow: "auto" }}>
                    {bulkOptions.map((option) => (
                      <div className="form-check" key={option.id}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`bulk-${option.id}`}
                          checked={bulkSelections.includes(option.id)}
                          onChange={() => toggleBulkSelection(option.id)}
                        />
                        <label className="form-check-label" htmlFor={`bulk-${option.id}`}>
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <label className="form-label">{__("Format", "dashboardng")}</label>
                    <div className="d-flex flex-column gap-2">
                      {formats.map((format) => {
                        const isSelected = bulkFormat === format.id;
                        const descriptionClass = isSelected ? 'text-white-50' : 'text-muted';
                        return (
                          <button
                            key={format.id}
                            type="button"
                            className={`btn w-100 d-flex align-items-center justify-content-between text-start ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                            aria-pressed={isSelected}
                            onClick={() => setBulkFormat(format.id)}
                          >
                            <span className="d-flex align-items-center gap-2 flex-grow-1">
                              <i className={`fas fa-${format.icon} me-2`}></i>
                              <span className="fw-semibold">{format.label}</span>
                              <small className={descriptionClass}>{format.description}</small>
                            </span>
                            {isSelected && <i className="fas fa-check"></i>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>
                    {__("Cancel", "dashboardng")}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleBulkExport}
                    disabled={!bulkSelections.length || isExporting}
                  >
                    {isExporting ? (
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    ) : (
                      <i className="fas fa-download me-1"></i>
                    )}
                    {__("Export selected", "dashboardng")} ({bulkSelections.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Fragment>
      )}
    </Fragment>
  );
};

export default ExportDropdown;
