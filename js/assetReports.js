/* global Chart */
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

// Asset type definitions
const ASSET_TYPES = [
  {
    id: "Computer",
    label: __("Computers", "dashboardng"),
    icon: "device-desktop",
    table: "glpi_computers",
  },
  {
    id: "Monitor",
    label: __("Monitors"),
    icon: "device-imac",
    table: "glpi_monitors",
  },
  { id: "Printer", label: __("Printers"), icon: "printer", table: "glpi_printers" },
  {
    id: "NetworkEquipment",
    label: __("Network Equipment"),
    icon: "network",
    table: "glpi_networkequipments",
  },
  { id: "Phone", label: __("Phones"), icon: "phone", table: "glpi_phones" },
  {
    id: "Peripheral",
    label: __("Peripherals"),
    icon: "keyboard",
    table: "glpi_peripherals",
  },
  { id: "Software", label: __("Software"), icon: "apps", table: "glpi_softwares"   },
];

// Asset Type Selector

function AssetTypeSelector({ value, onChange }) {
  return html`
    <div class="d-flex align-items-center gap-2">
        <label class="form-label mb-0 text-muted text-nowrap">
          <i class="fas fa-filter me-1"></i>
          ${__("Asset Type", "dashboardng")}:
        </label>
      <select
        class="form-select form-select-sm"
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
};

// Chart Components

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

        // Process data with Top K grouping
        let labels = data.map((item) => item.label || item.name);
        let values = data.map((item) => item.count || item.value);

        if (topK && topK > 0 && data.length > topK) {
          const sorted = [...data].toSorted((a, b) => (b.count || b.value) - (a.count || a.value));
          const topKItems = sorted.slice(0, topK);
          const others = sorted.slice(topK);
          const othersValue = others.reduce((sum, item) => sum + (item.count || item.value), 0);

          labels = [...topKItems.map(item => item.label || item.name), __("Others", "dashboardng")];
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
    [data, title, horizontal],
  );

  return html`<canvas
    ref=${canvasRef}
    class="chartjs-canvas"
    style="height: 300px;"
   ></canvas>`;
}

// ========================================
// Asset Type Report Component

function AssetTypeReport({ itemtype, period, customRange = {}, onSettingsClick, getCardSettings, cardIdPrefix }) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(undefined);

  const assetType = ASSET_TYPES.find((t) => t.id === itemtype);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const params = { itemtype, period };
      if (period === 8) {
        params.start_date = customRange?.start || undefined;
        params.end_date = customRange?.end || undefined;
      }
      const result = await api.fetch("/reports/asset-by-itemtype", params);
      setData(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [itemtype, period, customRange?.start, customRange?.end]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {return html`<${LoadingSpinner} />`;}
  if (error)
    {return html`<${ErrorAlert} message=${error} onRetry=${loadData} />`;}
  if (!data) {return html`<${EmptyState} />`;}

  return html`
    <!-- Summary Stats -->
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <${StatCard}
          label=${__("Total", "dashboardng") + " " + (assetType?.label || itemtype)}
          value=${data.total || 0}
          icon=${assetType?.icon || "device-unknown"}
          color="primary"
        />
      </div>
      <div class="col-md-3">
        <${StatCard}
          label=${__("In Use", "dashboardng")}
          value=${data.in_use || 0}
          icon="check"
          color="success"
        />
      </div>
      <div class="col-md-3">
        <${StatCard}
          label=${__("In Stock", "dashboardng")}
          value=${data.in_stock || 0}
          icon="archive"
          color="info"
        />
      </div>
      <div class="col-md-3">
        <${StatCard}
          label=${__("With Open Tickets", "dashboardng")}
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
           title=${__("By Manufacturer", "dashboardng")}
           onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-manufacturer`)}
         >
           ${data.by_manufacturer && data.by_manufacturer.length > 0
             ? html`
                 <div class="row">
                   <div class="col-md-6">
                     <${PieChart}
                       data=${data.by_manufacturer}
                       topK=${getCardSettings(`${cardIdPrefix}-manufacturer`).topK || undefined}
                     />
                   </div>
                   <div class="col-md-6">
                     <${DataTable}
                       columns=${[
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
                       rows=${data.by_manufacturer}
                       emptyMessage=${__("No data available", "dashboardng")}
                     />
                   </div>
                 </div>
               `
             : html`<${EmptyState}
                 message=${__("No manufacturer data", "dashboardng")}
               />`}
         <//>
       </div>
       <div class="col-md-6">
         <${ReportCard}
           title=${__("By Status", "dashboardng")}
           onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-status`)}
         >
           ${data.by_status && data.by_status.length > 0
             ? html`
                 <div class="row">
                   <div class="col-md-6">
                     <${PieChart}
                       data=${data.by_status}
                       topK=${getCardSettings(`${cardIdPrefix}-status`).topK || undefined}
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
                       emptyMessage=${__("No data available", "dashboardng")}
                     />
                   </div>
                 </div>
               `
             : html`<${EmptyState}
                 message=${__("No status data", "dashboardng")}
               />`}
         <//>
       </div>
     </div>

     <!-- Charts Row 2: Location & Entity -->
     <div class="row g-4 mb-4">
       <div class="col-md-6">
         <${ReportCard} title=${__("By Location", "dashboardng")}>
           ${data.by_location && data.by_location.length > 0
             ? html`
                 <${BarChart}
                   data=${data.by_location.slice(0, 10)}
                   horizontal=${true}
                 />
               `
             : html`<${EmptyState}
                 message=${__("No location data", "dashboardng")}
               />`}
         <//>
       </div>
       <div class="col-md-6">
         <${ReportCard} title=${__("By Entity", "dashboardng")}>
           ${data.by_entity && data.by_entity.length > 0
             ? html`
                 <${BarChart}
                   data=${data.by_entity.slice(0, 10)}
                   horizontal=${true}
                 />
               `
             : html`<${EmptyState}
                 message=${__("No entity data", "dashboardng")}
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
               title=${__("By Operating System", "dashboardng")}
               onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-os`)}
             >
               <div class="row">
                 <div class="col-md-6">
                   <${PieChart}
                     data=${data.by_os}
                     topK=${getCardSettings(`${cardIdPrefix}-os`).topK || undefined}
                   />
                 </div>

                <div class="col-md-6">
                  <${DataTable}
                    columns=${[
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
                    rows=${data.by_os}
                  />
                </div>
              </div>
            <//>
          </div>
          <div class="col-md-6">
             <${ReportCard}
               title=${__("By Type", "dashboardng")}
               onSettingsClick=${() => onSettingsClick(`${cardIdPrefix}-type`)}
             >
               ${data.by_type && data.by_type.length > 0
                 ? html`
                     <div class="row">
                       <div class="col-md-6">
                         <${PieChart}
                           data=${data.by_type}
                           topK=${getCardSettings(`${cardIdPrefix}-type`).topK || undefined}
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
                `
                : html`<${EmptyState}
                    message=${__("No type data", "dashboardng")}
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
              title=${__("By Category", "dashboardng")}
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
           <${ReportCard} title=${__("By Model", "dashboardng")}>
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
                     { key: "label", label: __("Model", "dashboardng") },
                     {
                       key: "count",
                       label: __("Count", "dashboardng"),
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
           <${ReportCard} title=${__("Recently Added", "dashboardng")}>
             <${DataTable}
               columns=${[
                 {
                   key: "name",
                   label: __("Name", "dashboardng"),
                   render: (v, row) => html`
                     <a
                       href="${window.CFG_GLPI
                         .root_doc}/front/${itemtype.toLowerCase()}.form.php?id=${row.id}"
                       target="_blank"
                     >
                       ${v || __("(unnamed)", "dashboardng")}
                     </a>
                   `,
                 },
                 { key: "serial", label: __("Serial", "dashboardng") },
                 { key: "location", label: __("Location", "dashboardng") },
                 { key: "status", label: __("Status", "dashboardng") },
                 { key: "date_creation", label: __("Created", "dashboardng") },
               ]}
               rows=${data.recent_items}
               emptyMessage=${__("No recent items", "dashboardng")}
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
  const [period, setPeriod] = useState(0);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCard, setSettingsCard] = useState(undefined);
  const [chartSettings, setChartSettings] = useState({});
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
    setSettingsCard(undefined);
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
           ${__("Asset Reports", "dashboardng")}
         </h2>
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <${AssetTypeSelector}
            value=${selectedType}
            onChange=${setSelectedType}
          />
          <label class="form-label mb-0 text-muted text-nowrap">${__("Period", "dashboardng")}:</label>
          <${PeriodSelector}
            value=${period}
            onChange=${setPeriod}
            showCustomRange=${true}
            customRange=${customRange}
            onCustomRangeChange=${setCustomRange}
          />
          <${ExportDropdown}
            reportType="asset-by-itemtype"
            itemtype=${selectedType}
            period=${period}
            customRange=${customRange}
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
             >${__("Showing reports for", "dashboardng")}:</strong
           >
           <span class="ms-1">${assetType?.label || selectedType}</span>
         </div>
       </div>

       <!-- Content -->
        <${AssetTypeReport}
          itemtype=${selectedType}
          period=${period}
          customRange=${customRange}
          onSettingsClick=${handleSettingsClick}
          getCardSettings=${getCardSettings}
          cardIdPrefix=${selectedType}
          key=${selectedType}
        />


       <!-- Settings Modal -->
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

// Initialize

document.addEventListener("DOMContentLoaded", async () => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // required for translation loading (TODO: fix the damn translation loader)
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
