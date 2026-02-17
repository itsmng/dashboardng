/* global Chart */
/**
 * DashboardNG Asset Reports Module
 *
 * Preact-based asset report viewer with Chart.js charts
 * Users select an itemtype from a dropdown to see reports for that asset type
 * @module assetReports
 */

import type { ChartConfiguration } from 'chart.js';

import {
  h,
  render,
  Fragment,
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

// Configuration & API

interface AssetType {
  id: string;
  label: string;
  icon: string;
  table: string;
}

interface ChartDataItem {
  label?: string;
  name?: string;
  count?: number;
  value?: number;
  [key: string]: unknown;
}

interface RecentItem {
  id: number;
  name: string;
  serial: string;
  location: string;
  status: string;
  date_creation: string;
  [key: string]: unknown;
}

interface AssetReportData {
  total?: number;
  in_use?: number;
  in_stock?: number;
  with_tickets?: number;
  by_manufacturer?: ChartDataItem[];
  by_status?: ChartDataItem[];
  by_location?: ChartDataItem[];
  by_entity?: ChartDataItem[];
  by_os?: ChartDataItem[];
  by_type?: ChartDataItem[];
  by_category?: ChartDataItem[];
  by_model?: ChartDataItem[];
  recent_items?: RecentItem[];
}

interface CustomRange {
  start: string;
  end: string;
}

interface ChartSettings {
  topK?: number;
  [key: string]: unknown;
}

// Asset type definitions
const ASSET_TYPES: AssetType[] = [
  {
    id: "Computer",
    label: __("Computers", "dashboardng"),
    icon: "device_desktop",
    table: "glpi_computers",
  },
  {
    id: "Monitor",
    label: __("Monitors", "dashboardng"),
    icon: "device_imac",
    table: "glpi_monitors",
  },
  { id: "Printer", label: __("Printers", "dashboardng"), icon: "printer", table: "glpi_printers" },
  {
    id: "NetworkEquipment",
    label: __("Network Equipment", "dashboardng"),
    icon: "network",
    table: "glpi_networkequipments",
  },
  { id: "Phone", label: __("Phones", "dashboardng"), icon: "phone", table: "glpi_phones" },
  {
    id: "Peripheral",
    label: __("Peripherals", "dashboardng"),
    icon: "keyboard",
    table: "glpi_peripherals",
  },
  { id: "Software", label: __("Software", "dashboardng"), icon: "apps", table: "glpi_softwares"   },
];

// Asset Type Selector

interface AssetTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function AssetTypeSelector({ value, onChange }: AssetTypeSelectorProps) {
  return (
    <div className="d-flex align-items-center gap-2">
        <label className="form-label mb-0 text-muted text-nowrap">
          <i className="fas fa-filter me-1"></i>
          {__("Asset Type", "dashboardng")}:
        </label>
      <select
        className="form-select form-select-sm"
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        style={{ minWidth: "220px" }}
      >
        {ASSET_TYPES.map(
          (type) => <option value={type.id}>{type.label}</option>
        )}
      </select>
    </div>
  );
};

// Chart Components

interface PieChartProps {
  data: ChartDataItem[];
  title?: string;
  topK?: number;
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

        let labels = data.map((item) => item.label || item.name);
        let values = data.map((item) => item.count || item.value);

        if (topK && topK > 0 && data.length > topK) {
          const sorted = [...data].toSorted((a, b) => (b.count || b.value || 0) - (a.count || a.value || 0));
          const topKItems = sorted.slice(0, topK);
          const others = sorted.slice(topK);
          const othersValue = others.reduce((sum, item) => sum + (item.count || item.value || 0), 0);

          labels = [...topKItems.map(item => item.label || item.name || ""), __("Others", "dashboardng")] as string[];
          values = [...topKItems.map(item => item.count || item.value || 0), othersValue];
        }

        const config: ChartConfiguration = {
          type: "pie",
          data: {
            labels: labels as string[],
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

  return <canvas
    ref={canvasRef}
    className="chartjs-canvas"
    style={{ height: "280px" }}
  ></canvas>;
}

interface BarChartProps {
  data: ChartDataItem[];
  title?: string;
  horizontal?: boolean;
}

function BarChart({ data, title, horizontal = false }: BarChartProps) {
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
    [data, title, horizontal],
  );

  return <canvas
    ref={canvasRef}
    className="chartjs-canvas"
    style={{ height: "300px" }}
   ></canvas>;
}

// ========================================
// Asset Type Report Component

interface AssetTypeReportProps {
  itemtype: string;
  period: number;
  customRange?: CustomRange;
  onSettingsClick: (cardId: string) => void;
  getCardSettings: (cardId: string) => ChartSettings;
  cardIdPrefix: string;
}

function AssetTypeReport({ itemtype, period, customRange = { start: '', end: '' }, onSettingsClick, getCardSettings, cardIdPrefix }: AssetTypeReportProps) {
  const [data, setData] = useState<AssetReportData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const assetType = ASSET_TYPES.find((t) => t.id === itemtype);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const params: Record<string, unknown> = { itemtype, period };
      if (period === 8) {
        params.start_date = customRange?.start || undefined;
        params.end_date = customRange?.end || undefined;
      }
      const result = await api.fetch("/reports/asset-by-itemtype", params);
      setData(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [itemtype, period, customRange?.start, customRange?.end]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {return <LoadingSpinner />;}
  if (error)
    {return <ErrorAlert message={error} onRetry={loadData} />;}
  if (!data) {return <EmptyState />;}

  return (
    <Fragment>
      {/* Summary Stats */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <StatCard
            label={__("Total", "dashboardng") + " " + (assetType?.label || itemtype)}
            value={data.total || 0}
            icon={assetType?.icon || "device-unknown"}
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            label={__("In Use", "dashboardng")}
            value={data.in_use || 0}
            icon="check"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            label={__("In Stock", "dashboardng")}
            value={data.in_stock || 0}
            icon="archive"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            label={__("With Open Tickets", "dashboardng")}
            value={data.with_tickets || 0}
            icon="ticket"
            color="warning"
          />
        </div>
      </div>

       {/* Charts Row 1: Manufacturer & Status */}
       <div className="row g-4 mb-4">
         <div className="col-md-6">
           <ReportCard
             title={__("By Manufacturer", "dashboardng")}
             onSettingsClick={() => onSettingsClick(`${cardIdPrefix}-manufacturer`)}
           >
             {data.by_manufacturer && data.by_manufacturer.length > 0
               ? (
                   <div className="row">
                     <div className="col-md-6">
                       <PieChart
                         data={data.by_manufacturer}
                         topK={getCardSettings(`${cardIdPrefix}-manufacturer`).topK || undefined}
                       />
                     </div>
                     <div className="col-md-6">
                       <DataTable
                         columns={[
                           {
                             key: "label",
                             label: __("Manufacturer", "dashboardng"),
                           },
                           {
                             key: "count",
                             label: __("Count", "dashboardng"),
                             align: "right",
                           },
                         ]}
                         rows={data.by_manufacturer}
                         emptyMessage={__("No data available", "dashboardng")}
                       />
                     </div>
                   </div>
                 )
               : <EmptyState
                   message={__("No manufacturer data", "dashboardng")}
                 />}
           </ReportCard>
         </div>
         <div className="col-md-6">
           <ReportCard
             title={__("By Status", "dashboardng")}
             onSettingsClick={() => onSettingsClick(`${cardIdPrefix}-status`)}
           >
             {data.by_status && data.by_status.length > 0
               ? (
                   <div className="row">
                     <div className="col-md-6">
                       <PieChart
                         data={data.by_status}
                         topK={getCardSettings(`${cardIdPrefix}-status`).topK || undefined}
                       />
                     </div>
                     <div className="col-md-6">
                       <DataTable
                         columns={[
                           { key: "label", label: __("Status", "dashboardng") },
                           {
                             key: "count",
                             label: __("Count", "dashboardng"),
                             align: "right",
                           },
                         ]}
                         rows={data.by_status}
                         emptyMessage={__("No data available", "dashboardng")}
                       />
                     </div>
                   </div>
                 )
               : <EmptyState
                   message={__("No status data", "dashboardng")}
                 />}
           </ReportCard>
         </div>
       </div>

       {/* Charts Row 2: Location & Entity */}
       <div className="row g-4 mb-4">
         <div className="col-md-6">
           <ReportCard title={__("By Location", "dashboardng")}>
             {data.by_location && data.by_location.length > 0
               ? (
                   <BarChart
                     data={data.by_location.slice(0, 10)}
                     horizontal={true}
                   />
                 )
               : <EmptyState
                   message={__("No location data", "dashboardng")}
                 />}
           </ReportCard>
         </div>
         <div className="col-md-6">
           <ReportCard title={__("By Entity", "dashboardng")}>
             {data.by_entity && data.by_entity.length > 0
               ? (
                   <BarChart
                     data={data.by_entity.slice(0, 10)}
                     horizontal={true}
                   />
                 )
               : <EmptyState
                   message={__("No entity data", "dashboardng")}
                 />}
           </ReportCard>
         </div>
       </div>

       {/* Itemtype-specific charts */}
       {itemtype === "Computer" &&
       data.by_os &&
       data.by_os.length > 0 &&
          <div className="row g-4 mb-4">
            <div className="col-md-6">
                <ReportCard
                 title={__("By Operating System", "dashboardng")}
                 onSettingsClick={() => onSettingsClick(`${cardIdPrefix}-os`)}
               >
                 <div className="row">
                   <div className="col-md-6">
                     <PieChart
                       data={data.by_os}
                       topK={getCardSettings(`${cardIdPrefix}-os`).topK || undefined}
                     />
                   </div>

                  <div className="col-md-6">
                    <DataTable
                      columns={[
                        {
                          key: "label",
                          label: __("Operating System", "dashboardng"),
                        },
                        {
                          key: "count",
                          label: __("Count", "dashboardng"),
                          align: "right",
                        },
                      ]}
                      rows={data.by_os}
                    />
                  </div>
                </div>
              </ReportCard>
            </div>
            <div className="col-md-6">
               <ReportCard
                 title={__("By Type", "dashboardng")}
                 onSettingsClick={() => onSettingsClick(`${cardIdPrefix}-type`)}
               >
                 {data.by_type && data.by_type.length > 0
                   ? (
                       <div className="row">
                         <div className="col-md-6">
                           <PieChart
                             data={data.by_type}
                             topK={getCardSettings(`${cardIdPrefix}-type`).topK || undefined}
                           />
                         </div>

                        <div className="col-md-6">
                          <DataTable
                            columns={[
                              { key: "label", label: __("Type", "dashboardng") },
                              {
                                key: "count",
                                label: __("Count", "dashboardng"),
                                align: "right",
                              },
                            ]}
                            rows={data.by_type}
                          />
                        </div>
                      </div>
                  )
                  : <EmptyState
                      message={__("No type data", "dashboardng")}
                    />}
              </ReportCard>
            </div>
         </div>
      }
      {itemtype === "Software" &&
      data.by_category &&
      data.by_category.length > 0 &&
         <div className="row g-4 mb-4">
            <div className="col-12">
              <ReportCard
                title={__("By Category", "dashboardng")}
                onSettingsClick={() => onSettingsClick(`${cardIdPrefix}-category`)}
              >
                <div className="row">
                  <div className="col-md-6">
                    <PieChart
                      data={data.by_category}
                      topK={getCardSettings(`${cardIdPrefix}-category`).topK || undefined}
                    />
                  </div>
                  <div className="col-md-6">
                    <DataTable
                      columns={[
                        {
                          key: "label",
                          label: __("Category", "dashboardng"),
                        },
                        {
                          key: "count",
                          label: __("Count", "dashboardng"),
                          align: "right",
                        },
                      ]}
                      rows={data.by_category}
                    />
                  </div>
                </div>
              </ReportCard>
            </div>
         </div>
     }

      {/* Model breakdown (for hardware types) */}
      {data.by_model &&
      data.by_model.length > 0 &&
         <div className="row g-4 mb-4">
           <div className="col-12">
             <ReportCard title={__("By Model", "dashboardng")}>
               <div className="row">
                 <div className="col-md-8">
                   <BarChart
                     data={data.by_model.slice(0, 15)}
                     horizontal={true}
                   />
                 </div>
                 <div className="col-md-4">
                   <DataTable
                     columns={[
                       { key: "label", label: __("Model", "dashboardng") },
                       {
                         key: "count",
                         label: __("Count", "dashboardng"),
                         align: "right",
                       },
                     ]}
                     rows={data.by_model}
                   />
                 </div>
               </div>
             </ReportCard>
           </div>
         </div>
     }

      {/* Recent items list */}
      {data.recent_items &&
      data.recent_items.length > 0 &&
         <div className="row g-4">
           <div className="col-12">
             <ReportCard title={__("Recently Added", "dashboardng")}>
               <DataTable
                 columns={[
                   {
                     key: "name",
                     label: __("Name", "dashboardng"),
                     render: (v: string, row: RecentItem) => (
                       <a
                         href={`${window.CFG_GLPI
                           .root_doc}/front/${itemtype.toLowerCase()}.form.php?id=${row.id}`}
                         target="_blank"
                       >
                         {v || __("(unnamed)", "dashboardng")}
                       </a>
                     ),
                   },
                   { key: "serial", label: __("Serial", "dashboardng") },
                   { key: "location", label: __("Location", "dashboardng") },
                   { key: "status", label: __("Status", "dashboardng") },
                   { key: "date_creation", label: __("Created", "dashboardng") },
                 ]}
                 rows={data.recent_items}
                 emptyMessage={__("No recent items", "dashboardng")}
               />
             </ReportCard>
           </div>
         </div>
     }
     </Fragment>
  );
}

// Main Asset Reports App

function AssetReportsApp() {
  const [selectedType, setSelectedType] = useState("Computer");
  const [period, setPeriod] = useState(0);
  const [customRange, setCustomRange] = useState<CustomRange>({ start: '', end: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCard, setSettingsCard] = useState<string | undefined>(undefined);
  const [chartSettings, setChartSettings] = useState<Record<string, ChartSettings>>({});
  const assetType = ASSET_TYPES.find((t) => t.id === selectedType);

  // Load chart settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('assetReportsChartSettings');
    if (saved) {
      try {
        setChartSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse chart settings:', error);
      }
    }
  }, []);

  // Save chart settings to localStorage
  const saveChartSettings = (cardId: string, newSettings: ChartSettings) => {
    const updated = { ...chartSettings, [cardId]: { ...chartSettings[cardId], ...newSettings } };
    setChartSettings(updated);
    localStorage.setItem('assetReportsChartSettings', JSON.stringify(updated));
  };

  const handleSettingsClick = (cardId: string) => {
    setSettingsCard(cardId);
    setShowSettings(true);
  };

  const handleSettingsSave = (newSettings: ChartSettings) => {
    if (settingsCard) {
      saveChartSettings(settingsCard, newSettings);
    }
    setShowSettings(false);
    setSettingsCard(undefined);
  };

  const getCardSettings = (cardId: string): ChartSettings => {
    return chartSettings[cardId] || {};
  };

  return (
    <div className="dashboardng-reports">
      {/* Header */}
       <div
         className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3"
       >
        <h2 className="mb-0">
            {__("Asset Reports", "dashboardng")}
          </h2>
         <div className="d-flex align-items-center gap-3 flex-wrap">
           <AssetTypeSelector
             value={selectedType}
             onChange={setSelectedType}
           />
           <label className="form-label mb-0 text-muted text-nowrap">{__("Period", "dashboardng")}:</label>
           <PeriodSelector
             value={period}
             onChange={setPeriod}
             showCustomRange={true}
             customRange={customRange}
             onCustomRangeChange={setCustomRange}
           />
           <ExportDropdown
             reportType="asset-by-itemtype"
             itemtype={selectedType}
             period={period}
             customRange={customRange}
           />
         </div>
       </div>

       {/* Selected type indicator */}
        <div className="alert alert-light d-flex align-items-center mb-4">
          <i
            className={`ti ti-${assetType?.icon || "device-unknown"} me-2`}
            style={{ fontSize: "1.5rem" }}
          ></i>
          <div>
            <strong
              >{__("Showing reports for", "dashboardng")}:</strong
            >
            <span className="ms-1">{assetType?.label || selectedType}</span>
          </div>
        </div>

         {/* Content */}
          <AssetTypeReport
            itemtype={selectedType}
            period={period}
            customRange={customRange}
            onSettingsClick={handleSettingsClick}
            getCardSettings={getCardSettings}
            cardIdPrefix={selectedType}
          />


        {/* Settings Modal */}
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

// Initialize

document.addEventListener("DOMContentLoaded", async () => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // required for translation loading (TODO: fix the damn translation loader)
  const container = document.getElementById("dashboardng-assets");
  if (container) {
    render(<AssetReportsApp />, container);
  }
});

// Export for potential external use
window.DashboardNGAssetReports = {
  AssetReportsApp,
  AssetTypeReport,
  ExportDropdown,
  ASSET_TYPES,
};
