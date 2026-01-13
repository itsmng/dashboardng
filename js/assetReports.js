/**
 * DashboardNG Asset Reports Module
 *
 * Preact-based asset report viewer with Chart.js charts
 * Users select an itemtype from a dropdown to see reports for that asset type
 * @module assetReports
 */

import {
  html,
  render,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "./lib/preact.js";

import { ReportCard } from "./components/ui/ReportCard.js";
import { SettingsModal } from "./components/ui/SettingsModal.js";

// Configuration & API

const CONFIG = window.DASHBOARDNG_CONFIG || {
  apiBaseUrl: "/plugins/dashboardng/api.php",
  pollInterval: 60000,
  i18n: {},
};

const API_BASE = window.CFG_GLPI.root_doc + CONFIG.apiBaseUrl;

const i18n = (key, fallback) => CONFIG.i18n[key] || fallback || key;

const api = {
  async get(endpoint, params = {}) {
    const url = new URL(API_BASE + endpoint, window.location.origin);
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, val);
      }
    });

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  },

  getExportUrl(type, format, params = {}) {
    const url = new URL(
      API_BASE + `/reports/${type}/export`,
      window.location.origin,
    );
    url.searchParams.append("format", format);
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, val);
      }
    });
    return url.toString();
  },
};

// Asset type definitions
const ASSET_TYPES = [
  {
    id: "Computer",
    label: "Computers",
    icon: "device-desktop",
    table: "glpi_computers",
  },
  {
    id: "Monitor",
    label: "Monitors",
    icon: "device-imac",
    table: "glpi_monitors",
  },
  { id: "Printer", label: "Printers", icon: "printer", table: "glpi_printers" },
  {
    id: "NetworkEquipment",
    label: "Network Equipment",
    icon: "network",
    table: "glpi_networkequipments",
  },
  { id: "Phone", label: "Phones", icon: "phone", table: "glpi_phones" },
  {
    id: "Peripheral",
    label: "Peripherals",
    icon: "keyboard",
    table: "glpi_peripherals",
  },
  { id: "Software", label: "Software", icon: "apps", table: "glpi_softwares" },
];

// Utility Components

function LoadingSpinner() {
  return html`
    <div class="d-flex justify-content-center align-items-center p-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">${i18n("loading", "Loading...")}</span>
      </div>
    </div>
  `;
}

function ErrorAlert({ message, onRetry }) {
  return html`
    <div class="alert alert-danger d-flex align-items-center" role="alert">
      <i class="fas fa-exclamation-triangle me-2"></i>
      <div class="flex-grow-1">${message}</div>
      ${onRetry &&
      html`
        <button class="btn btn-sm btn-outline-danger ms-2" onClick=${onRetry}>
          <i class="fas fa-refresh me-1"></i>${i18n("retry", "Retry")}
        </button>
      `}
    </div>
  `;
}

function EmptyState({ message }) {
  return html`
    <div class="text-center text-muted p-5">
      <i class="fas fa-chart-bar" style="font-size: 3rem;"></i>
      <p class="mt-3">${message || i18n("no_data", "No data available")}</p>
    </div>
  `;
}

// Export Dropdown Component

