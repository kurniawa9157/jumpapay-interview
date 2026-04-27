import React from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  loading?: boolean;
}

export function DataTable<T>({ columns, rows, getRowKey, onRowClick, emptyLabel = "Tidak ada data.", loading }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-line-sand bg-white shadow-[0_10px_30px_rgba(15,30,61,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-table-headerBg text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary ${col.headerClassName || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-ink-muted">
                  Memuat data…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-muted">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-t border-line-sand/60 transition ${
                    index % 2 === 1 ? "bg-table-zebra" : "bg-white"
                  } ${onRowClick ? "cursor-pointer hover:bg-table-rowHover" : ""}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle text-ink-tertiary ${col.className || ""}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
