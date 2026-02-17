import { h } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';
import { EmptyState } from './EmptyState.js';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (value: unknown, row: Record<string, unknown>) => unknown;
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
}

export const DataTable = ({ columns, rows, emptyMessage }: DataTableProps) => {
  if (!rows || rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="table-responsive table-scroll">
      <table className="table table-striped table-hover mb-0" style={{ minWidth: 0 }}>
        <thead className="table-light">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === "right" ? "text-end" : ""}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={col.key} className={col.align === "right" ? "text-end" : ""}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