function ExportDropdown({ reportType, itemtype }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      const params = { itemtype };
      const url = api.getExportUrl(reportType, format, params);
      const link = document.createElement("a");
      link.href = url;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      alert(i18n("export_failed", "Export failed. Please try again."));
    } finally {
      setIsExporting(false);
    }
  };

  const formats = [
    {
      id: "csv",
      label: "CSV",
      icon: "file-alt",
      description: i18n("csv_desc", "Comma-separated values"),
    },
    {
      id: "xlsx",
      label: "Excel (XLSX)",
      icon: "file-excel",
      description: i18n("xlsx_desc", "Microsoft Excel format"),
    },
    {
      id: "pdf",
      label: "PDF",
      icon: "file-pdf",
      description: i18n("pdf_desc", "Portable Document Format"),
    },
  ];

  return html`
    <div class="dropdown" ref=${dropdownRef}>
      <button
        class="btn btn-outline-primary btn-lg dropdown-toggle d-flex align-items-center"
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
        ${i18n("export", "Export")}
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
        </ul>
      `}
    </div>
  `;
}

// Asset Type Selector

function AssetTypeSelector({ value, onChange }) {
  return html`
    <div class="d-flex align-items-center gap-2">
        <label class="form-label mb-0 text-muted fw-medium">
          <i class="fas fa-filter me-1"></i>
          ${i18n("asset_type", "Asset Type")}:
        </label>
      <select
        class="form-select form-select-lg"
        value=${value}
        onChange=${(e) => onChange(e.target.value)}
        style="min-width: 220px;"
      >
        ${ASSET_TYPES.map(
          (type) => html` <option value=${type.id}>${type.label}</option> `,
        )}
      </select>
    </div>
  `;
}

// Chart Components

function PieChart({ data, title, topK = null }) {
  const canvasRef = useCallback(
    (node) => {
      if (node && data && data.length > 0) {
        const ctx = node.getContext("2d");

        const colors = [
          "#0d6efd",
          "#198754",
          "#dc3545",
          "#ffc107",
          "#0dcaf0",
          "#6f42c1",
          "#fd7e14",
          "#20c997",
          "#6c757d",
          "#d63384",
        ];

        // Process data with Top K grouping
        let labels = data.map((item) => item.label || item.name);
        let values = data.map((item) => item.count || item.value);

        if (topK && topK > 0 && data.length > topK) {
          const sorted = [...data].sort((a, b) => (b.count || b.value) - (a.count || a.value));
          const topKItems = sorted.slice(0, topK);
          const others = sorted.slice(topK);
          const othersValue = others.reduce((sum, item) => sum + (item.count || item.value), 0);

          labels = [...topKItems.map(item => item.label || item.name), i18n("others", "Others")];
          values = [...topKItems.map(item => item.count || item.value), othersValue];
        }

        const config = {
          type: "pie",
          data: {
            labels: labels,
            datasets: [
              {
                data: values,
                backgroundColor: values.map((_, i) => colors[i % colors.length]),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: !!title,
                text: title,
                color: "#212529",
                font: { size: 14 },
              },
              legend: {
                position: "bottom",
                labels: { color: "#6c757d" },
              },
            },
          },
        };

        const chart = new Chart(ctx, config);
        return () => chart.destroy();
      }
    },
    [data, title, topK],
  );

  return html`<canvas
    ref=${canvasRef}
    class="chartjs-canvas"
    style="height: 280px;"
  ></canvas>`;
}

function BarChart({ data, title, horizontal = false }) {
  const canvasRef = useCallback(
    (node) => {
      if (node && data && data.length > 0) {
        const ctx = node.getContext("2d");

        const colors = [
          "#0d6efd",
          "#198754",
          "#dc3545",
          "#ffc107",
          "#0dcaf0",
          "#6f42c1",
          "#fd7e14",
          "#20c997",
          "#6c757d",
          "#d63384",
        ];

        const config = {
          type: "bar",
          data: {
            labels: data.map((item) => item.label || item.name),
            datasets: [
              {
                data: data.map((item) => item.count || item.value),
                backgroundColor: colors,
                borderWidth: 1,
              },
            ],
          },
          options: {
            indexAxis: horizontal ? "y" : "x",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: !!title,
                text: title,
                color: "#212529",
                font: { size: 14 },
              },
              legend: {
                display: false,
              },
            },
            scales: {
              x: {
                grid: { color: "#e9ecef" },
                ticks: { color: "#6c757d" },
              },
              y: {
                beginAtZero: true,
                grid: { color: "#e9ecef" },
                ticks: { color: "#6c757d" },
              },
            },
          },
        };

        const chart = new Chart(ctx, config);
        return () => chart.destroy();
      }
    },
    [data, title, horizontal],
  );

  return html`<canvas
    ref=${canvasRef}
    class="chartjs-canvas"
    style="height: 300px;"
  ></canvas>`;
}

function DataTable({ columns, rows, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return html`<${EmptyState} message=${emptyMessage} />`;
  }

  return html`
    <div class="table-responsive table-scroll">
      <table class="table table-striped table-hover mb-0" style="min-width: 0;">
        <thead class="table-light">
          <tr>
            ${columns.map(
              (col) => html`
                <th class=${col.align === "right" ? "text-end" : ""}>
                  ${col.label}
                </th>
              `,
            )}
          </tr>
        </thead>
        <tbody>
          ${rows.map(
            (row) => html`
              <tr>
                ${columns.map(
                  (col) => html`
                    <td class=${col.align === "right" ? "text-end" : ""}>
                      ${col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  `,
                )}
              </tr>
            `,
          )}
        </tbody>
      </table>
    </div>
  `;
}

// Report Cards

function StatCard({ label, value, icon, color = "primary" }) {
  return html`
    <div class="card h-100 border-${color} border-start border-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="text-muted mb-1">${label}</h6>
            <h3 class="mb-0">${value}</h3>
          </div>
          ${icon &&
          html`
            <div class="text-${color} opacity-50">
              <i class="fas fa-${icon}" style="font-size: 2.5rem;"></i>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
 }
 
 // ========================================
// Asset Type Report Component

function AssetTypeReport({ itemtype, onSettingsClick, getCardSettings, cardIdPrefix }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const assetType = ASSET_TYPES.find((t) => t.id === itemtype);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/asset-by-itemtype", { itemtype });
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [itemtype]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return html`<${LoadingSpinner} />`;
  if (error)
    return html`<${ErrorAlert} message=${error} onRetry=${loadData} />`;
  if (!data) return html`<${EmptyState} />`;

  return html`
    <!-- Summary Stats -->
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <${StatCard}
          label=${i18n("total", "Total") + " " + (assetType?.label || itemtype)}
          value=${data.total || 0}
          icon=${assetType?.icon || "device-unknown"}
          color="primary"
        />
      </div>
      <div class="col-md-3">
        <${StatCard}
          label=${i18n("in_use", "In Use")}
          value=${data.in_use || 0}
          icon="check"
          color="success"
        />
      </div>
      <div class="col-md-3">
        <${StatCard}
          label=${i18n("in_stock", "In Stock")}
          value=${data.in_stock || 0}
          icon="archive"
          color="info"
        />
      </div>
      <div class="col-md-3">
        <${StatCard}
          label=${i18n("with_tickets", "With Open Tickets")}
          value=${data.with_tickets || 0}
          icon="ticket"
          color="warning"
        />
      </div>
    </div>

     <!-- Charts Row 1: Manufacturer & Status -->
     <div class="row g-4 mb-4">
       <div class="col-md-6">
         <${ReportCard}
           title=${i18n("by_manufacturer", "By Manufacturer")}
           onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-manufacturer`)}
         >
           ${data.by_manufacturer && data.by_manufacturer.length > 0
             ? html`
                 <div class="row">
                   <div class="col-md-6">
                     <${PieChart}
                       data=${data.by_manufacturer}
                       topK=${getCardSettings(`${cardIdPrefix}-manufacturer`).topK || null}
                     />
                   </div>
                   <div class="col-md-6">
                     <${DataTable}
                       columns=${[
                         {
                           key: "label",
                           label: i18n("manufacturer", "Manufacturer"),
                         },
                         {
                           key: "count",
                           label: i18n("count", "Count"),
                           align: "right",
                         },
                       ]}
                       rows=${data.by_manufacturer}
                       emptyMessage=${i18n("no_data", "No data available")}
                     />
                   </div>
                 </div>
               `
             : html`<${EmptyState}
                 message=${i18n("no_manufacturer_data", "No manufacturer data")}
               />`}
         <//>
       </div>
       <div class="col-md-6">
         <${ReportCard}
           title=${i18n("by_status", "By Status")}
           onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-status`)}
         >
           ${data.by_status && data.by_status.length > 0
             ? html`
                 <div class="row">
                   <div class="col-md-6">
                     <${PieChart}
                       data=${data.by_status}
                       topK=${getCardSettings(`${cardIdPrefix}-status`).topK || null}
                     />
                   </div>
                   <div class="col-md-6">
                     <${DataTable}
                       columns=${[
                         { key: "label", label: i18n("status", "Status") },
                         {
                           key: "count",
                           label: i18n("count", "Count"),
                           align: "right",
                         },
                       ]}
                       rows=${data.by_status}
                       emptyMessage=${i18n("no_data", "No data available")}
                     />
                   </div>
                 </div>
               `
             : html`<${EmptyState}
                 message=${i18n("no_status_data", "No status data")}
               />`}
         <//>
       </div>
     </div>

    <!-- Charts Row 2: Location & Entity -->
    <div class="row g-4 mb-4">
      <div class="col-md-6">
        <${ReportCard} title=${i18n("by_location", "By Location")}>
          ${data.by_location && data.by_location.length > 0
            ? html`
                <${BarChart}
                  data=${data.by_location.slice(0, 10)}
                  horizontal=${true}
                />
              `
            : html`<${EmptyState}
                message=${i18n("no_location_data", "No location data")}
              />`}
        <//>
      </div>
      <div class="col-md-6">
        <${ReportCard} title=${i18n("by_entity", "By Entity")}>
          ${data.by_entity && data.by_entity.length > 0
            ? html`
                <${BarChart}
                  data=${data.by_entity.slice(0, 10)}
                  horizontal=${true}
                />
              `
            : html`<${EmptyState}
                message=${i18n("no_entity_data", "No entity data")}
              />`}
        <//>
      </div>
    </div>

     <!-- Itemtype-specific charts -->
     ${itemtype === "Computer" &&
     data.by_os &&
     data.by_os.length > 0 &&
     html`
       <div class="row g-4 mb-4">
         <div class="col-md-6">
             <${ReportCard}
              title=${i18n("by_operating_system", "By Operating System")}
              onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-os`)}
            >
              <div class="row">
                <div class="col-md-6">
                  <${PieChart}
                    data=${data.by_os}
                    topK=${getCardSettings(`${cardIdPrefix}-os`).topK || null}
                  />
                </div>

               <div class="col-md-6">
                 <${DataTable}
                   columns=${[
                     {
                       key: "label",
                       label: i18n("operating_system", "Operating System"),
                     },
                     {
                       key: "count",
                       label: i18n("count", "Count"),
                       align: "right",
                     },
                   ]}
                   rows=${data.by_os}
                 />
               </div>
             </div>
           <//>
         </div>
         <div class="col-md-6">
            <${ReportCard}
              title=${i18n("by_type", "By Type")}
              onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-type`)}
            >
              ${data.by_type && data.by_type.length > 0
                ? html`
                    <div class="row">
                      <div class="col-md-6">
                        <${PieChart}
                          data=${data.by_type}
                          topK=${getCardSettings(`${cardIdPrefix}-type`).topK || null}
                        />
                      </div>

                     <div class="col-md-6">
                       <${DataTable}
                         columns=${[
                           { key: "label", label: i18n("type", "Type") },
                           {
                             key: "count",
                             label: i18n("count", "Count"),
                             align: "right",
                           },
                         ]}
                         rows=${data.by_type}
                       />
                     </div>
                   </div>
               `
               : html`<${EmptyState}
                   message=${i18n("no_type_data", "No type data")}
                 />`}
           <//>
         </div>
       </div>
     `}
    ${itemtype === "Software" &&
    data.by_category &&
    data.by_category.length > 0 &&
    html`
       <div class="row g-4 mb-4">
         <div class="col-12">
           <${ReportCard}
             title=${i18n("by_category", "By Category")}
             onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-category`)}
           >
             <div class="row">
               <div class="col-md-6">
                 <${PieChart}
                   data=${data.by_category}
                   topK=${getCardSettings(`${cardIdPrefix}-category`).topK || null}
                 />
               </div>
               <div class="col-md-6">
                 <${DataTable}
                   columns=${[
                     {
                       key: "label",
                       label: i18n("category", "Category"),
                     },
                     {
                       key: "count",
                       label: i18n("count", "Count"),
                       align: "right",
                     },
                   ]}
                   rows=${data.by_category}
                 />
               </div>
             </div>
           <//>
         </div>
      </div>
    `}

    <!-- Model breakdown (for hardware types) -->
    ${data.by_model &&
    data.by_model.length > 0 &&
    html`
      <div class="row g-4 mb-4">
        <div class="col-12">
          <${ReportCard} title=${i18n("by_model", "By Model")}>
            <div class="row">
              <div class="col-md-8">
                <${BarChart}
                  data=${data.by_model.slice(0, 15)}
                  horizontal=${true}
                />
              </div>
              <div class="col-md-4">
                <${DataTable}
                  columns=${[
                    { key: "label", label: i18n("model", "Model") },
                    {
                      key: "count",
                      label: i18n("count", "Count"),
                      align: "right",
                    },
                  ]}
                  rows=${data.by_model}
                />
              </div>
            </div>
          <//>
        </div>
      </div>
    `}

    <!-- Recent items list -->
    ${data.recent_items &&
    data.recent_items.length > 0 &&
    html`
      <div class="row g-4">
        <div class="col-12">
          <${ReportCard} title=${i18n("recent_items", "Recently Added")}>
            <${DataTable}
              columns=${[
                {
                  key: "name",
                  label: i18n("name", "Name"),
                  render: (v, row) => html`
                    <a
                      href="${window.CFG_GLPI
                        .root_doc}/front/${itemtype.toLowerCase()}.form.php?id=${row.id}"
                      target="_blank"
                    >
                      ${v || i18n("unnamed", "(unnamed)")}
                    </a>
                  `,
                },
                { key: "serial", label: i18n("serial", "Serial") },
                { key: "location", label: i18n("location", "Location") },
                { key: "status", label: i18n("status", "Status") },
                { key: "date_creation", label: i18n("created", "Created") },
              ]}
              rows=${data.recent_items}
              emptyMessage=${i18n("no_recent_items", "No recent items")}
            />
          <//>
        </div>
      </div>
    `}
  `;
}

