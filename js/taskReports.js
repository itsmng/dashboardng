/**
 * DashboardNG Task Reports Module
 *
 * Preact-based task report viewer with Chart.js charts
 * Displays task statistics, technician workload, entity analysis, and ticket association
 * @module taskReports
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

const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return "0h";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
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
    },
    [data, title],
  );

  return html`<canvas
    ref=${canvasRef}
    class="chartjs-canvas"
    style="height: 280px;"
  ></canvas>`;
}

function BarChart({ data, title, horizontal = false, valueKey = "count" }) {
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
                data: data.map(
                  (item) => item[valueKey] || item.count || item.value,
                ),
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
    [data, title, horizontal, valueKey],
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

function TaskOverviewReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/task-overview", { period });
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
       <div class="col-md-4">
        <${StatCard}
          label=${__("Total Tasks", "dashboardng")}
          value=${data.total_tasks}
          icon="check-square"
          color="primary"
        />
      </div>
      <div class="col-md-4">
         <${StatCard}
           label=${__("Total Time Spent", "dashboardng")}
           value=${formatTime(data.total_time)}
           icon="clock"
           color="success"
         />
      </div>
      <div class="col-md-4">
        <${StatCard}
          label=${__("Total Hours", "dashboardng")}
          value=${data.total_time_hours + "h"}
          icon="hourglass-start"
          color="info"
         />
      </div>
    </div>

    <div class="row g-4">
       <div class="col-md-6">
         <${ReportCard}
           title=${__("Tasks by Category", "dashboardng")}
           onSettingsClick=${() => handleSettingsClick('tasks-by-category`)}
         >
           <${PieChart}
             data=${data.by_category}
             topK=${getCardSettings('tasks-by-category').topK || null}
           />
         <//>
       </div>
       <div class="col-md-6">
         <${ReportCard}
           title=${__("Category Breakdown", "dashboardng")}
           onSettingsClick=${() => handleSettingsClick('category-breakdown`)}
         >
           <${DataTable}
             columns=${[
               { key: "label", label: __("Category", "dashboardng") },
               {
                 key: "count",
                 label: __("Tasks", "dashboardng"),
                 align: "right",
               },
               {
                 key: "total_time",
                 label: __("Time Spent", "dashboardng"),
                 align: "right",
                 render: (v) => formatTime(v),
               },
             ]}
             rows=${data.by_category}
             emptyMessage=${__("No category data available", "dashboardng")}
           />
         <//>
       </div>
     </div>
  `;
}


function ByTechnicianReport({ period }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/task-by-technician", { period });
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
    { key: "task_count", label: __("Tasks", "dashboardng"), align: "right" },
    {
      key: "total_time",
      label: __("Time Spent", "dashboardng"),
      align: "right",
      render: (v) => formatTime(v),
    },
    {
      key: "total_time_hours",
      label: __("Hours", "dashboardng"),
      align: "right",
      render: (v) => `${v}h`,
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Tasks by Technician", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <div class="row">
        <div class="col-md-8">
          <${BarChart}
            data=${data.slice(0, 10)}
            horizontal=${true}
            valueKey="task_count"
          />
        </div>
        <div class="col-md-4">
          <${DataTable}
            columns=${columns}
            rows=${data}
            emptyMessage=${__("No technician data available", "dashboardng")}
          />
        </div>
      </div>
    <//>
  `;
}


function ByEntityReport({ period, onSettingsClick, getCardSettings }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/task-by-entity", { period });
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
    { key: "name", label: __("Entity", "dashboardng") },
    { key: "task_count", label: __("Tasks", "dashboardng"), align: "right" },
    {
      key: "total_time",
      label: __("Time Spent", "dashboardng"),
      align: "right",
      render: (v) => formatTime(v),
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Tasks by Entity", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
      onSettingsClick=${() => onSettingsClick('tasks-by-entity')}
    >
      <${DataTable}
        columns=${columns}
        rows=${data}
        emptyMessage=${__("No entity data available", "dashboardng")}
      />
    <//>
  `;
}
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { key: "name", label: __("Entity", "dashboardng") },
    { key: "task_count", label: __("Tasks", "dashboardng"), align: "right" },
    {
      key: "total_time",
      label: __("Time Spent", "dashboardng"),
      align: "right",
      render: (v) => formatTime(v),
    },
    {
      key: "total_time_hours",
      label: __("Hours", "dashboardng"),
      align: "right",
      render: (v) => `${v}h`,
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Tasks by Entity", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <div class="row">
        <div class="col-md-6">
          <${PieChart}
            data=${data.map((d) => ({ label: d.name, count: d.task_count }))}
          />
        </div>
        <div class="col-md-6">
          <${DataTable}
            columns=${columns}
            rows=${data}
            emptyMessage=${__("No entity data available", "dashboardng")}
          />
        </div>
      </div>
    <//>
  `;
}


function ByTicketReport({ period, onSettingsClick, getCardSettings }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/reports/task-by-ticket", { period });
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
    {
      key: "id",
      label: __("ID", "dashboardng"),
      render: (v, row) =>
        html`<a
          href="${window.CFG_GLPI.root_doc}/front/ticket.form.php?id=${v}"
          target="_blank"
          >#${v}</a
        >`,
    },
    { key: "name", label: __("Ticket", "dashboardng") },
    {
      key: "task_count",
      label: __("Tasks", "dashboardng"),
      align: "right",
      render: (v) => html`<span class="badge bg-primary">${v}</span>`,
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Tickets with Most Tasks", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
      onSettingsClick=${() => onSettingsClick('tickets-with-most-tasks')}
    >
      <${DataTable}
        columns=${columns}
        rows=${data}
        emptyMessage=${__("No ticket data available", "dashboardng")}
      />
    <//>
  `;
}
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    {
      key: "id",
      label: __("ID", "dashboardng"),
      render: (v, row) =>
        html`<a
          href="${window.CFG_GLPI.root_doc}/front/ticket.form.php?id=${v}"
          target="_blank"
          >#${v}</a
        >`,
    },
    { key: "name", label: __("Ticket", "dashboardng") },
    {
      key: "task_count",
      label: __("Tasks", "dashboardng"),
      align: "right",
      render: (v) => html`<span class="badge bg-primary">${v}</span>`,
    },
    {
      key: "total_time",
      label: __("Time Spent", "dashboardng"),
      align: "right",
      render: (v) => formatTime(v),
    },
  ];

  return html`
    <${ReportCard}
      title=${__("Tickets with Most Tasks", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <${DataTable}
        columns=${columns}
        rows=${data}
        emptyMessage=${__("No ticket data available", "dashboardng")}
      />
    <//>
  `;
}


function TaskReportsApp() {
   const [activeTab, setActiveTab] = useState("overview");
   const [period, setPeriod] = useState(0);
   const [showSettings, setShowSettings] = useState(false);
   const [settingsCard, setSettingsCard] = useState(null);
   const [chartSettings, setChartSettings] = useState({});

   // Load chart settings from localStorage
   useEffect(() => {
     const saved = localStorage.getItem('taskReportsChartSettings');
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
     localStorage.setItem('taskReportsChartSettings', JSON.stringify(updated));
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
    {
      id: "technician",
      label: __("By Technician", "dashboardng"),
      icon: "fa-user",
    },
    { id: "entity", label: __("By Entity", "dashboardng"), icon: "fa-building" },
    { id: "ticket", label: __("By Ticket", "dashboardng"), icon: "fa-ticket-alt" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return html`<${TaskOverviewReport} period=${period} />`;
      case "technician":
        return html`<${ByTechnicianReport} period=${period} onSettingsClick=${onSettingsClick} getCardSettings=${getCardSettings} />`;
      case "entity":
        return html`<${ByEntityReport} period=${period} onSettingsClick=${onSettingsClick} getCardSettings=${getCardSettings} />`;
      case "ticket":
        return html`<${ByTicketReport} period=${period} onSettingsClick=${onSettingsClick} getCardSettings=${getCardSettings} />`;
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
           <i class="fas fa-tasks me-2"></i>
           ${__("Task Reports", "dashboardng")}
         </h2>
        <div class="d-flex align-items-center gap-3">
          <label class="form-label mb-0 text-muted"
            >${__("Period", "dashboardng")}:</label
          >
          <${PeriodSelector} value=${period} onChange=${setPeriod} />
          <${ExportDropdown}
            reportType=${"task-" + activeTab}
            period=${period}
          />
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
  const container = document.getElementById("dashboardng-tasks");
  if (container) {
    render(html`<${TaskReportsApp} />`, container);
  }
});

window.DashboardNGTaskReports = {
  TaskReportsApp,
  TaskOverviewReport,
  ByTechnicianReport,
  ByEntityReport,
  ByTicketReport,
  ExportDropdown,
};
