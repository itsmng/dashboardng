import { html } from '../../../lib/preact.js';
import { __ } from '../../../lib/i18n.js';
import { EmptyState } from './EmptyState.js';

export const DataTable = ({ columns, rows, emptyMessage }) => {
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
};

export default DataTable;
