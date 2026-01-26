/**
 * DashboardNG Task Reports Module
 *
 * Preact-based task report viewer with Chart.js charts
 * Provides comprehensive task analytics including overview, technician, entity, and ticket reports
 * @module taskReports
 */

/* global Chart */
import {
  html,
  render,
  useState,
  useEffect,
  useCallback,
} from "./lib/preact.js";

import { ReportCard } from "./components/ui/ReportCard.js";
import { SettingsModal } from "./components/ui/SettingsModal.js";
import { ExportDropdown } from "./components/ui/ExportDropdown.js";
import { PeriodSelector } from "./components/ui/PeriodSelector.js";
import { LoadingSpinner } from "./components/ui/common/LoadingSpinner.js";
import { ErrorAlert } from "./components/ui/common/ErrorAlert.js";
import { EmptyState } from "./components/ui/common/EmptyState.js";
import { DataTable } from "./components/ui/common/DataTable.js";
import { StatCard } from "./components/ui/common/StatCard.js";
import { api } from "./lib/config.js";
import { __ } from "./lib/i18n.js";

function PieChart({ data, title, topK = undefined }) {
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

        let labels = data.map((item) => item.label);
        let values = data.map((item) => item.count || item.value);

        if (topK && topK > 0 && data.length > topK) {
          const sorted = [...data].toSorted((a, b) => (b.count || b.value) - (a.count || a.value));
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
                display: Boolean(title),
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
                data: data.map((item) => item[valueKey] || item.count || item.value),
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
                display: Boolean(title),
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

const formatTime = (seconds) => {
  if (!seconds || seconds === 0) {return "0h";}
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

function OverviewReport({ period, rangeParams = {}, onSettingsClick, getCardSettings, cardIdPrefix }) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch("/reports/task-overview", { period, ...rangeParams });
      setData(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [period, rangeParams?.start_date, rangeParams?.end_date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {return html`<${LoadingSpinner} />`;}
  if (error)
    {return html`<${ErrorAlert} message=${error} onRetry=${loadData} />`;}
  if (!data) {return html`<${EmptyState} />`;}

  return html`
    <div class="row g-4 mb-4">
      <div class="col-md-4">
        <${StatCard}
          label=${__("Total Tasks", "dashboardng")}
          value=${data.total_tasks}
          icon="tasks"
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
          icon="hourglass-half"
          color="info"
        />
      </div>
    </div>

    <div class="row g-4">
      <div class="col-md-6">
        <${ReportCard}
          title=${__("Tasks by Category", "dashboardng")}
          onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-category`)}
        >
          <div class="row">
            <div class="col-md-6">
              <${PieChart}
                data=${data.by_category}
                topK=${getCardSettings(`${cardIdPrefix}-category`).topK || undefined}
              />
            </div>
            <div class="col-md-6">
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
            </div>
          </div>
        <//>
      </div>
      <div class="col-md-6">
        <${ReportCard}
          title=${__("Category Breakdown", "dashboardng")}
        >
          <${DataTable}
            columns=${[
              { key: "label", label: __("Category", "dashboardng") },
              { key: "count", label: __("Tasks", "dashboardng"), align: "right" },
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

function TechnicianReport({ period, rangeParams = {} }) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch("/reports/task-by-technician", { period, ...rangeParams });
      setData(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [period, rangeParams?.start_date, rangeParams?.end_date]);


  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { key: "name", label: __("Technician", "dashboardng") },
    {
      key: "task_count",
      label: __("Tasks", "dashboardng"),
      align: "right",
    },
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

  if (!data || data.length === 0) {
    return html`<${ReportCard}
      title=${__("Tasks by Technician", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <${EmptyState} message=${__("No technician data available", "dashboardng")} />
    <//>`;
  }

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

function EntityReport({ period, rangeParams = {} }) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch("/reports/task-by-entity", { period, ...rangeParams });
      setData(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [period, rangeParams?.start_date, rangeParams?.end_date]);


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

  if (!data || data.length === 0) {
    return html`<${ReportCard}
      title=${__("Tasks by Entity", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <${EmptyState} message=${__("No entity data available", "dashboardng")} />
    <//>`;
  }

  return html`
    <${ReportCard}
      title=${__("Tasks by Entity", "dashboardng")}
      loading=${loading}
      error=${error}
      onRetry=${loadData}
    >
      <div class="row">
        <div class="col-md-6">
          <${PieChart} data=${data.map((d) => ({ label: d.name, count: d.task_count }))} />
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

function TicketReport({ period, rangeParams = {} }) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(undefined);
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch("/reports/task-by-ticket", { period, ...rangeParams });
      setData(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [period, rangeParams?.start_date, rangeParams?.end_date]);


  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    {
      key: "id",
      label: __("ID", "dashboardng"),
      render: (v) =>
        html`<a href="${window.CFG_GLPI.root_doc}/front/ticket.form.php?id=${v}" target="_blank">#${v}</a>`,
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
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCard, setSettingsCard] = useState(undefined);
  const [chartSettings, setChartSettings] = useState({});
  const exportTypeMap = {
    overview: "task-overview",
    technician: "task-by-technician",
    entity: "task-by-entity",
    ticket: "task-by-ticket",
  };
  const exportType = exportTypeMap[activeTab] || "task-overview";

  useEffect(() => {
    const saved = localStorage.getItem('taskReportsChartSettings');
    if (saved) {
      try {
        setChartSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse chart settings:', error);
      }
    }
  }, []);

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
    setSettingsCard(undefined);
  };

  const getCardSettings = (cardId) => {
    return chartSettings[cardId] || {};
  };

  const tabs = [
    { id: "overview", label: __("Overview", "dashboardng"), icon: "fa-chart-pie" },
    { id: "technician", label: __("By Technician", "dashboardng"), icon: "fa-user" },
    { id: "entity", label: __("By Entity", "dashboardng"), icon: "fa-building" },
    { id: "ticket", label: __("By Ticket", "dashboardng"), icon: "fa-ticket-alt" },
  ];
  const bulkOptions = tabs.map((tab) => ({
    id: exportTypeMap[tab.id] || tab.id,
    label: tab.label,
  }));

  const renderContent = () => {
    const rangeParams = period === 8
      ? { start_date: customRange.start || undefined, end_date: customRange.end || undefined }
      : {};

    switch (activeTab) {
      case "overview": {
        return html`<${OverviewReport} period=${period} rangeParams=${rangeParams} onSettingsClick=${handleSettingsClick} getCardSettings=${getCardSettings} cardIdPrefix="overview" />`;
      }
      case "technician": {
        return html`<${TechnicianReport} period=${period} rangeParams=${rangeParams} />`;
      }
      case "entity": {
        return html`<${EntityReport} period=${period} rangeParams=${rangeParams} />`;
      }
      case "ticket": {
        return html`<${TicketReport} period=${period} rangeParams=${rangeParams} />`;
      }
      default: {
        return html`<${EmptyState}
          message=${__("Select a report type", "dashboardng")}
        />`;
      }
    }
  };

  return html`
    <div class="dashboardng-reports">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="mb-0">
          ${__("Task Reports", "dashboardng")}
        </h2>
        <div class="d-flex align-items-center gap-3">
          <label class="form-label mb-0 text-muted"
            >${__("Period", "dashboardng")}:</label
          >
          <${PeriodSelector}
            value=${period}
            onChange=${setPeriod}
            showCustomRange=${true}
            customRange=${customRange}
            onCustomRangeChange=${setCustomRange}
          />
          <${ExportDropdown}
            reportType=${exportType}
            period=${period}
            customRange=${customRange}
            bulkOptions=${bulkOptions}
          />
        </div>
      </div>

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

       <div class="tab-content">${renderContent()}</div>

       <${SettingsModal}
         isOpen=${showSettings}
         onClose=${() => { setShowSettings(false); setSettingsCard(undefined); }}
         onSave=${handleSettingsSave}
         settings=${getCardSettings(settingsCard || '')}
         chartType=${'pie'}
       />
     </div>
   `;
}

document.addEventListener("DOMContentLoaded", async () => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // required for translation loading (TODO: fix the damn translation loader)
  const container = document.getElementById("dashboardng-tasks");
  if (container) {
    render(html`<${TaskReportsApp} />`, container);
  }
});

window.DashboardNGTaskReports = {
  TaskReportsApp,
  OverviewReport,
  TechnicianReport,
  EntityReport,
  TicketReport,
  ExportDropdown,
};
