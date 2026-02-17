/* global Chart */
/**
 * DashboardNG Ticket Reports Module
 *
 * Preact-based ticket report viewer with Chart.js charts
 * Provides comprehensive ticket analytics including overview, entity, technician, SLA, category, group, and priority reports
 * @module ticketReports
 */

import {
  h,
  render,
  useState,
  useEffect,
  useCallback,
  Fragment,
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
import { useReportData } from "./lib/hooks/useReportData.js";
import { __ } from "./lib/i18n.js";

type Align = "left" | "right" | "center";

const BAR_TOP_K_DEFAULT = 8;

const CHART_COLORS = {
  primary: "#0d6efd",
  success: "#198754",
  warning: "#ffc107",
  danger: "#dc3545",
  info: "#0dcaf0",
  secondary: "#6c757d",
  teal: "#20c997",
  orange: "#fd7e14",
};

const roundValue = (value: number, precision = 1) => {
  const factor = 10 ** precision;
  return Math.round((value || 0) * factor) / factor;
};

const addShareMetrics = (rows: Record<string, unknown>[], valueKey = "total_tickets") => {
  const total = rows.reduce((sum, row) => sum + ((row[valueKey] as number) || 0), 0);
  return {
    total,
    rows: rows.map((row) => ({
      ...row,
      share: total > 0 ? roundValue((((row[valueKey] as number) || 0) / total) * 100, 1) : 0,
    })),
  };
};

const buildTopKRows = (rows: Record<string, unknown>[], valueKey: string, labelKey: string, limit = 10, extraKeys: string[] = []) => {
  if (!limit || rows.length <= limit) {
    return rows;
  }
  const sorted = [...rows].toSorted((a, b) => ((b[valueKey] as number) || 0) - ((a[valueKey] as number) || 0));
  const topRows = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const restValue = rest.reduce((sum, row) => sum + ((row[valueKey] as number) || 0), 0);
  if (restValue <= 0) {
    return topRows;
  }
  const summary: Record<string, unknown> = { [labelKey]: __("Others", "dashboardng") };
  [valueKey, ...extraKeys].forEach((key) => {
    summary[key] = rest.reduce((sum, row) => sum + ((row[key] as number) || 0), 0);
  });
  return [...topRows, summary];
};

const renderShare = (value: number, color = "primary") => (
  <div className="d-flex align-items-center justify-content-end gap-2">
    <div className="progress" style={{ height: "6px", width: "80px" }}>
      <div className={`progress-bar bg-${color}`} style={{ width: `${value}%` }}></div>
    </div>
    <span className="text-muted" style={{ width: "48px", textAlign: "right" }}>
      {value}%
    </span>
  </div>
);

interface PieChartProps {
  data: Array<{ label: string; count?: number; value?: number }>;
  title?: string;
  topK?: number;
}

function PieChart({ data, title, topK }: PieChartProps) {
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node && data && data.length > 0) {
        const ctx = node.getContext("2d");

          const colors = [
           CHART_COLORS.primary,
           CHART_COLORS.success,
           CHART_COLORS.danger,
           CHART_COLORS.warning,
           CHART_COLORS.info,
           "#6f42c1",
           CHART_COLORS.orange,
           CHART_COLORS.teal,
           CHART_COLORS.secondary,
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
           type: "pie" as const,
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
                position: "bottom" as const,
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

  return <canvas ref={canvasRef} className="chartjs-canvas" style={{ height: "250px" }}></canvas>;
}

interface BarChartProps {
  labels: string[];
  datasets: Array<{
    label?: string;
    data: number[];
    backgroundColor: string;
  }>;
  stacked?: boolean;
  title?: string;
}

function BarChart({ labels, datasets, stacked = false, title }: BarChartProps) {
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node && labels && labels.length > 0) {
        const ctx = node.getContext("2d");
        const config = {
          type: "bar" as const,
          data: {
            labels,
            datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked },
              y: { stacked, beginAtZero: true },
            },
            plugins: {
              title: {
                display: Boolean(title),
                text: title,
                color: "#212529",
                font: { size: 14 },
              },
              legend: {
                position: "bottom" as const,
                labels: { color: "#6c757d" },
              },
              tooltip: {
                callbacks: {
                  label: (context: { dataset: { label?: string }; parsed: { y: number } }) => {
                    const label = context.dataset.label ? `${context.dataset.label}: ` : "";
                    return `${label}${context.parsed.y}`;
                  },
                },
              },
            },
          },
        };

        const chart = new window.Chart(ctx, config);
        return () => chart.destroy();
      }
    },
    [labels, datasets, stacked, title],
  );

  return <canvas ref={canvasRef} className="chartjs-canvas" style={{ height: "260px" }}></canvas>;
}

