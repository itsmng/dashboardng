/* global Chart */
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

const roundValue = (value, precision = 1) => {
  const factor = 10 ** precision;
  return Math.round((value || 0) * factor) / factor;
};

const addShareMetrics = (rows, valueKey = "total_tickets") => {
  const total = rows.reduce((sum, row) => sum + (row[valueKey] || 0), 0);
  return {
    total,
    rows: rows.map((row) => ({
      ...row,
      share: total > 0 ? roundValue(((row[valueKey] || 0) / total) * 100, 1) : 0,
    })),
  };
};

const buildTopKRows = (rows, valueKey, labelKey, limit = 10, extraKeys = []) => {
  if (!limit || rows.length <= limit) {
    return rows;
  }
  const sorted = [...rows].toSorted((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));
  const topRows = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const restValue = rest.reduce((sum, row) => sum + (row[valueKey] || 0), 0);
  if (restValue <= 0) {
    return topRows;
  }
  const summary = { [labelKey]: __("Others", "dashboardng") };
  [valueKey, ...extraKeys].forEach((key) => {
    summary[key] = rest.reduce((sum, row) => sum + (row[key] || 0), 0);
  });
  return [...topRows, summary];
};

const renderShare = (value, color = "primary") => html`
  <div class="d-flex align-items-center justify-content-end gap-2">
    <div class="progress" style="height: 6px; width: 80px;">
      <div class="progress-bar bg-${color}" style="width: ${value}%;"></div>
    </div>
    <span class="text-muted" style="width: 48px; text-align: right;">
      ${value}%
    </span>
  </div>
 `;


