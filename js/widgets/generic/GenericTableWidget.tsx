import { h, useState, useEffect } from "../../lib/preact.js";
import { api } from "../../lib/config.js";
import { extractDateRange, processFilters } from "../../lib/utils.js";
import { usePeriod } from "../../context/PeriodContext.js";
import { useRefresh } from "../../lib/hooks/useRefresh.js";
import { __ } from "../../lib/i18n.js";

interface TableColumn {
    id: string | number;
    name: string;
    datatype?: string;
}

interface WidgetConfig {
    itemtype: string;
    title?: string;
    filters?: any[];
    aggregation?: any;
    groupBy?: any;
    orderBy?: any;
    outputFields?: string[];
    limit?: number;
    refreshInterval?: number;
    pageSize?: number;
}

interface GenericTableWidgetProps {
    config: WidgetConfig;
    widgetId: string | number;
}

/**
 * Generic Table Widget - Renders data tables based on config JSON
 * Supports sorting, pagination, and links to GLPI items
 *
 * @component
 * @param {GenericTableWidgetProps} props
 * @returns {import('preact').VNode} Rendered table widget
 */
export const GenericTableWidget = ({ config, widgetId: _widgetId }: GenericTableWidgetProps) => {
  const { period } = usePeriod();
  const { refreshSignal } = useRefresh();

  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [sortField, setSortField] = useState<string | number | undefined>(undefined);
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
    setError(undefined);

    try {
      const effectiveSortField = sortField || config.orderBy?.field;
      const effectiveSortDirection = sortField
        ? sortDirection
        : config.orderBy?.direction || "DESC";
      const processedFilters = processFilters(config.filters || [], period);

      // Extract date range from filters for time-series gap filling
      const dateRange = extractDateRange(processedFilters, config.groupBy);

      const queryConfig: any = {
        itemtype: config.itemtype,
        filters: processedFilters,
        group_by: config.groupBy ? [config.groupBy] : undefined,
        aggregation: config.groupBy
          ? config.aggregation || { function: "COUNT", field: undefined }
          : undefined,
        order_by: effectiveSortField
          ? { field: effectiveSortField, direction: effectiveSortDirection }
          : undefined,
        output_fields: config.outputFields,
        limit: config.limit || 100,
        date_range: dateRange,
      };

      const result = await api.post("/query", queryConfig);

      if (result.success) {
        setData(result.data as any[] || []);
        setColumns((result as any).columns || []);
        setTotalCount((result as any).total || (result.data as any[])?.length || 0);
      } else {
        setError(result.error || "Query failed");
      }
    } catch (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [config, period, refreshSignal, sortField, sortDirection]);

  // Auto-refresh
  useEffect(() => {
    if (!config?.refreshInterval || config.refreshInterval <= 0) {return;}

    const interval = setInterval(fetchData, config.refreshInterval);
    return () => clearInterval(interval);
  }, [config?.refreshInterval]);

  // Handle column sort
  const handleSort = (columnId: string | number) => {
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
  const getItemLink = (row: any): string | null => {
    if (!config.itemtype || !row.id) {return null;}
    return `${(window as any).CFG_GLPI.root_doc}/front/${config.itemtype.toLowerCase()}.form.php?id=${row.id}`;
  };

  // Helper function to decode HTML entities (e.g., &nbsp; -> non-breaking space)
  const decodeHtmlEntities = (text: string): string => {
    const textArea = document.createElement("textarea");
    textArea.innerHTML = text;
    return textArea.value;
  };

  // Format cell value
  const formatCell = (value: any, column: TableColumn | undefined): string => {
    if (value === null || value === undefined) {return "-";}
    if (value === "-") {return "-";}

    // Handle dates
    if (column?.datatype === "datetime" || column?.datatype === "date") {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    }

    // Handle numbers
    if (typeof value === "number") {
      return value.toLocaleString();
    }

    let strValue = String(value);

    // Decode HTML entities to prevent rendering issues
    if (strValue.includes("&")) {
      strValue = decodeHtmlEntities(strValue);
    }

    return strValue;
  };

  if (loading && data.length === 0) {
    return (
      <div className="generic-table-widget loading h-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{__("Loading...", "dashboardng")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="generic-table-widget error h-100 d-flex flex-column align-items-center justify-content-center text-danger p-3">
        <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
        <div className="small text-center">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="generic-table-widget empty h-100 d-flex flex-column align-items-center justify-content-center text-muted">
        <i className="fas fa-table fa-2x mb-2"></i>
        <div>{__("No data available", "dashboardng")}</div>
      </div>
    );
  }

  // Derive columns from data if not provided
  const effectiveColumns: TableColumn[] =
    columns.length > 0
      ? columns
      : Object.keys(data[0] || {}).map((key) => ({ id: key, name: key }));

  // Extract the itemtype from row keys (e.g., "Ticket_2" -> "Ticket")
  // This is needed because GLPI Search returns keys like "Ticket_2", "Ticket_12", etc.
  const getItemtypeFromRow = (row: any): string => {
    const firstKey = Object.keys(row)[0];
    if (firstKey && firstKey.includes("_")) {
      return firstKey.split("_")[0];
    }
    return config.itemtype || "";
  };

  const itemtype = getItemtypeFromRow(data[0] || {});

  // Helper function to get value from row by field ID
  // GLPI Search returns keys like "Ticket_2", but columns have id as just "2"
  const getRowValue = (row: any, fieldId: string | number): any => {
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

  return (
    <div className="generic-table-widget h-100 d-flex flex-column overflow-hidden">
      {config.title && (
        <div className="widget-title px-3 pt-2 pb-1 border-bottom">
          <strong>{config.title}</strong>
          <span className="badge bg-secondary ms-2">{totalCount}</span>
        </div>
      )}

      <div className="table-responsive flex-grow-1" style={{ overflowY: 'auto' }}>
        <table className="table table-sm table-hover mb-0">
          <thead className="sticky-top bg-light">
            <tr>
              {effectiveColumns.map((col) => (
                <th
                  key={col.id}
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort(col.id)}
                >
                  {decodeHtmlEntities(col.name)}
                  {sortField === col.id && (
                    <i className={`fas fa-sort-${sortDirection === "ASC" ? "up" : "down"} ms-1 text-primary`}></i>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => {
              const link = getItemLink(row);
              return (
                <tr key={rowIndex}>
                  {effectiveColumns.map((col, colIndex) => {
                    const value = getRowValue(row, col.id);
                    const formattedValue = formatCell(value, col);
                    if (colIndex === 0 && link) {
                      return <td key={col.id}><a href={link} target="_blank" dangerouslySetInnerHTML={{__html: formattedValue}}></a></td>;
                    } else {
                      return <td key={col.id}><span dangerouslySetInnerHTML={{__html: formattedValue}}></span></td>;
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination d-flex justify-content-between align-items-center px-3 py-2 border-top bg-light">
          <small className="text-muted">
            {__("Showing", "dashboardng")}
            {" "}{(currentPage - 1) * pageSize + 1}-{Math.min(
              currentPage * pageSize,
              data.length,
            )}
            {" "}{__("of", "dashboardng")} {data.length}
          </small>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
              </li>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <li
                    className={`page-item ${currentPage === pageNum ? "active" : ""}`}
                    key={pageNum}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </li>
                );
              })}
              <li
                className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
      {loading && (
        <div className="loading-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75">
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
        </div>
      )}
    </div>
  );
};

export default GenericTableWidget;