interface LineChartProps {
  labels: string[];
  datasets: Array<{
    label?: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension?: number;
    fill?: boolean;
  }>;
  title?: string;
}

function LineChart({ labels, datasets, title }: LineChartProps) {
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node && labels && labels.length > 0) {
        const ctx = node.getContext("2d");
        const config = {
          type: "line" as const,
          data: {
            labels,
            datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true },
            },
            plugins: {
              title: {
                display: Boolean(title),
                text: title,
                color: "#212529",
                font: { size: 14 },
              },
              legend: {
                position: "bottom" as const,
                labels: { color: "#6c757d" },
              },
            },
          },
        };

        const chart = new window.Chart(ctx, config);
        return () => chart.destroy();
      }
    },
    [labels, datasets, title],
  );

  return <canvas ref={canvasRef} className="chartjs-canvas" style={{ height: "260px" }}></canvas>;
}

interface RangeParams {
  start_date?: string;
  end_date?: string;
}

interface MonthlyRow {
  label: string;
  total_tickets?: number;
  resolved_tickets?: number;
  resolution_rate?: number;
  avg_resolution_hours?: number;
  [key: string]: unknown;
}

interface MonthlyReportProps {
  period: number;
  rangeParams?: RangeParams;
}

function MonthlyReport({ period, rangeParams = {} }: MonthlyReportProps) {
  const { data, loading, error } = useReportData("/reports/monthly", { period, ...rangeParams });
  const rows: MonthlyRow[] = (data as MonthlyRow[]) || [];
  const labels = rows.map((row) => row.label);

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <ReportCard
          title={__("Monthly Ticket Volume", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
        >
          {rows.length === 0
            ? <EmptyState message={__("No monthly data available", "dashboardng")} />
            : <LineChart
                labels={labels}
                datasets={[
                  {
                    label: __("Total", "dashboardng"),
                    data: rows.map((row) => row.total_tickets || 0),
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: "rgba(13, 110, 253, 0.2)",
                    tension: 0.3,
                    fill: true,
                  },
                  {
                    label: __("Resolved", "dashboardng"),
                    data: rows.map((row) => row.resolved_tickets || 0),
                    borderColor: CHART_COLORS.success,
                    backgroundColor: "rgba(25, 135, 84, 0.15)",
                    tension: 0.3,
                    fill: true,
                  },
                ]}
              />}
        </ReportCard>
      </div>
      <div className="col-lg-6">
        <ReportCard
          title={__("Resolution Rate Trend", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
        >
          {rows.length === 0
            ? <EmptyState message={__("No monthly data available", "dashboardng")} />
            : <BarChart
                labels={labels}
                datasets={[
                  {
                    label: __("Resolution Rate", "dashboardng"),
                    data: rows.map((row) => row.resolution_rate || 0),
                    backgroundColor: CHART_COLORS.info,
                  },
                ]}
              />}
        </ReportCard>
      </div>
      <div className="col-12">
        <ReportCard
          title={__("Monthly Trend", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
        >
          <DataTable
            columns={[
              { key: "label", label: __("Month", "dashboardng") },
              { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" as Align },
              { key: "resolved_tickets", label: __("Resolved", "dashboardng"), align: "right" as Align },
              {
                key: "resolution_rate",
                label: __("Rate", "dashboardng"),
                align: "right" as Align,
                render: (v) => <span className="badge bg-info">{v}%</span>,
              },
              {
                key: "avg_resolution_hours",
                label: __("Avg Time", "dashboardng"),
                align: "right" as Align,
                render: (v) => `${v}h`,
              },
            ]}
            rows={rows}
            emptyMessage={__("No monthly data available", "dashboardng")}
          />
        </ReportCard>
      </div>
    </div>
  );
}

interface CardSettings {
  topK?: number;
  [key: string]: unknown;
}

interface SourceReportProps {
  period: number;
  rangeParams?: RangeParams;
  getCardSettings: (cardId: string) => CardSettings;
  handleSettingsClick: (cardId: string, chartType: string) => void;
}

function SourceReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }: SourceReportProps) {
  const { data, loading, error } = useReportData("/reports/source", { period, ...rangeParams });
  const safeRows: Record<string, unknown>[] = (data as Record<string, unknown>[]) || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("source-share").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "name", topK);

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <ReportCard
          title={__("Ticket Sources", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("source-share", "pie")}
        >
          {total === 0
            ? <EmptyState message={__("No source data available", "dashboardng")} />
            : <PieChart
                data={topRows.map((row) => ({
                  label: row.name as string,
                  count: (row.total_tickets as number) || 0,
                }))}
                topK={getCardSettings("source-share").topK || undefined}
              />}
        </ReportCard>
      </div>
      <div className="col-lg-6">
        <ReportCard
          title={__("Source Volume", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("source-volume", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No source data available", "dashboardng")} />
            : <BarChart
                labels={topRows.map((row) => row.name as string)}
                datasets={[
                  {
                    label: __("Tickets", "dashboardng"),
                    data: topRows.map((row) => (row.total_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.secondary,
                  },
                ]}
              />}
        </ReportCard>
      </div>
      <div className="col-12">
        <ReportCard
          title={__("Source Report", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
        >
          <DataTable
            columns={[
              { key: "name", label: __("Source", "dashboardng") },
              { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" as Align },
              {
                key: "share",
                label: __("Share", "dashboardng"),
                align: "right" as Align,
                render: (v) => renderShare(v as number, "secondary"),
              },
            ]}
            rows={rows}
            emptyMessage={__("No source data available", "dashboardng")}
          />
        </ReportCard>
      </div>
    </div>
  );
}

interface OverviewReportProps {
  period: number;
  rangeParams?: RangeParams;
  getCardSettings: (cardId: string) => CardSettings;
  handleSettingsClick: (cardId: string, chartType: string) => void;
}

interface OverviewData {
  total_tickets?: number;
  resolved_tickets?: number;
  open_tickets?: number;
  resolution_rate?: number;
  by_type?: Array<{ label: string; count?: number }>;
  by_status?: Array<{ label: string; count?: number }>;
}

function OverviewReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }: OverviewReportProps) {
  const { data, loading, error } = useReportData("/reports/overview", { period, ...rangeParams });
  const overviewData = data as OverviewData | null;

  if (loading) {return <LoadingSpinner />;}
  if (error)
    {return <ErrorAlert message={error} onRetry={() => location.reload()} />;}
  if (!overviewData) {return <EmptyState />;}

  return (
    <Fragment>
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <StatCard
            label={__("Total Tickets", "dashboardng")}
            value={overviewData.total_tickets}
            icon="ticket-alt"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            label={__("Resolved", "dashboardng")}
            value={overviewData.resolved_tickets}
            icon="check-circle"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            label={__("Open", "dashboardng")}
            value={overviewData.open_tickets}
            icon="clock"
            color="warning"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            label={__("Resolution Rate", "dashboardng")}
            value={overviewData.resolution_rate + "%"}
            icon="percent"
            color="info"
          />
        </div>
      </div>

       <div className="row g-4">
         <div className="col-md-6">
           <ReportCard
             title={__("By Type", "dashboardng")}
            onSettingsClick={() => handleSettingsClick('overview-by-type', 'pie')}
           >
             <div className="row">
               <div className="col-md-6">
                 <PieChart
                   data={overviewData.by_type || []}
                   topK={getCardSettings('overview-by-type').topK || undefined}
                 />
               </div>
               <div className="col-md-6">
                 <DataTable
                   columns={[
                     { key: "label", label: __("Type", "dashboardng") },
                     {
                       key: "count",
                       label: __("Count", "dashboardng"),
                       align: "right" as Align,
                     },
                   ]}
                   rows={overviewData.by_type || []}
                 />
               </div>
             </div>
           </ReportCard>
         </div>
         <div className="col-md-6">
           <ReportCard
             title={__("By Status", "dashboardng")}
            onSettingsClick={() => handleSettingsClick('overview-by-status', 'pie')}
           >
             <div className="row">
               <div className="col-md-6">
                 <PieChart
                   data={overviewData.by_status || []}
                   topK={getCardSettings('overview-by-status').topK || undefined}
                 />
               </div>
               <div className="col-md-6">
                 <DataTable
                   columns={[
                     { key: "label", label: __("Status", "dashboardng") },
                     {
                       key: "count",
                       label: __("Count", "dashboardng"),
                       align: "right" as Align,
                     },
                   ]}
                   rows={overviewData.by_status || []}
                 />
               </div>
             </div>
           </ReportCard>
         </div>
       </div>
    </Fragment>
  );
}


interface EntityReportProps {
  period: number;
  rangeParams?: RangeParams;
  getCardSettings: (cardId: string) => CardSettings;
  handleSettingsClick: (cardId: string, chartType: string) => void;
}

function EntityReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }: EntityReportProps) {
  const { data, loading, error } = useReportData("/reports/entity", { period, ...rangeParams });
  const safeRows: Record<string, unknown>[] = (data as Record<string, unknown>[]) || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("entity-volume").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "completename", topK, ["resolved_tickets", "open_tickets"]);
  const chartLabels = topRows.map((row) => (row.completename || row.name) as string);

  const columns = [
    { key: "completename", label: __("Entity", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" as Align },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => renderShare(v as number, "primary"),
    },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right" as Align,
    },
    { key: "open_tickets", label: __("Open", "dashboardng"), align: "right" as Align },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => {
        const num = v as number;
        return (
          <span
            className={`badge bg-${num >= 80
              ? "success"
              : (num >= 50
                ? "warning"
                : "danger")}`}
            >{num}%</span>
        );
      },
    },
    {
      key: "avg_resolution_hours",
      label: __("Avg Time", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => `${v}h`,
    },
  ];

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <ReportCard
          title={__("Ticket Volume by Entity", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("entity-volume", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No entity data available", "dashboardng")} />
            : <BarChart
                labels={chartLabels}
                datasets={[
                  {
                    label: __("Total", "dashboardng"),
                    data: topRows.map((row) => (row.total_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.primary,
                  },
                ]}
              />}
        </ReportCard>
      </div>
      <div className="col-lg-6">
        <ReportCard
          title={__("Entity Resolution Mix", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("entity-resolution-mix", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No entity data available", "dashboardng")} />
            : <BarChart
                labels={chartLabels}
                datasets={[
                  {
                    label: __("Resolved", "dashboardng"),
                    data: topRows.map((row) => (row.resolved_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.success,
                  },
                  {
                    label: __("Open", "dashboardng"),
                    data: topRows.map((row) => (row.open_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.warning,
                  },
                ]}
                stacked={true}
              />}
        </ReportCard>
      </div>
      <div className="col-12">
        <ReportCard
          title={__("Entity Report", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
        >
          <DataTable
            columns={columns}
            rows={rows}
            emptyMessage={__("No entity data available", "dashboardng")}
          />
        </ReportCard>
      </div>
    </div>
  );
}

interface TechnicianReportProps {
  period: number;
  rangeParams?: RangeParams;
  getCardSettings: (cardId: string) => CardSettings;
  handleSettingsClick: (cardId: string, chartType: string) => void;
}

function TechnicianReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }: TechnicianReportProps) {
  const { data, loading, error } = useReportData("/reports/technician", { period, ...rangeParams });
  const safeRows: Record<string, unknown>[] = (data as Record<string, unknown>[]) || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("technician-volume").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "name", topK, ["resolved_tickets", "open_tickets"]);
  const chartLabels = topRows.map((row) => row.name as string);

  const columns = [
    { key: "name", label: __("Technician", "dashboardng") },
    {
      key: "total_tickets",
      label: __("Assigned", "dashboardng"),
      align: "right" as Align,
    },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => renderShare(v as number, "info"),
    },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right" as Align,
    },
    { key: "open_tickets", label: __("Open", "dashboardng"), align: "right" as Align },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => {
        const num = v as number;
        return (
          <span
            className={`badge bg-${num >= 80
              ? "success"
              : (num >= 50
                ? "warning"
                : "danger")}`}
            >{num}%</span>
        );
      },
    },
    {
      key: "avg_resolution_hours",
      label: __("Avg Time", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => `${v}h`,
    },
  ];

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <ReportCard
          title={__("Tickets by Technician", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("technician-volume", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No technician data available", "dashboardng")} />
            : <BarChart
                labels={chartLabels}
                datasets={[
                  {
                    label: __("Assigned", "dashboardng"),
                    data: topRows.map((row) => (row.total_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.primary,
                  },
                ]}
              />}
        </ReportCard>
      </div>
      <div className="col-lg-6">
        <ReportCard
          title={__("Resolution Mix", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("technician-resolution", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No technician data available", "dashboardng")} />
            : <BarChart
                labels={chartLabels}
                datasets={[
                  {
                    label: __("Resolved", "dashboardng"),
                    data: topRows.map((row) => (row.resolved_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.success,
                  },
                  {
                    label: __("Open", "dashboardng"),
                    data: topRows.map((row) => (row.open_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.warning,
                  },
                ]}
                stacked={true}
              />}
        </ReportCard>
      </div>
      <div className="col-12">
        <ReportCard
          title={__("Technician Performance", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
        >
          <DataTable
            columns={columns}
            rows={rows}
            emptyMessage={__("No technician data available", "dashboardng")}
          />
        </ReportCard>
      </div>
    </div>
  );
}

interface SlaReportProps {
  period: number;
  rangeParams?: RangeParams;
}

interface SlaData {
  total_with_sla?: number;
  on_time?: number;
  late?: number;
  overdue?: number;
  compliance_rate?: number;
  monthly_trend?: Array<{ label: string; total?: number; on_time?: number; late?: number; rate?: number }>;
}

function SlaReport({ period, rangeParams = {} }: SlaReportProps) {
  const { data, loading, error } = useReportData("/reports/sla", { period, ...rangeParams });
  const slaData = data as SlaData | null;

  if (loading) {return <LoadingSpinner />;}
  if (error)
    {return <ErrorAlert message={error} onRetry={() => location.reload()} />;}
  if (!slaData) {return <EmptyState />;}

  const trendData = slaData.monthly_trend || [];

   return (
     <Fragment>
       <div className="row g-4 mb-4">
         <div className="col-md-2">
           <StatCard
             label={__("With SLA", "dashboardng")}
             value={slaData.total_with_sla}
             icon="bolt"
             color="primary"
           />
         </div>
         <div className="col-md-2">
           <StatCard
             label={__("On Time", "dashboardng")}
             value={slaData.on_time}
             icon="check-circle"
             color="success"
           />
         </div>
         <div className="col-md-2">
           <StatCard
             label={__("Late", "dashboardng")}
             value={slaData.late}
             icon="clock"
             color="warning"
           />
         </div>
         <div className="col-md-2">
           <StatCard
             label={__("Overdue", "dashboardng")}
             value={slaData.overdue}
             icon="exclamation-triangle"
             color="danger"
           />
         </div>
         <div className="col-md-4">
           <StatCard
             label={__("SLA Compliance Rate", "dashboardng")}
             value={slaData.compliance_rate + "%"}
             icon="percent"
             color={(slaData.compliance_rate || 0) >= 80
               ? "success"
               : ((slaData.compliance_rate || 0) >= 50
                 ? "warning"
                 : "danger")}
           />
         </div>
       </div>

      {trendData.length > 0 &&
      <ReportCard title={__("Monthly SLA Trend", "dashboardng")}>
        <DataTable
          columns={[
            { key: "label", label: __("Month", "dashboardng") },
            { key: "total", label: __("Total", "dashboardng"), align: "right" as Align },
            {
              key: "on_time",
              label: __("On Time", "dashboardng"),
              align: "right" as Align,
            },
            { key: "late", label: __("Late", "dashboardng"), align: "right" as Align },
            {
              key: "rate",
              label: __("Rate", "dashboardng"),
              align: "right" as Align,
              render: (v: unknown) => {
                const num = v as number;
                return (
                  <span
                    className={`badge bg-${num >= 80
                      ? "success"
                      : (num >= 50
                        ? "warning"
                        : "danger")}`}
                    >{num}%</span>
                );
              },
            },
          ]}
          rows={trendData}
        />
      </ReportCard>
    }
    </Fragment>
  );
}

interface CategoryReportProps {
  period: number;
  rangeParams?: RangeParams;
  getCardSettings: (cardId: string) => CardSettings;
  handleSettingsClick: (cardId: string, chartType: string) => void;
}

function CategoryReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }: CategoryReportProps) {
  const { data, loading, error } = useReportData("/reports/category", { period, ...rangeParams });
  const safeRows: Record<string, unknown>[] = (data as Record<string, unknown>[]) || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("category-share").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "completename", topK, ["resolved_tickets", "avg_resolution_hours"]);
  const chartLabels = topRows.map((row) => (row.completename || row.name) as string);
  const avgResolutionDataset = topRows.map((row) => roundValue((row.avg_resolution_hours as number) || 0, 1));

  const columns = [
    { key: "completename", label: __("Category", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" as Align },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => renderShare(v as number, "secondary"),
    },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right" as Align,
    },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => {
        const num = v as number;
        return (
          <span
            className={`badge bg-${num >= 80
              ? "success"
              : (num >= 50
                ? "warning"
                : "danger")}`}
            >{num}%</span>
        );
      },
    },
    {
      key: "avg_resolution_hours",
      label: __("Avg Time", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => `${v}h`,
    },
  ];

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <ReportCard
          title={__("Category Share", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("category-share", "pie")}
        >
          {total === 0
            ? <EmptyState message={__("No category data available", "dashboardng")} />
            : <PieChart
                data={topRows.map((row) => ({
                  label: (row.completename || row.name) as string,
                  count: (row.total_tickets as number) || 0,
                }))}
              />}
        </ReportCard>
      </div>
      <div className="col-lg-6">
        <ReportCard
          title={__("Avg Resolution Time", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("category-resolution", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No category data available", "dashboardng")} />
            : <BarChart
                labels={chartLabels}
                datasets={[
                  {
                    label: __("Avg Resolution (h)", "dashboardng"),
                    data: avgResolutionDataset,
                    backgroundColor: CHART_COLORS.info,
                  },
                ]}
              />}
        </ReportCard>
      </div>
      <div className="col-12">
        <ReportCard
          title={__("Category Report", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
        >
          <DataTable
            columns={columns}
            rows={rows}
            emptyMessage={__("No category data available", "dashboardng")}
          />
        </ReportCard>
      </div>
    </div>
  );
}

interface GroupReportProps {
  period: number;
  rangeParams?: RangeParams;
  getCardSettings: (cardId: string) => CardSettings;
  handleSettingsClick: (cardId: string, chartType: string) => void;
}

function GroupReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }: GroupReportProps) {
  const { data, loading, error } = useReportData("/reports/group", { period, ...rangeParams });
  const safeRows: Record<string, unknown>[] = (data as Record<string, unknown>[]) || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("group-volume").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "completename", topK, ["resolved_tickets", "open_tickets"]);
  const chartLabels = topRows.map((row) => (row.completename || row.name) as string);

  const columns = [
    { key: "completename", label: __("Group", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" as Align },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => renderShare(v as number, "primary"),
    },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right" as Align,
    },
    { key: "open_tickets", label: __("Open", "dashboardng"), align: "right" as Align },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => {
        const num = v as number;
        return (
          <span
            className={`badge bg-${num >= 80
              ? "success"
              : (num >= 50
                ? "warning"
                : "danger")}`}
            >{num}%</span>
        );
      },
    },
  ];

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <ReportCard
          title={__("Ticket Volume by Group", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("group-volume", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No group data available", "dashboardng")} />
            : <BarChart
                labels={chartLabels}
                datasets={[
                  {
                    label: __("Total", "dashboardng"),
                    data: topRows.map((row) => (row.total_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.primary,
                  },
                ]}
              />}
        </ReportCard>
      </div>
      <div className="col-lg-6">
        <ReportCard
          title={__("Resolution Mix", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("group-resolution", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No group data available", "dashboardng")} />
            : <BarChart
                labels={chartLabels}
                datasets={[
                  {
                    label: __("Resolved", "dashboardng"),
                    data: topRows.map((row) => (row.resolved_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.success,
                  },
                  {
                    label: __("Open", "dashboardng"),
                    data: topRows.map((row) => (row.open_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.warning,
                  },
                ]}
                stacked={true}
              />}
        </ReportCard>
      </div>
      <div className="col-12">
        <ReportCard
          title={__("Group Report", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
        >
          <DataTable
            columns={columns}
            rows={rows}
            emptyMessage={__("No group data available", "dashboardng")}
          />
        </ReportCard>
      </div>
    </div>
  );
}

interface PriorityReportProps {
  period: number;
  rangeParams?: RangeParams;
  getCardSettings: (cardId: string) => CardSettings;
  handleSettingsClick: (cardId: string, chartType: string) => void;
}

function PriorityReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }: PriorityReportProps) {
  const { data, loading, error } = useReportData("/reports/priority", { period, ...rangeParams });
  const safeRows: Record<string, unknown>[] = (data as Record<string, unknown>[]) || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("priority-volume").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "label", topK, ["resolved_tickets"]);
  const chartLabels = topRows.map((row) => row.label as string);

  const columns = [
    { key: "label", label: __("Priority", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" as Align },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => renderShare(v as number, "danger"),
    },
    {
      key: "resolved_tickets",
      label: __("Resolved", "dashboardng"),
      align: "right" as Align,
    },
    {
      key: "resolution_rate",
      label: __("Rate", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => {
        const num = v as number;
        return (
          <span
            className={`badge bg-${num >= 80
              ? "success"
              : (num >= 50
                ? "warning"
                : "danger")}`}
            >{num}%</span>
        );
      },
    },
    {
      key: "avg_resolution_hours",
      label: __("Avg Time", "dashboardng"),
      align: "right" as Align,
      render: (v: unknown) => `${v}h`,
    },
  ];

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <ReportCard
          title={__("Tickets by Priority", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("priority-volume", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No priority data available", "dashboardng")} />
            : <BarChart
                labels={chartLabels}
                datasets={[
                  {
                    label: __("Total", "dashboardng"),
                    data: topRows.map((row) => (row.total_tickets as number) || 0),
                    backgroundColor: CHART_COLORS.danger,
                  },
                ]}
              />}
        </ReportCard>
      </div>
      <div className="col-lg-6">
        <ReportCard
          title={__("Resolution Rate by Priority", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
          onSettingsClick={() => handleSettingsClick("priority-resolution", "bar")}
        >
          {total === 0
            ? <EmptyState message={__("No priority data available", "dashboardng")} />
            : <BarChart
                labels={chartLabels}
                datasets={[
                  {
                    label: __("Resolution Rate", "dashboardng"),
                    data: topRows.map((row) => (row.resolution_rate as number) || 0),
                    backgroundColor: CHART_COLORS.info,
                  },
                ]}
              />}
        </ReportCard>
      </div>
      <div className="col-12">
        <ReportCard
          title={__("Priority Report", "dashboardng")}
          loading={loading}
          error={error}
          onRetry={() => location.reload()}
        >
          <DataTable
            columns={columns}
            rows={rows}
            emptyMessage={__("No priority data available", "dashboardng")}
          />
        </ReportCard>
      </div>
    </div>
  );
}

interface TabItem {
  id: string;
  label: string;
  icon: string;
}

interface CustomRange {
  start: string;
  end: string;
}

function TicketReportsApp() {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState(0);
  const [customRange, setCustomRange] = useState<CustomRange>({ start: '', end: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCard, setSettingsCard] = useState<string | undefined>(undefined);
  const [settingsChartType, setSettingsChartType] = useState("pie");
  const [chartSettings, setChartSettings] = useState<Record<string, CardSettings>>({});

  useEffect(() => {
    const saved = localStorage.getItem('ticketReportsChartSettings');
    if (saved) {
      try {
        setChartSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse chart settings:', error);
      }
    }
  }, []);

  const saveChartSettings = (cardId: string, newSettings: CardSettings) => {
    const updated = { ...chartSettings, [cardId]: { ...chartSettings[cardId], ...newSettings } };
    setChartSettings(updated);
    localStorage.setItem('ticketReportsChartSettings', JSON.stringify(updated));
  };

  const handleSettingsClick = (cardId: string, chartType = "pie") => {
    setSettingsCard(cardId);
    setSettingsChartType(chartType);
    setShowSettings(true);
  };

  const handleSettingsSave = (newSettings: CardSettings) => {
    if (settingsCard) {
      saveChartSettings(settingsCard, newSettings);
    }
    setShowSettings(false);
    setSettingsCard(undefined);
    setSettingsChartType("pie");
  };

  const getCardSettings = (cardId: string): CardSettings => {
    return chartSettings[cardId] || {};
  };

  const tabs: TabItem[] = [
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
    { id: "source", label: __("By Source", "dashboardng"), icon: "fa-share-alt" },
    { id: "monthly", label: __("Monthly Trend", "dashboardng"), icon: "fa-chart-line" },
  ];
  const bulkOptions = tabs.map((tab) => ({ id: tab.id, label: tab.label }));

  const renderContent = () => {
    const rangeParams: RangeParams = period === 8
      ? { start_date: customRange.start || undefined, end_date: customRange.end || undefined }
      : {};

    switch (activeTab) {
      case "overview": {
        return <OverviewReport period={period} rangeParams={rangeParams} getCardSettings={getCardSettings} handleSettingsClick={handleSettingsClick} />;
      }
      case "entity": {
        return <EntityReport
          period={period}
          rangeParams={rangeParams}
          getCardSettings={getCardSettings}
          handleSettingsClick={handleSettingsClick}
        />;
      }
      case "technician": {
        return <TechnicianReport
          period={period}
          rangeParams={rangeParams}
          getCardSettings={getCardSettings}
          handleSettingsClick={handleSettingsClick}
        />;
      }
      case "sla": {
        return <SlaReport period={period} rangeParams={rangeParams} />;
      }
      case "category": {
        return <CategoryReport
          period={period}
          rangeParams={rangeParams}
          getCardSettings={getCardSettings}
          handleSettingsClick={handleSettingsClick}
        />;
      }
      case "group": {
        return <GroupReport
          period={period}
          rangeParams={rangeParams}
          getCardSettings={getCardSettings}
          handleSettingsClick={handleSettingsClick}
        />;
      }
      case "priority": {
        return <PriorityReport
          period={period}
          rangeParams={rangeParams}
          getCardSettings={getCardSettings}
          handleSettingsClick={handleSettingsClick}
        />;
      }
      case "source": {
        return <SourceReport
          period={period}
          rangeParams={rangeParams}
          getCardSettings={getCardSettings}
          handleSettingsClick={handleSettingsClick}
        />;
      }
      case "monthly": {
        return <MonthlyReport period={period} rangeParams={rangeParams} />;
      }
      default: {
        return <EmptyState
          message={__("Select a report type", "dashboardng")}
        />;
      }
    }
  };

  return (
    <div className="dashboardng-reports">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          {__("Ticket Reports", "dashboardng")}
        </h2>
        <div className="d-flex align-items-center gap-3">
          <label className="form-label mb-0 text-muted"
            >{__("Period", "dashboardng")}:</label
          >
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            showCustomRange={true}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
          <ExportDropdown
            reportType={activeTab}
            period={period}
            customRange={customRange}
            bulkOptions={bulkOptions}
          />
        </div>
      </div>

      <ul className="nav nav-tabs mb-4">
        {tabs.map(
          (tab) => (
             <li className="nav-item" key={tab.id}>
               <button
                 className={`nav-link ${activeTab === tab.id ? "active" : ""}`}
                 onClick={() => setActiveTab(tab.id)}
               >
                 <i className={`fas ${tab.icon} me-1`}></i>
                 {tab.label}
               </button>
             </li>
          ),
        )}
      </ul>

       <div className="tab-content">{renderContent()}</div>

       <SettingsModal
         isOpen={showSettings}
          onClose={() => { setShowSettings(false); setSettingsCard(undefined); setSettingsChartType("pie"); }}
          onSave={handleSettingsSave}
          settings={getCardSettings(settingsCard || '')}
          chartType={settingsChartType}
        />
     </div>
  );
}


document.addEventListener("DOMContentLoaded", async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const container = document.getElementById("dashboardng-tickets");
  if (container) {
    render(<TicketReportsApp />, container);
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
  SourceReport,
  MonthlyReport,
  ExportDropdown,
};