// Main Asset Reports App

function AssetReportsApp() {
  const [selectedType, setSelectedType] = useState("Computer");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCard, setSettingsCard] = useState(null);
  const [chartSettings, setChartSettings] = useState({});
  const assetType = ASSET_TYPES.find((t) => t.id === selectedType);

  // Load chart settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('assetReportsChartSettings');
    if (saved) {
      try {
        setChartSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse chart settings:', e);
      }
    }
  }, []);

  // Save chart settings to localStorage
  const saveChartSettings = (cardId, newSettings) => {
    const updated = { ...chartSettings, [cardId]: { ...chartSettings[cardId], ...newSettings } };
    setChartSettings(updated);
    localStorage.setItem('assetReportsChartSettings', JSON.stringify(updated));
  };

  const handleSettingsClick = (cardId) => {
    setSettingsCard(cardId);
    setShowSettings(true);
  };

  const handleSettingsSave = (newSettings) => {
    if (settingsCard) {
      saveChartSettings(settingsCard, newSettings);
    }
    setShowSettings(false);
    setSettingsCard(null);
  };

  const getCardSettings = (cardId) => {
    return chartSettings[cardId] || {};
  };

  return html`
    <div class="dashboardng-reports">
      <!-- Header -->
      <div
        class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3"
      >
       <h2 class="mb-0">
           <i class="fas fa-desktop me-2"></i>
           ${i18n("asset_reports", "Asset Reports")}
         </h2>
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <${AssetTypeSelector}
            value=${selectedType}
            onChange=${setSelectedType}
          />
          <${ExportDropdown}
            reportType="asset-itemtype"
            itemtype=${selectedType}
          />
        </div>
      </div>

      <!-- Selected type indicator -->
      <div class="alert alert-light d-flex align-items-center mb-4">
        <i
          class="ti ti-${assetType?.icon || "device-unknown"} me-2"
          style="font-size: 1.5rem;"
        ></i>
        <div>
          <strong
            >${i18n("showing_reports_for", "Showing reports for")}:</strong
          >
          <span class="ms-1">${assetType?.label || selectedType}</span>
        </div>
      </div>

       <!-- Content -->
       <${AssetTypeReport}
         itemtype=${selectedType}
         onSettingsClick=${handleSettingsClick}
         getCardSettings=${getCardSettings}
         cardIdPrefix=${selectedType}
         key=${selectedType}
       />

       <!-- Settings Modal -->
       <${SettingsModal}
         isOpen=${showSettings}
         onClose=${() => { setShowSettings(false); setSettingsCard(null); }}
         onSave=${handleSettingsSave}
         settings=${getCardSettings(settingsCard || '')}
         chartType=${'pie'}
       />
     </div>
   `;
 }

// Initialize

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dashboardng-assets");
  if (container) {
    render(html`<${AssetReportsApp} />`, container);
  }
});

// Export for potential external use
window.DashboardNGAssetReports = {
  AssetReportsApp,
  AssetTypeReport,
  ExportDropdown,
  ASSET_TYPES,
};
