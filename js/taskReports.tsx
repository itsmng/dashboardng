/**
 * DashboardNG Task Reports Module
 *
 * Preact-based task report viewer with Chart.js charts
 * Provides comprehensive task analytics including overview, technician, entity, and ticket reports
 * @module taskReports
 */

/* global Chart */
import type { ChartConfiguration } from 'chart.js';
import {
  h,
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

interface ChartDataItem {
  label?: string;
  name?: string;
  count?: number;
  value?: number;
  total_time?: number;
  task_count?: number;
  total_time_hours?: number;
  [key: string]: unknown;
}

interface PieChartProps {
  data: ChartDataItem[];
  title?: string;
  topK?: number;
}

interface BarChartProps {
  data: ChartDataItem[];
  title?: string;
  horizontal?: boolean;
  valueKey?: string;
}

interface OverviewReportProps {
  period: number;
  rangeParams?: { start_date?: string; end_date?: string };
  onSettingsClick: (cardId: string) => void;
  getCardSettings: (cardId: string) => Record<string, unknown>;
  cardIdPrefix: string;
}

interface TechnicianReportProps {
  period: number;
  rangeParams?: { start_date?: string; end_date?: string };
}

interface EntityReportProps {
  period: number;
  rangeParams?: { start_date?: string; end_date?: string };
}

interface TicketReportProps {
  period: number;
  rangeParams?: { start_date?: string; end_date?: string };
}

interface OverviewData {
  total_tasks: number;
  total_time: number;
  total_time_hours: number;
  by_category: ChartDataItem[];
}

function PieChart({ data, title, topK }: PieChartProps) {
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
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
          const sorted = [...data].toSorted((a, b) => (b.count || b.value || 0) - (a.count || a.value || 0));
          const topKItems = sorted.slice(0, topK);
          const others = sorted.slice(topK);
          const othersValue = others.reduce((sum, item) => sum + (item.count || item.value || 0), 0);

          labels = [...topKItems.map(item => item.label), __("Others", "dashboardng")];
          values = [...topKItems.map(item => item.count || item.value || 0), othersValue];
        }

        const config: ChartConfiguration = {
          type: "pie",
          data: {
            labels: labels,
            datasets: [
              {
                data: values as number[],
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

        const chart = new window.Chart(ctx, config);
        return () => chart.destroy();
      }
    },
    [data, title, topK],
  );

  return <canvas ref={canvasRef} className="chartjs-canvas" style={{ height: '250px' }}></canvas>;
}

function BarChart({ data, title, horizontal = false, valueKey = "count" }: BarChartProps) {
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
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

        const config: ChartConfiguration = {
          type: "bar",
          data: {
            labels: data.map((item) => item.label || item.name),
            datasets: [
              {
                data: data.map((item) => (item[valueKey as keyof ChartDataItem] as number) || item.count || item.value || 0),
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

        const chart = new window.Chart(ctx, config);
        return () => chart.destroy();
      }
    },
    [data, title, horizontal, valueKey],
  );

  return <canvas ref={canvasRef} className="chartjs-canvas" style={{ height: '300px' }}></canvas>;
}

const formatTime = (seconds: number) => {
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

function OverviewReport({ period, rangeParams = {}, onSettingsClick, getCardSettings, cardIdPrefix }: OverviewReportProps) {
  const [data, setData] = useState<OverviewData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch("/reports/task-overview", { period, ...rangeParams });
      setData(result.data as OverviewData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [period, rangeParams?.start_date, rangeParams?.end_date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {return <LoadingSpinner />;}
  if (error)
    {return <ErrorAlert message={error} onRetry={loadData} />;}
  if (!data) {return <EmptyState />;}

  return (
    <div className="overview-report">
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <StatCard
            label={__("Total Tasks", "dashboardng")}
            value={data.total_tasks}
            icon="tasks"
            color="primary"
          />
        </div>
        <div className="col-md-4">
          <StatCard
            label={__("Total Time Spent", "dashboardng")}
            value={formatTime(data.total_time)}
            icon="clock"
            color="success"
          />
        </div>
        <div className="col-md-4">
          <StatCard
            label={__("Total Hours", "dashboardng")}
            value={data.total_time_hours + "h"}
            icon="hourglass-half"
            color="info"
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <ReportCard
            title={__("Tasks by Category", "dashboardng")}
            onSettingsClick={() => onSettingsClick(`${cardIdPrefix}-category`)}
          >
            <div className="row">
              <div className="col-md-6">
                <PieChart
                  data={data.by_category}
                  topK={getCardSettings(`${cardIdPrefix}-category`).topK as number | undefined}
                />
              </div>
              <div className="col-md-6">
                <DataTable
                  columns={[
                    { key: "label", label: __("Category", "dashboardng") },
                    {
                      key: "count",
                      label: __("Tasks", "dashboardng"),
                      align: "right" as const,
                    },
                    {
                      key: "total_time",
                      label: __("Time Spent", "dashboardng"),
                      align: "right" as const,
                      render: (v: unknown) => formatTime(v as number),
                    },
                  ]}
                  rows={data.by_category as Record<string, unknown>[]}
                  emptyMessage={__("No category data available", "dashboardng")}
                />
              </div>
            </div>
          </ReportCard>
        </div>
        <div className="col-md-6">
          <ReportCard
            title={__("Category Breakdown", "dashboardng")}
          >
            <DataTable
              columns={[
                { key: "label", label: __("Category", "dashboardng") },
                { key: "count", label: __("Tasks", "dashboardng"), align: "right" as const },
                {
                  key: "total_time",
                  label: __("Time Spent", "dashboardng"),
                  align: "right" as const,
                  render: (v: unknown) => formatTime(v as number),
                },
              ]}
              rows={data.by_category as Record<string, unknown>[]}
              emptyMessage={__("No category data available", "dashboardng")}
            />
          </ReportCard>
        </div>
      </div>
    </div>
  );
}

function TechnicianReport({ period, rangeParams = {} }: TechnicianReportProps) {
  const [data, setData] = useState<ChartDataItem[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch("/reports/task-by-technician", { period, ...rangeParams });
      setData(result.data as ChartDataItem[]);
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
      align: "right" as const,
    },
    {
      key: "total_time",
      label: __("Time Spent", "dashboardng"),
      align: "right" as const,
      render: (v: unknown) => formatTime(v as number),
    },
    {
      key: "total_time_hours",
      label: __("Hours", "dashboardng"),
      align: "right" as const,
      render: (v: unknown) => `${v}h`,
    },
  ];

  if (!data || data.length === 0) {
    return (
      <ReportCard
        title={__("Tasks by Technician", "dashboardng")}
        loading={loading}
        error={error}
        onRetry={loadData}
      >
        <EmptyState message={__("No technician data available", "dashboardng")} />
      </ReportCard>
    );
  }

  return (
    <ReportCard
      title={__("Tasks by Technician", "dashboardng")}
      loading={loading}
      error={error}
      onRetry={loadData}
    >
      <div className="row">
        <div className="col-md-8">
          <BarChart
            data={data.slice(0, 10)}
            horizontal={true}
            valueKey="task_count"
          />
        </div>
        <div className="col-md-4">
          <DataTable
            columns={columns}
            rows={data as Record<string, unknown>[]}
            emptyMessage={__("No technician data available", "dashboardng")}
          />
        </div>
      </div>
    </ReportCard>
  );
}

function EntityReport({ period, rangeParams = {} }: EntityReportProps) {
  const [data, setData] = useState<ChartDataItem[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch("/reports/task-by-entity", { period, ...rangeParams });
      setData(result.data as ChartDataItem[]);
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
    { key: "task_count", label: __("Tasks", "dashboardng"), align: "right" as const },
    {
      key: "total_time",
      label: __("Time Spent", "dashboardng"),
      align: "right" as const,
      render: (v: unknown) => formatTime(v as number),
    },
    {
      key: "total_time_hours",
      label: __("Hours", "dashboardng"),
      align: "right" as const,
      render: (v: unknown) => `${v}h`,
    },
  ];

  if (!data || data.length === 0) {
    return (
      <ReportCard
        title={__("Tasks by Entity", "dashboardng")}
        loading={loading}
        error={error}
        onRetry={loadData}
      >
        <EmptyState message={__("No entity data available", "dashboardng")} />
      </ReportCard>
    );
  }

  return (
    <ReportCard
      title={__("Tasks by Entity", "dashboardng")}
      loading={loading}
      error={error}
      onRetry={loadData}
    >
      <div className="row">
        <div className="col-md-6">
          <PieChart data={data.map((d) => ({ label: d.name, count: d.task_count }))} />
        </div>
        <div className="col-md-6">
          <DataTable
            columns={columns}
            rows={data as Record<string, unknown>[]}
            emptyMessage={__("No entity data available", "dashboardng")}
          />
        </div>
      </div>
    </ReportCard>
  );
}

interface TicketDataItem {
  id: number;
  name: string;
  task_count: number;
  total_time: number;
  [key: string]: unknown;
}

function TicketReport({ period, rangeParams = {} }: TicketReportProps) {
  const [data, setData] = useState<TicketDataItem[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch("/reports/task-by-ticket", { period, ...rangeParams });
      setData(result.data as TicketDataItem[]);
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
      render: (v: unknown) =>
        <a href={`${window.CFG_GLPI.root_doc}/front/ticket.form.php?id=${v as number}`} target="_blank" rel="noopener noreferrer">#{v as number}</a>,
    },
    { key: "name", label: __("Ticket", "dashboardng") },
    {
      key: "task_count",
      label: __("Tasks", "dashboardng"),
      align: "right" as const,
      render: (v: unknown) => <span className="badge bg-primary">{v as number}</span>,
    },
    {
      key: "total_time",
      label: __("Time Spent", "dashboardng"),
      align: "right" as const,
      render: (v: unknown) => formatTime(v as number),
    },
  ];

  return (
    <ReportCard
      title={__("Tickets with Most Tasks", "dashboardng")}
      loading={loading}
      error={error}
      onRetry={loadData}
    >
      <DataTable
        columns={columns}
        rows={data as Record<string, unknown>[]}
        emptyMessage={__("No ticket data available", "dashboardng")}
      />
    </ReportCard>
  );
}

interface CustomRange {
  start: string;
  end: string;
}

interface ChartSettings {
  [key: string]: Record<string, unknown>;
}

function TaskReportsApp() {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState(0);
  const [customRange, setCustomRange] = useState<CustomRange>({ start: '', end: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCard, setSettingsCard] = useState<string | undefined>(undefined);
  const [chartSettings, setChartSettings] = useState<ChartSettings>({});
  const exportTypeMap: Record<string, string> = {
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

  const saveChartSettings = (cardId: string, newSettings: Record<string, unknown>) => {
    const updated = { ...chartSettings, [cardId]: { ...chartSettings[cardId], ...newSettings } };
    setChartSettings(updated);
    localStorage.setItem('taskReportsChartSettings', JSON.stringify(updated));
  };

  const handleSettingsClick = (cardId: string) => {
    setSettingsCard(cardId);
    setShowSettings(true);
  };

  const handleSettingsSave = (newSettings: Record<string, unknown>) => {
    if (settingsCard) {
      saveChartSettings(settingsCard, newSettings);
    }
    setShowSettings(false);
    setSettingsCard(undefined);
  };

  const getCardSettings = (cardId: string) => {
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
        return <OverviewReport period={period} rangeParams={rangeParams} onSettingsClick={handleSettingsClick} getCardSettings={getCardSettings} cardIdPrefix="overview" />;
      }
      case "technician": {
        return <TechnicianReport period={period} rangeParams={rangeParams} />;
      }
      case "entity": {
        return <EntityReport period={period} rangeParams={rangeParams} />;
      }
      case "ticket": {
        return <TicketReport period={period} rangeParams={rangeParams} />;
      }
      default: {
        return <EmptyState message={__("Select a report type", "dashboardng")} />;
      }
    }
  };

  return (
    <div className="dashboardng-reports">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          {__("Task Reports", "dashboardng")}
        </h2>
        <div className="d-flex align-items-center gap-3">
          <label className="form-label mb-0 text-muted">
            {__("Period", "dashboardng")}:
          </label>
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            showCustomRange={true}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
          <ExportDropdown
            reportType={exportType}
            period={period}
            customRange={customRange}
            bulkOptions={bulkOptions}
          />
        </div>
      </div>

      <ul className="nav nav-tabs mb-4">
        {tabs.map((tab) => (
          <li className="nav-item" key={tab.id}>
            <button
              className={`nav-link ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fas ${tab.icon} me-1`}></i>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="tab-content">{renderContent()}</div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => { setShowSettings(false); setSettingsCard(undefined); }}
        onSave={handleSettingsSave}
        settings={getCardSettings(settingsCard || '')}
        chartType={'pie'}
      />
    </div>
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const container = document.getElementById("dashboardng-tasks");
  if (container) {
    render(<TaskReportsApp />, container);
  }
});

interface TaskReportsModule {
  TaskReportsApp: typeof TaskReportsApp;
  OverviewReport: typeof OverviewReport;
  TechnicianReport: typeof TechnicianReport;
  EntityReport: typeof EntityReport;
  TicketReport: typeof TicketReport;
  ExportDropdown: typeof ExportDropdown;
}

window.DashboardNGTaskReports = {
  TaskReportsApp,
  OverviewReport,
  TechnicianReport,
  EntityReport,
  TicketReport,
  ExportDropdown,
} as TaskReportsModule;
