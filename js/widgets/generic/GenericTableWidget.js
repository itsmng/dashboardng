import { html, useState, useEffect } from "../../lib/preact.js";
import { api, CONFIG } from "../../lib/config.js";
import { usePeriod } from "../../context/PeriodContext.js";
import { useRefresh } from "../../lib/hooks/useRefresh.js";

/**
 * Generic Table Widget - Renders data tables based on config JSON
 * Supports sorting, pagination, and links to GLPI items
 *
 * @component
 * @param {Object} props
 * @param {WidgetConfig} props.config - Widget configuration object
 * @param {string|number} props.widgetId - Unique widget identifier
 * @returns {import('preact').VNode} Rendered table widget
 */
export const GenericTableWidget = ({ config, widgetId }) => {
  const { period } = usePeriod();
  const { refreshSignal } = useRefresh();

  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = config.pageSize || 10;

  // Fetch data based on config
  const fetchData = async () => {
    if (!config?.itemtype) {
      setError("No itemtype configured");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const effectiveSortField = sortField || config.orderBy?.field;
      const effectiveSortDirection = sortField
        ? sortDirection
        : config.orderBy?.direction || "DESC";
      const processedFilters = processFilters(config.filters || [], period);

      // Extract date range from filters for time-series gap filling
      const dateRange = extractDateRange(processedFilters, config.groupBy);

      const queryConfig = {
        itemtype: config.itemtype,
        filters: processedFilters,
        group_by: config.groupBy ? [config.groupBy] : null,
        aggregation: config.groupBy
          ? config.aggregation || { function: "COUNT", field: null }
          : null,
        order_by: effectiveSortField
          ? { field: effectiveSortField, direction: effectiveSortDirection }
          : null,
        output_fields:
          config.outputFields || config.columns?.map((col) => col.field),
        limit: config.limit || 100,
        date_range: dateRange,
      };

      const result = await api.post("/query", queryConfig);

      if (result.success) {
        setData(result.data || []);
        setColumns(result.columns || []);
        setTotalCount(result.total || result.data?.length || 0);
      } else {
        setError(result.error || "Query failed");
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // Extract date range from filters when groupBy has an interval
  const extractDateRange = (filters, groupBy) => {
    // Only compute date range if groupBy specifies an interval
    if (!groupBy || typeof groupBy !== "object" || !groupBy.interval) {
      return null;
    }

    const groupField = groupBy.field;
    let startDate = null;
    let endDate = null;

    // Look through filters for date boundaries on the grouped field
    for (const filter of filters) {
      if (filter.field !== groupField) continue;

      const searchType = filter.searchtype || filter.operator;
      const value = filter.value;

      if (!value) continue;

      // Parse the date value
      const dateValue = value.split(" ")[0]; // Take just the date part if datetime

      if (
        searchType === "morethan" ||
        searchType === "greater_or_equal" ||
        searchType === "greater_than"
      ) {
        if (!startDate || dateValue > startDate) {
          startDate = dateValue;
        }
      } else if (
        searchType === "lessthan" ||
        searchType === "less_or_equal" ||
        searchType === "less_than"
      ) {
        if (!endDate || dateValue < endDate) {
          endDate = dateValue;
        }
      }
    }

    // Default end date to today if not specified
    if (startDate && !endDate) {
      endDate = new Date().toISOString().split("T")[0];
    }

    if (startDate && endDate) {
      return {
        start: startDate,
        end: endDate,
        interval: groupBy.interval,
        field: groupField,
      };
    }

    return null;
  };

  // Process dynamic filter values
  const processFilters = (filters, period) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const thisYear = `${now.getFullYear()}-01-01`;
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return filters.map((filter) => {
      let value = filter.value;

      if (typeof value === "string") {
        value = value
          .replace("$$NOW$$", now.toISOString())
          .replace("$$TODAY$$", today)
          .replace("$$YESTERDAY$$", yesterday)
          .replace("$$TODAY-1DAY$$", yesterday)
          .replace("$$TODAY-7DAY$$", lastWeek)
          .replace("$$TODAY-30DAY$$", thirtyDaysAgo)
          .replace("$$LASTWEEK$$", lastWeek)
          .replace("$$THISMONTH$$", thisMonth)
          .replace("$$THISYEAR$$", thisYear)
          .replace(
            "$$MYSELF$$",
            String(window.DASHBOARDNG_CONFIG?.userId || 0),
          );
      }

      return { ...filter, value };
    });
  };

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [config, period, refreshSignal, sortField, sortDirection]);

  // Auto-refresh
  useEffect(() => {
    if (!config?.refreshInterval || config.refreshInterval <= 0) return;

    const interval = setInterval(fetchData, config.refreshInterval);
    return () => clearInterval(interval);
  }, [config?.refreshInterval]);

  // Handle column sort
  const handleSort = (columnId) => {
    if (sortField === columnId) {
      setSortDirection(sortDirection === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(columnId);
      setSortDirection("DESC");
    }
  };

  // Get paginated data
  const paginatedData = data.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalPages = Math.ceil(data.length / pageSize);

  // Generate item link
  const getItemLink = (row) => {
    if (!config.itemtype || !row.id) return null;
    return `${window.CFG_GLPI.root_doc}/front/${config.itemtype.toLowerCase()}.form.php?id=${row.id}`;
  };

  // Helper function to decode HTML entities (e.g., &nbsp; -> non-breaking space)
  const decodeHtmlEntities = (text) => {
    const textArea = document.createElement("textarea");
    textArea.innerHTML = text;
    return textArea.value;
  };

  // Format cell value
  const formatCell = (value, column) => {
    if (value === null || value === undefined) return "-";
    if (value === "-") return "-";

    // Handle dates
    if (column?.datatype === "datetime" || column?.datatype === "date") {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }

    // Handle numbers
    if (typeof value === "number") {
      return value.toLocaleString();
    }

    const strValue = String(value);

    // Check if value contains HTML tags (not just entities)
    if (strValue.includes("<") && strValue.includes(">")) {
      // Decode HTML entities first, then render as HTML
      const decoded = decodeHtmlEntities(strValue);
      return html`<span dangerouslySetInnerHTML=${{ __html: decoded }} />`;
    }

    // For plain text with HTML entities, just decode them
    if (strValue.includes("&")) {
      return decodeHtmlEntities(strValue);
    }

    return strValue;
  };

  if (loading && data.length === 0) {
    return html`
      <div
        class="generic-table-widget loading h-100 d-flex align-items-center justify-content-center"
      >
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden"
            >${__("Loading...", "dashboardng")}</span
          >
        </div>
      </div>
    `;
  }

  if (error) {
    return html`
      <div
        class="generic-table-widget error h-100 d-flex flex-column align-items-center justify-content-center text-danger p-3"
      >
        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
        <div class="small text-center">${error}</div>
      </div>
    `;
  }

  if (data.length === 0) {
    return html`
      <div
        class="generic-table-widget empty h-100 d-flex flex-column align-items-center justify-content-center text-muted"
      >
        <i class="fas fa-table fa-2x mb-2"></i>
        <div>${__("No data available", "dashboardng")}</div>
      </div>
    `;
  }

  // Derive columns from data if not provided
  const effectiveColumns =
    columns.length > 0
      ? columns
      : Object.keys(data[0] || {}).map((key) => ({ id: key, name: key }));

  // Extract the itemtype from row keys (e.g., "Ticket_2" -> "Ticket")
  // This is needed because GLPI Search returns keys like "Ticket_2", "Ticket_12", etc.
  const getItemtypeFromRow = (row) => {
    const firstKey = Object.keys(row)[0];
    if (firstKey && firstKey.includes("_")) {
      return firstKey.split("_")[0];
    }
    return config.itemtype || "";
  };

  const itemtype = getItemtypeFromRow(data[0] || {});

  // Helper function to get value from row by field ID
  // GLPI Search returns keys like "Ticket_2", but columns have id as just "2"
  const getRowValue = (row, fieldId) => {
    // First try the direct field ID (for aggregated queries)
    if (row[fieldId] !== undefined) {
      return row[fieldId];
    }
    // Try the GLPI Search format (itemtype_fieldId)
    const glpiKey = `${itemtype}_${fieldId}`;
    if (row[glpiKey] !== undefined) {
      return row[glpiKey];
    }
    // Try group_ prefix (for aggregated queries)
    const groupKey = `group_${fieldId}`;
    if (row[groupKey] !== undefined) {
      return row[groupKey];
    }
    return "-";
  };

  return html`
    <div class="generic-table-widget h-100 d-flex flex-column overflow-hidden">
      ${config.title &&
      html`
        <div class="widget-title px-3 pt-2 pb-1 border-bottom">
          <strong>${config.title}</strong>
          <span class="badge bg-secondary ms-2">${totalCount}</span>
        </div>
      `}

      <div class="table-responsive flex-grow-1" style="overflow-y: auto;">
        <table class="table table-sm table-hover mb-0">
          <thead class="sticky-top bg-light">
            <tr>
              ${effectiveColumns.map(
                (col) => html`
                  <th
                    key=${col.id}
                    class="cursor-pointer user-select-none"
                    onClick=${() => handleSort(col.id)}
                  >
                    ${col.name}
                    ${sortField === col.id &&
                    html`
                      <i
                        class="fas fa-sort-${sortDirection === "ASC"
                          ? "up"
                          : "down"} ms-1 text-primary"
                      ></i>
                    `}
                  </th>
                `,
              )}
            </tr>
          </thead>
          <tbody>
            ${paginatedData.map((row, rowIndex) => {
              const link = getItemLink(row);
              return html`
                <tr key=${rowIndex}>
                  ${effectiveColumns.map((col, colIndex) => {
                    const value = getRowValue(row, col.id);
                    return html`
                      <td key=${col.id}>
                        ${colIndex === 0 && link
                          ? html`<a href=${link} target="_blank"
                              >${formatCell(value, col)}</a
                            >`
                          : formatCell(value, col)}
                      </td>
                    `;
                  })}
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>

      ${totalPages > 1 &&
      html`
        <div
          class="table-pagination d-flex justify-content-between align-items-center px-3 py-2 border-top bg-light"
        >
          <small class="text-muted">
            ${__("Showing", "dashboardng")}
            ${(currentPage - 1) * pageSize + 1}-${Math.min(
              currentPage * pageSize,
              data.length,
            )}
            ${__("of", "dashboardng")} ${data.length}
          </small>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
                <button
                  class="page-link"
                  onClick=${() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
              </li>
              ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return html`
                  <li
                    class="page-item ${currentPage === pageNum ? "active" : ""}"
                    key=${pageNum}
                  >
                    <button
                      class="page-link"
                      onClick=${() => setCurrentPage(pageNum)}
                    >
                      ${pageNum}
                    </button>
                  </li>
                `;
              })}
              <li
                class="page-item ${currentPage === totalPages
                  ? "disabled"
                  : ""}"
              >
                <button
                  class="page-link"
                  onClick=${() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      `}
      ${loading &&
      html`
        <div
          class="loading-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
        >
          <div
            class="spinner-border spinner-border-sm text-primary"
            role="status"
          ></div>
        </div>
      `}
    </div>
  `;
};

export default GenericTableWidget;

// ========================================
// Type Definitions
// ========================================

/**
 * @typedef {Object} TableColumn
 * @property {string|number} id - Column identifier
 * @property {string} name - Display name for column
 * @property {string} [datatype] - Data type ('string', 'number', 'date', 'datetime')
 */
