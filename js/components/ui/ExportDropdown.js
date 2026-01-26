import { html, useState, useEffect, useRef } from '../../lib/preact.js';
import { CONFIG } from '../../lib/config.js';
import { __ } from '../../lib/i18n.js';

const getExportUrl = (type, format, params = {}) => {
  const url = new URL(`${CONFIG.apiUrl || "/plugins/dashboardng/api.php"}/reports/${type}/export`, window.location.origin);
  url.searchParams.append("format", format);
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      url.searchParams.append(key, val);
    }
  });
  return url.toString();
};

const getBulkExportUrl = (types, format, params = {}) => {
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

export const ExportDropdown = ({ reportType, period, itemtype, entities, customRange = {}, bulkOptions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFormat, setBulkFormat] = useState("xlsx");
  const [bulkSelections, setBulkSelections] = useState([]);
  const dropdownRef = useRef(null);
  const bulkAvailable = Array.isArray(bulkOptions) && bulkOptions.length > 0;
  const bulkIds = bulkAvailable ? bulkOptions.map((option) => option.id) : [];
  const bulkIdsKey = bulkIds.join("|");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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

  const handleExport = async (format) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      const params = { period };
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

  const toggleBulkSelection = (id) => {
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
      const params = { period };
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

  const formats = [
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

  return html`
    <div class="dropdown" ref=${dropdownRef}>
      <button
        class="btn btn-sm btn-outline-primary dropdown-toggle d-flex align-items-center"
        type="button"
        onClick=${() => setIsOpen(!isOpen)}
        disabled=${isExporting}
      >
        ${isExporting
          ? html`
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
              ></span>
             `
          : html` <i class="fas fa-download me-1"></i> `}
        ${__("Export", "dashboardng")}
      </button>
      ${isOpen &&
      html`
        <ul class="dropdown-menu show" style="position: absolute; right: 0;">
          ${formats.map(
            (format) => html`
              <li>
                <button
                  class="dropdown-item d-flex align-items-center"
                  onClick=${() => handleExport(format.id)}
                >
                  <i class="fas fa-${format.icon} me-2"></i>
                  <div>
                    <div>${format.label}</div>
                    <small class="text-muted">${format.description}</small>
                  </div>
                </button>
              </li>
            `,
          )}
          ${bulkAvailable && html`
            <li><hr class="dropdown-divider" /></li>
            <li>
              <button
                class="dropdown-item d-flex align-items-center"
                onClick=${() => { setIsOpen(false); setShowBulkModal(true); }}
              >
                <i class="fas fa-layer-group me-2"></i>
                <div>
                  <div>${__("Bulk export", "dashboardng")}</div>
                  <small class="text-muted">${__("Choose tabs to export", "dashboardng")}</small>
                </div>
              </button>
            </li>
          `}
        </ul>
      `}
    </div>
    ${showBulkModal && bulkAvailable && html`
      <div class="modal-backdrop show" onClick=${() => setShowBulkModal(false)}></div>
      <div class="modal show d-block" tabindex="-1" style="z-index: 1060;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-layer-group me-2"></i>
                ${__("Bulk export", "dashboardng")}
              </h5>
              <button type="button" class="btn-close" onClick=${() => setShowBulkModal(false)}></button>
            </div>
            <div class="modal-body">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <label class="form-label mb-0">${__("Reports", "dashboardng")}</label>
                <button class="btn btn-sm btn-outline-secondary" onClick=${handleSelectAll}>
                  ${__("Select all", "dashboardng")}
                </button>
              </div>
              <div class="border rounded p-2" style="max-height: 220px; overflow: auto;">
                ${bulkOptions.map((option) => html`
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      id=${`bulk-${option.id}`}
                      checked=${bulkSelections.includes(option.id)}
                      onChange=${() => toggleBulkSelection(option.id)}
                    />
                    <label class="form-check-label" for=${`bulk-${option.id}`}>
                      ${option.label}
                    </label>
                  </div>
                `)}
              </div>
              <div class="mt-3">
                <label class="form-label">${__("Format", "dashboardng")}</label>
                <div class="d-flex flex-column gap-2">
                  ${formats.map((format) => {
                    const isSelected = bulkFormat === format.id;
                    const descriptionClass = isSelected ? 'text-white-50' : 'text-muted';
                    return html`
                      <button
                        type="button"
                        class="btn w-100 d-flex align-items-center justify-content-between text-start ${isSelected ? 'btn-primary' : 'btn-outline-primary'}"
                        aria-pressed=${isSelected}
                        onClick=${() => setBulkFormat(format.id)}
                      >
                        <span class="d-flex align-items-center gap-2 flex-grow-1">
                          <i class="fas fa-${format.icon} me-2"></i>
                          <span class="fw-semibold">${format.label}</span>
                          <small class=${descriptionClass}>${format.description}</small>
                        </span>
                        ${isSelected && html`<i class="fas fa-check"></i>`}
                      </button>
                    `;
                  })}
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onClick=${() => setShowBulkModal(false)}>
                ${__("Cancel", "dashboardng")}
              </button>
              <button
                class="btn btn-primary"
                onClick=${handleBulkExport}
                disabled=${!bulkSelections.length || isExporting}
              >
                ${isExporting ? html`
                  <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                ` : html`<i class="fas fa-download me-1"></i>`}
                ${__("Export selected", "dashboardng")} (${bulkSelections.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    `}
  `;
};

export default ExportDropdown;
