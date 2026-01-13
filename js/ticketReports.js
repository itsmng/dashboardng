/**
 * DashboardNG Ticket Reports Module
 *
 * Preact-based ticket report viewer with Chart.js charts
 * Provides comprehensive ticket analytics including overview, entity, technician, SLA, category, group, and priority reports
 * @module ticketReports
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


const CONFIG = window.DASHBOARDNG_CONFIG || {
  apiBaseUrl: "/plugins/dashboardng/api.php",
  pollInterval: 60000,
};

const API_BASE = window.CFG_GLPI.root_doc + CONFIG.apiBaseUrl;

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


function LoadingSpinner() {
  return html`
    <div class="d-flex justify-content-center align-items-center p-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">${__("Loading...", "dashboardng")}</span>
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
          <i class="fas fa-refresh me-1"></i>${__("Retry", "dashboardng")}
        </button>
      `}
    </div>
  `;
}

function EmptyState({ message }) {
  return html`
    <div class="text-center text-muted p-5">
      <i class="fas fa-chart-bar" style="font-size: 3rem;"></i>
      <p class="mt-3">${message || __("No data available", "dashboardng")}</p>
    </div>
  `;
}


function ExportDropdown({ reportType, period, entities }) {
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
      const params = { period };
      if (entities) {
        params.entities = entities;
      }

      const url = api.getExportUrl(reportType, format, params);

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
        class="btn btn-outline-primary btn-sm dropdown-toggle"
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
        </ul>
      `}
    </div>
  `;
}

function PeriodSelector({ value, onChange }) {
  const periods = [
    { value: 0, label: __("All time", "dashboardng") },
    { value: 1, label: __("Current year", "dashboardng") },
    { value: 2, label: __("Current month", "dashboardng") },
    { value: 3, label: __("Last 7 days", "dashboardng") },
    { value: 4, label: __("Last 15 days", "dashboardng") },
    { value: 5, label: __("Last 30 days", "dashboardng") },
    { value: 6, label: __("Last 90 days", "dashboardng") },
    { value: 7, label: __("Last 180 days", "dashboardng") },
  ];

  return html`
    <select
      class="form-select form-select-sm"
      value=${value}
      onChange=${(e) => onChange(parseInt(e.target.value, 10))}
      style="width: auto;"
    >
      ${periods.map(
        (p) => html` <option value=${p.value}>${p.label}</option> `,
      )}
    </select>
  `;
}


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
        let labels = data.map((item) => item.label);
        let values = data.map((item) => item.count || item.value);

        if (topK && topK > 0 && data.length > topK) {
          const sorted = [...data].sort((a, b) => (b.count || b.value) - (a.count || a.value));
          const topKItems = sorted.slice(0, topK);
          const others = sorted.slice(topK);
          const othersValue = others.reduce((sum, item) => sum + (item.count || item.value), 0);

          labels = [...topKItems.map(item => item.label), __("Others", "dashboardng")];
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
    style="height: 250px;"
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


function StatCard({ label, value, icon, color = "primary", trend }) {
  return html`
    <div class="card h-100 border-${color} border-start border-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="text-muted mb-1">${label}</h6>
            <h3 class="mb-0">${value}</h3>
            ${trend !== undefined &&
            html`
              <small class="text-${trend >= 0 ? "success" : "danger"}">
                <i
                  class="fas fa-arrow-${trend >= 0 ? "up" : "down"} me-1"
                ></i>
                ${Math.abs(trend)}%
              </small>
            `}
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

function ReportCard({ title, children, loading, error, onRetry, toolbar }) {
  return html`
    <div class="card mb-4">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="card-title mb-0">${title}</h5>
        ${toolbar && html`<div class="card-toolbar">${toolbar}</div>`}
      </div>
      <div class="card-body">
        ${loading && html`<${LoadingSpinner} />`}
        ${error && html`<${ErrorAlert} message=${error} onRetry=${onRetry} />`}
        ${!loading && !error && children}
      </div>
    </div>
  `;
}


function OverviewReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/overview", { period });
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return html`<${LoadingSpinner} />`;
  if (error)
    return html`<${ErrorAlert} message=${error} onRetry=${loadData} />`;
  if (!data) return html`<${EmptyState} />`;

  return html`
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <${StatCard}
          label=${__("Total Tickets", "dashboardng")}
          value=${data.total_tickets}
          icon="ticket-alt"
          color="primary"
        />
      </div>
      <div class="col-md-3">
        <${StatCard}
          label=${__("Resolved", "dashboardng")}
          value=${data.resolved_tickets}
          icon="check-circle"
          color="success"
        />
      </div>
      <div class="col-md-3">
        <${StatCard}
          label=${__("Open", "dashboardng")}
          value=${data.open_tickets}
          icon="clock"
          color="warning"
        />
      </div>
      <div class="col-md-3">
        <${StatCard}
          label=${__("Resolution Rate", "dashboardng")}
          value=${data.resolution_rate + "%"}
          icon="percent"
          color="info"
        />
      </div>
    </div>

     <div class="row g-4">
       <div class="col-md-6">
         <${ReportCard}
           title=${__("By Type", "dashboardng")}
           onSettingsClick=${() => handleSettingsClick('overview-by-type')}
         >
           <div class="row">
             <div class="col-md-6">
               <${PieChart}
                 data=${data.by_type}
                 topK=${getCardSettings('overview-by-type').topK || null}
               />
             </div>
             <div class="col-md-6">
               <${DataTable}
                 columns=${[
                   { key: "label", label: __("Type", "dashboardng") },
                   {
                     key: "count",
                     label: __("Count", "dashboardng"),
                     align: "right",
                   },
                 ]}
                 rows=${data.by_type}
               />
             </div>
           </div>
         <//>
       </div>
       <div class="col-md-6">
         <${ReportCard}
           title=${__("By Status", "dashboardng")}
           onSettingsClick=${() => handleSettingsClick('overview-by-status')}
         >
           <div class="row">
             <div class="col-md-6">
               <${PieChart}
                 data=${data.by_status}
                 topK=${getCardSettings('overview-by-status').topK || null}
               />
             </div>
             <div class="col-md-6">
               <${DataTable}
                 columns=${[
                   { key: "label", label: __("Status", "dashboardng") },
                   {
                     key: "count",
                     label: __("Count", "dashboardng"),
                     align: "right",
                   },
                 ]}
                 rows=${data.by_status}
               />
             </div>
           </div>
         <//>
       </div>
     </div>
  `;
}


function EntityReport({ period }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/entity", { period });
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { key: "completename", label: __("Entity", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right",
    },
    { key: "open_tickets", label: __("Open", "dashboardng"), align: "right" },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right",
      render: (v) =>
        html`<span
          class="badge bg-${v >= 80
            ? "success"
            : v >= 50
              ? "warning"
              : "danger"}"
          >${v}%</span
        >`,
    },
    {
      key: "avg_resolution_hours",
      label: __("Avg Time", "dashboardng"),
      align: "right",
      render: (v) => `${v}h`,
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Entity Report", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <${DataTable}
        columns=${columns}
        rows=${data}
        emptyMessage=${__("No entity data available", "dashboardng")}
      />
    <//>
  `;
}


function TechnicianReport({ period }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/technician", { period });
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { key: "name", label: __("Technician", "dashboardng") },
    {
      key: "total_tickets",
      label: __("Assigned", "dashboardng"),
      align: "right",
    },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right",
    },
    { key: "open_tickets", label: __("Open", "dashboardng"), align: "right" },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right",
      render: (v) =>
        html`<span
          class="badge bg-${v >= 80
            ? "success"
            : v >= 50
              ? "warning"
              : "danger"}"
          >${v}%</span
        >`,
    },
    {
      key: "avg_resolution_hours",
      label: __("Avg Time", "dashboardng"),
      align: "right",
      render: (v) => `${v}h`,
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Technician Performance", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <${DataTable}
        columns=${columns}
        rows=${data}
        emptyMessage=${__("No technician data available", "dashboardng")}
      />
    <//>
  `;
}


function SlaReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/sla", { period });
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return html`<${LoadingSpinner} />`;
  if (error)
    return html`<${ErrorAlert} message=${error} onRetry=${loadData} />`;
  if (!data) return html`<${EmptyState} />`;

  const trendData = data.monthly_trend || [];

   return html`
     <div class="row g-4 mb-4">
       <div class="col-md-2">
         <${StatCard}
           label=${__("With SLA", "dashboardng")}
           value=${data.total_with_sla}
           icon="bolt"
           color="primary"
         />
       </div>
       <div class="col-md-2">
         <${StatCard}
           label=${__("On Time", "dashboardng")}
           value=${data.on_time}
           icon="check-circle"
           color="success"
         />
       </div>
       <div class="col-md-2">
         <${StatCard}
           label=${__("Late", "dashboardng")}
           value=${data.late}
           icon="clock"
           color="warning"
         />
       </div>
       <div class="col-md-2">
         <${StatCard}
           label=${__("Overdue", "dashboardng")}
           value=${data.overdue}
           icon="exclamation-triangle"
           color="danger"
         />
       </div>
       <div class="col-md-4">
         <${StatCard}
           label=${__("SLA Compliance Rate", "dashboardng")}
           value=${data.compliance_rate + "%"}
           icon="percent"
           color=${data.compliance_rate >= 80
             ? "success"
             : data.compliance_rate >= 50
               ? "warning"
               : "danger"}
         />
       </div>
     </div>

    ${trendData.length > 0 &&
    html`
      <${ReportCard} title=${__("Monthly SLA Trend", "dashboardng")}>
        <${DataTable}
          columns=${[
            { key: "label", label: __("Month", "dashboardng") },
            { key: "total", label: __("Total", "dashboardng"), align: "right" },
            {
              key: "on_time",
              label: __("On Time", "dashboardng"),
              align: "right",
            },
            { key: "late", label: __("Late", "dashboardng"), align: "right" },
            {
              key: "rate",
              label: __("Rate", "dashboardng"),
              align: "right",
              render: (v) =>
                html`<span
                  class="badge bg-${v >= 80
                    ? "success"
                    : v >= 50
                      ? "warning"
                      : "danger"}"
                  >${v}%</span
                >`,
            },
          ]}
          rows=${trendData}
        />
      <//>
    `}
  `;
}


function CategoryReport({ period }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/category", { period });
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { key: "completename", label: __("Category", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
    {
      key: "percentage",
      label: __("Share", "dashboardng"),
      align: "right",
      render: (v) => html`<span class="badge bg-secondary">${v}%</span>`,
    },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right",
    },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right",
      render: (v) =>
        html`<span
          class="badge bg-${v >= 80
            ? "success"
            : v >= 50
              ? "warning"
              : "danger"}"
          >${v}%</span
        >`,
    },
    {
      key: "avg_resolution_hours",
      label: __("Avg Time", "dashboardng"),
      align: "right",
      render: (v) => `${v}h`,
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Category Report", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <${DataTable}
        columns=${columns}
        rows=${data}
        emptyMessage=${__("No category data available", "dashboardng")}
      />
    <//>
  `;
}


function GroupReport({ period }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/group", { period });
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { key: "completename", label: __("Group", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right",
    },
    { key: "open_tickets", label: __("Open", "dashboardng"), align: "right" },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right",
      render: (v) =>
        html`<span
          class="badge bg-${v >= 80
            ? "success"
            : v >= 50
              ? "warning"
              : "danger"}"
          >${v}%</span
        >`,
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Group Report", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <${DataTable}
        columns=${columns}
        rows=${data}
        emptyMessage=${__("No group data available", "dashboardng")}
      />
    <//>
  `;
}


function PriorityReport({ period }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/priority", { period });
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { key: "label", label: __("Priority", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right",
    },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right",
      render: (v) =>
        html`<span
          class="badge bg-${v >= 80
            ? "success"
            : v >= 50
              ? "warning"
              : "danger"}"
          >${v}%</span
        >`,
    },
    {
      key: "avg_resolution_hours",
      label: __("Avg Time", "dashboardng"),
      align: "right",
      render: (v) => `${v}h`,
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Priority Report", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <${DataTable}
        columns=${columns}
        rows=${data}
        emptyMessage=${__("No priority data available", "dashboardng")}
      />
    <//>
  `;
}


function TicketReportsApp() {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState(0); // Default: all time
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCard, setSettingsCard] = useState(null);
  const [chartSettings, setChartSettings] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem('ticketReportsChartSettings');
    if (saved) {
      try {
        setChartSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse chart settings:', e);
      }
    }
  }, []);

  const saveChartSettings = (cardId, newSettings) => {
    const updated = { ...chartSettings, [cardId]: { ...chartSettings[cardId], ...newSettings } };
    setChartSettings(updated);
    localStorage.setItem('ticketReportsChartSettings', JSON.stringify(updated));
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

  const tabs = [
    { id: "overview", label: __("Overview", "dashboardng"), icon: "fa-chart-pie" },
    { id: "entity", label: __("By Entity", "dashboardng"), icon: "fa-building" },
    {
      id: "technician",
      label: __("By Technician", "dashboardng"),
      icon: "fa-user",
    },
    {
      id: "sla",
      label: __("SLA Compliance", "dashboardng"),
      icon: "fa-clock",
    },
    { id: "category", label: __("By Category", "dashboardng"), icon: "fa-tags" },
    { id: "group", label: __("By Group", "dashboardng"), icon: "fa-users" },
    {
      id: "priority",
      label: __("By Priority", "dashboardng"),
      icon: "fa-exclamation-circle",
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return html`<${OverviewReport} period=${period} />`;
      case "entity":
        return html`<${EntityReport} period=${period} />`;
      case "technician":
        return html`<${TechnicianReport} period=${period} />`;
      case "sla":
        return html`<${SlaReport} period=${period} />`;
      case "category":
        return html`<${CategoryReport} period=${period} />`;
      case "group":
        return html`<${GroupReport} period=${period} />`;
      case "priority":
        return html`<${PriorityReport} period=${period} />`;
      default:
        return html`<${EmptyState}
          message=${__("Select a report type", "dashboardng")}
        />`;
    }
  };

  return html`
    <div class="dashboardng-reports">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="mb-0">
          <i class="fas fa-ticket-alt me-2"></i>
          ${__("Ticket Reports", "dashboardng")}
        </h2>
        <div class="d-flex align-items-center gap-3">
          <label class="form-label mb-0 text-muted"
            >${__("Period", "dashboardng")}:</label
          >
          <${PeriodSelector} value=${period} onChange=${setPeriod} />
          <${ExportDropdown} reportType=${activeTab} period=${period} />
        </div>
      </div>

      <!-- Tab Navigation -->
      <ul class="nav nav-tabs mb-4">
        ${tabs.map(
          (tab) => html`
             <li class="nav-item">
               <button
                 class="nav-link ${activeTab === tab.id ? "active" : ""}"
                 onClick=${() => setActiveTab(tab.id)}
               >
                 <i class="fas ${tab.icon} me-1"></i>
                 ${tab.label}
               </button>
             </li>
          `,
        )}
      </ul>

       <!-- Content -->
       <div class="tab-content">${renderContent()}</div>

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


document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dashboardng-tickets");
  if (container) {
    render(html`<${TicketReportsApp} />`, container);
  }
});

window.DashboardNGTicketReports = {
  TicketReportsApp,
  OverviewReport,
  EntityReport,
  TechnicianReport,
  SlaReport,
  CategoryReport,
  GroupReport,
  PriorityReport,
  ExportDropdown,
};