function PieChart({ data, title, topK = undefined }) {
  const canvasRef = useCallback(
    (node) => {
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

        // Process data with Top K grouping
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

        const chart = new window.Chart(ctx, config);
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

function BarChart({ labels, datasets, stacked = false, title }) {
  const canvasRef = useCallback(
    (node) => {
      if (node && labels && labels.length > 0) {
        const ctx = node.getContext("2d");
        const config = {
          type: "bar",
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
                position: "bottom",
                labels: { color: "#6c757d" },
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
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

  return html`<canvas
    ref=${canvasRef}
    class="chartjs-canvas"
    style="height: 260px;"
  ></canvas>`;
}

function LineChart({ labels, datasets, title }) {
  const canvasRef = useCallback(
    (node) => {
      if (node && labels && labels.length > 0) {
        const ctx = node.getContext("2d");
        const config = {
          type: "line",
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
    [labels, datasets, title],
  );

  return html`<canvas
    ref=${canvasRef}
    class="chartjs-canvas"
    style="height: 260px;"
  ></canvas>`;
}

function MonthlyReport({ period, rangeParams = {} }) {
  const { data, loading, error } = useReportData("/reports/monthly", { period, ...rangeParams });
  const rows = data || [];
  const labels = rows.map((row) => row.label);

  return html`
    <div class="row g-4">
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Monthly Ticket Volume", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
        >
          ${rows.length === 0
            ? html`<${EmptyState} message=${__("No monthly data available", "dashboardng")} />`
            : html`
                <${LineChart}
                  labels=${labels}
                  datasets=${[
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
                />
              `}
        <//>
      </div>
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Resolution Rate Trend", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
        >
          ${rows.length === 0
            ? html`<${EmptyState} message=${__("No monthly data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${labels}
                  datasets=${[
                    {
                      label: __("Resolution Rate", "dashboardng"),
                      data: rows.map((row) => row.resolution_rate || 0),
                      backgroundColor: CHART_COLORS.info,
                    },
                  ]}
                />
              `}
        <//>
      </div>
      <div class="col-12">
        <${ReportCard}
          title=${__("Monthly Trend", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
        >
          <${DataTable}
            columns=${[
              { key: "label", label: __("Month", "dashboardng") },
              { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
              { key: "resolved_tickets", label: __("Resolved", "dashboardng"), align: "right" },
              {
                key: "resolution_rate",
                label: __("Rate", "dashboardng"),
                align: "right",
                render: (v) => html`<span class="badge bg-info">${v}%</span>`,
              },
              {
                key: "avg_resolution_hours",
                label: __("Avg Time", "dashboardng"),
                align: "right",
                render: (v) => `${v}h`,
              },
            ]}
            rows=${rows}
            emptyMessage=${__("No monthly data available", "dashboardng")}
          />
        <//>
      </div>
    </div>
  `;
}

function SourceReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }) {
  const { data, loading, error } = useReportData("/reports/source", { period, ...rangeParams });
  const safeRows = data || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("source-share").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "name", topK);

  return html`
    <div class="row g-4">
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Ticket Sources", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("source-share", "pie")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No source data available", "dashboardng")} />`
            : html`
                <${PieChart}
                  data=${topRows.map((row) => ({
                    label: row.name,
                    count: row.total_tickets || 0,
                  }))}
                  topK=${getCardSettings("source-share").topK || undefined}
                />
              `}
        <//>
      </div>
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Source Volume", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("source-volume", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No source data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${topRows.map((row) => row.name)}
                  datasets=${[
                    {
                      label: __("Tickets", "dashboardng"),
                      data: topRows.map((row) => row.total_tickets || 0),
                      backgroundColor: CHART_COLORS.secondary,
                    },
                  ]}
                />
              `}
        <//>
      </div>
      <div class="col-12">
        <${ReportCard}
          title=${__("Source Report", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
        >
          <${DataTable}
            columns=${[
              { key: "name", label: __("Source", "dashboardng") },
              { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
              {
                key: "share",
                label: __("Share", "dashboardng"),
                align: "right",
                render: (v) => renderShare(v, "secondary"),
              },
            ]}
            rows=${rows}
            emptyMessage=${__("No source data available", "dashboardng")}
          />
        <//>
      </div>
    </div>
  `;
}

function OverviewReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }) {
  const { data, loading, error } = useReportData("/reports/overview", { period, ...rangeParams });

  if (loading) {return html`<${LoadingSpinner} />`;}
  if (error)
    {return html`<${ErrorAlert} message=${error} onRetry=${() => location.reload()} />`;}
  if (!data) {return html`<${EmptyState} />`;}

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
          onSettingsClick=${() => handleSettingsClick('overview-by-type', 'pie')}
         >
           <div class="row">
             <div class="col-md-6">
               <${PieChart}
                 data=${data.by_type}
                 topK=${getCardSettings('overview-by-type').topK || undefined}
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
          onSettingsClick=${() => handleSettingsClick('overview-by-status', 'pie')}
         >
           <div class="row">
             <div class="col-md-6">
               <${PieChart}
                 data=${data.by_status}
                 topK=${getCardSettings('overview-by-status').topK || undefined}
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


function EntityReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }) {
  const { data, loading, error } = useReportData("/reports/entity", { period, ...rangeParams });
  const safeRows = data || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("entity-volume").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "completename", topK, ["resolved_tickets", "open_tickets"]);
  const chartLabels = topRows.map((row) => row.completename || row.name);

  const columns = [
    { key: "completename", label: __("Entity", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right",
      render: (v) => renderShare(v, "primary"),
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
            : (v >= 50
              ? "warning"
              : "danger")}"
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
    <div class="row g-4">
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Ticket Volume by Entity", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("entity-volume", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No entity data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${chartLabels}
                  datasets=${[
                    {
                      label: __("Total", "dashboardng"),
                      data: topRows.map((row) => row.total_tickets || 0),
                      backgroundColor: CHART_COLORS.primary,
                    },
                  ]}
                />
              `}
        <//>
      </div>
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Entity Resolution Mix", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("entity-resolution-mix", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No entity data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${chartLabels}
                  datasets=${[
                    {
                      label: __("Resolved", "dashboardng"),
                      data: topRows.map((row) => row.resolved_tickets || 0),
                      backgroundColor: CHART_COLORS.success,
                    },
                    {
                      label: __("Open", "dashboardng"),
                      data: topRows.map((row) => row.open_tickets || 0),
                      backgroundColor: CHART_COLORS.warning,
                    },
                  ]}
                  stacked=${true}
                />
              `}
        <//>
      </div>
      <div class="col-12">
        <${ReportCard}
          title=${__("Entity Report", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
        >
          <${DataTable}
            columns=${columns}
            rows=${rows}
            emptyMessage=${__("No entity data available", "dashboardng")}
          />
        <//>
      </div>
    </div>
  `;
}


function TechnicianReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }) {
  const { data, loading, error } = useReportData("/reports/technician", { period, ...rangeParams });
  const safeRows = data || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("technician-volume").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "name", topK, ["resolved_tickets", "open_tickets"]);
  const chartLabels = topRows.map((row) => row.name);

  const columns = [
    { key: "name", label: __("Technician", "dashboardng") },
    {
      key: "total_tickets",
      label: __("Assigned", "dashboardng"),
      align: "right",
    },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right",
      render: (v) => renderShare(v, "info"),
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
            : (v >= 50
              ? "warning"
              : "danger")}"
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
    <div class="row g-4">
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Tickets by Technician", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("technician-volume", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No technician data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${chartLabels}
                  datasets=${[
                    {
                      label: __("Assigned", "dashboardng"),
                      data: topRows.map((row) => row.total_tickets || 0),
                      backgroundColor: CHART_COLORS.primary,
                    },
                  ]}
                />
              `}
        <//>
      </div>
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Resolution Mix", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("technician-resolution", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No technician data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${chartLabels}
                  datasets=${[
                    {
                      label: __("Resolved", "dashboardng"),
                      data: topRows.map((row) => row.resolved_tickets || 0),
                      backgroundColor: CHART_COLORS.success,
                    },
                    {
                      label: __("Open", "dashboardng"),
                      data: topRows.map((row) => row.open_tickets || 0),
                      backgroundColor: CHART_COLORS.warning,
                    },
                  ]}
                  stacked=${true}
                />
              `}
        <//>
      </div>
      <div class="col-12">
        <${ReportCard}
          title=${__("Technician Performance", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
        >
          <${DataTable}
            columns=${columns}
            rows=${rows}
            emptyMessage=${__("No technician data available", "dashboardng")}
          />
        <//>
      </div>
    </div>
  `;
}


function SlaReport({ period, rangeParams = {} }) {
  const { data, loading, error } = useReportData("/reports/sla", { period, ...rangeParams });

  if (loading) {return html`<${LoadingSpinner} />`;}
  if (error)
    {return html`<${ErrorAlert} message=${error} onRetry=${() => location.reload()} />`;}
  if (!data) {return html`<${EmptyState} />`;}

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
             : (data.compliance_rate >= 50
               ? "warning"
               : "danger")}
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
                    : (v >= 50
                      ? "warning"
                      : "danger")}"
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


function CategoryReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }) {
  const { data, loading, error } = useReportData("/reports/category", { period, ...rangeParams });
  const safeRows = data || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("category-share").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "completename", topK, ["resolved_tickets", "avg_resolution_hours"]);
  const chartLabels = topRows.map((row) => row.completename || row.name);
  const avgResolutionDataset = topRows.map((row) => roundValue(row.avg_resolution_hours || 0, 1));

  const columns = [
    { key: "completename", label: __("Category", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right",
      render: (v) => renderShare(v, "secondary"),
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
            : (v >= 50
              ? "warning"
              : "danger")}"
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
    <div class="row g-4">
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Category Share", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("category-share", "pie")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No category data available", "dashboardng")} />`
            : html`
                <${PieChart}
                  data=${topRows.map((row) => ({
                    label: row.completename || row.name,
                    count: row.total_tickets || 0,
                  }))}
                />
              `}
        <//>
      </div>
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Avg Resolution Time", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("category-resolution", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No category data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${chartLabels}
                  datasets=${[
                    {
                      label: __("Avg Resolution (h)", "dashboardng"),
                      data: avgResolutionDataset,
                      backgroundColor: CHART_COLORS.info,
                    },
                  ]}
                />
              `}
        <//>
      </div>
      <div class="col-12">
        <${ReportCard}
          title=${__("Category Report", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
        >
          <${DataTable}
            columns=${columns}
            rows=${rows}
            emptyMessage=${__("No category data available", "dashboardng")}
          />
        <//>
      </div>
    </div>
  `;
}


function GroupReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }) {
  const { data, loading, error } = useReportData("/reports/group", { period, ...rangeParams });
  const safeRows = data || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("group-volume").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "completename", topK, ["resolved_tickets", "open_tickets"]);
  const chartLabels = topRows.map((row) => row.completename || row.name);

  const columns = [
    { key: "completename", label: __("Group", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right",
      render: (v) => renderShare(v, "primary"),
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
            : (v >= 50
              ? "warning"
              : "danger")}"
          >${v}%</span
        >`,
    },
  ];

  return html`
    <div class="row g-4">
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Ticket Volume by Group", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("group-volume", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No group data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${chartLabels}
                  datasets=${[
                    {
                      label: __("Total", "dashboardng"),
                      data: topRows.map((row) => row.total_tickets || 0),
                      backgroundColor: CHART_COLORS.primary,
                    },
                  ]}
                />
              `}
        <//>
      </div>
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Resolution Mix", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("group-resolution", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No group data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${chartLabels}
                  datasets=${[
                    {
                      label: __("Resolved", "dashboardng"),
                      data: topRows.map((row) => row.resolved_tickets || 0),
                      backgroundColor: CHART_COLORS.success,
                    },
                    {
                      label: __("Open", "dashboardng"),
                      data: topRows.map((row) => row.open_tickets || 0),
                      backgroundColor: CHART_COLORS.warning,
                    },
                  ]}
                  stacked=${true}
                />
              `}
        <//>
      </div>
      <div class="col-12">
        <${ReportCard}
          title=${__("Group Report", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
        >
          <${DataTable}
            columns=${columns}
            rows=${rows}
            emptyMessage=${__("No group data available", "dashboardng")}
          />
        <//>
      </div>
    </div>
  `;
}


function PriorityReport({ period, rangeParams = {}, getCardSettings, handleSettingsClick }) {
  const { data, loading, error } = useReportData("/reports/priority", { period, ...rangeParams });
  const safeRows = data || [];
  const { total, rows } = addShareMetrics(safeRows, "total_tickets");
  const topK = getCardSettings("priority-volume").topK || BAR_TOP_K_DEFAULT;
  const topRows = buildTopKRows(rows, "total_tickets", "label", topK, ["resolved_tickets"]);
  const chartLabels = topRows.map((row) => row.label);

  const columns = [
    { key: "label", label: __("Priority", "dashboardng") },
    { key: "total_tickets", label: __("Total", "dashboardng"), align: "right" },
    {
      key: "share",
      label: __("Share", "dashboardng"),
      align: "right",
      render: (v) => renderShare(v, "danger"),
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
            : (v >= 50
              ? "warning"
              : "danger")}"
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
    <div class="row g-4">
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Tickets by Priority", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("priority-volume", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No priority data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${chartLabels}
                  datasets=${[
                    {
                      label: __("Total", "dashboardng"),
                      data: topRows.map((row) => row.total_tickets || 0),
                      backgroundColor: CHART_COLORS.danger,
                    },
                  ]}
                />
              `}
        <//>
      </div>
      <div class="col-lg-6">
        <${ReportCard}
          title=${__("Resolution Rate by Priority", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
          onSettingsClick=${() => handleSettingsClick("priority-resolution", "bar")}
        >
          ${total === 0
            ? html`<${EmptyState} message=${__("No priority data available", "dashboardng")} />`
            : html`
                <${BarChart}
                  labels=${chartLabels}
                  datasets=${[
                    {
                      label: __("Resolution Rate", "dashboardng"),
                      data: topRows.map((row) => row.resolution_rate || 0),
                      backgroundColor: CHART_COLORS.info,
                    },
                  ]}
                />
              `}
        <//>
      </div>
      <div class="col-12">
        <${ReportCard}
          title=${__("Priority Report", "dashboardng")}
          loading=${loading}
          error=${error}
          onRetry=${() => location.reload()}
        >
          <${DataTable}
            columns=${columns}
            rows=${rows}
            emptyMessage=${__("No priority data available", "dashboardng")}
          />
        <//>
      </div>
    </div>
  `;
}


function TicketReportsApp() {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState(0); // Default: all time
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCard, setSettingsCard] = useState(undefined);
  const [settingsChartType, setSettingsChartType] = useState("pie");
  const [chartSettings, setChartSettings] = useState({});

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

  const saveChartSettings = (cardId, newSettings) => {
    const updated = { ...chartSettings, [cardId]: { ...chartSettings[cardId], ...newSettings } };
    setChartSettings(updated);
    localStorage.setItem('ticketReportsChartSettings', JSON.stringify(updated));
  };

  const handleSettingsClick = (cardId, chartType = "pie") => {
    setSettingsCard(cardId);
    setSettingsChartType(chartType);
    setShowSettings(true);
  };

  const handleSettingsSave = (newSettings) => {
    if (settingsCard) {
      saveChartSettings(settingsCard, newSettings);
    }
    setShowSettings(false);
    setSettingsCard(undefined);
    setSettingsChartType("pie");
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
    { id: "source", label: __("By Source", "dashboardng"), icon: "fa-share-alt" },
    { id: "monthly", label: __("Monthly Trend", "dashboardng"), icon: "fa-chart-line" },
  ];
  const bulkOptions = tabs.map((tab) => ({ id: tab.id, label: tab.label }));

  const renderContent = () => {
    const rangeParams = period === 8
      ? { start_date: customRange.start || undefined, end_date: customRange.end || undefined }
      : {};

    switch (activeTab) {
      case "overview": {
        return html`<${OverviewReport} period=${period} rangeParams=${rangeParams} getCardSettings=${getCardSettings} handleSettingsClick=${handleSettingsClick} />`;
      }
      case "entity": {
        return html`<${EntityReport}
          period=${period}
          rangeParams=${rangeParams}
          getCardSettings=${getCardSettings}
          handleSettingsClick=${handleSettingsClick}
        />`;
      }
      case "technician": {
        return html`<${TechnicianReport}
          period=${period}
          rangeParams=${rangeParams}
          getCardSettings=${getCardSettings}
          handleSettingsClick=${handleSettingsClick}
        />`;
      }
      case "sla": {
        return html`<${SlaReport} period=${period} rangeParams=${rangeParams} />`;
      }
      case "category": {
        return html`<${CategoryReport}
          period=${period}
          rangeParams=${rangeParams}
          getCardSettings=${getCardSettings}
          handleSettingsClick=${handleSettingsClick}
        />`;
      }
      case "group": {
        return html`<${GroupReport}
          period=${period}
          rangeParams=${rangeParams}
          getCardSettings=${getCardSettings}
          handleSettingsClick=${handleSettingsClick}
        />`;
      }
      case "priority": {
        return html`<${PriorityReport}
          period=${period}
          rangeParams=${rangeParams}
          getCardSettings=${getCardSettings}
          handleSettingsClick=${handleSettingsClick}
        />`;
      }
      case "source": {
        return html`<${SourceReport}
          period=${period}
          rangeParams=${rangeParams}
          getCardSettings=${getCardSettings}
          handleSettingsClick=${handleSettingsClick}
        />`;
      }
      case "monthly": {
        return html`<${MonthlyReport} period=${period} rangeParams=${rangeParams} />`;
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
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="mb-0">
          ${__("Ticket Reports", "dashboardng")}
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
            reportType=${activeTab}
            period=${period}
            customRange=${customRange}
            bulkOptions=${bulkOptions}
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
          onClose=${() => { setShowSettings(false); setSettingsCard(undefined); setSettingsChartType("pie"); }}
          onSave=${handleSettingsSave}
          settings=${getCardSettings(settingsCard || '')}
          chartType=${settingsChartType}
        />
     </div>
   `;
}


document.addEventListener("DOMContentLoaded", async () => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // required for translation loading (TODO: fix the damn translation loader)
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
  SourceReport,
  MonthlyReport,
  ExportDropdown,
};
