import React from "react";
import { CircularProgress } from "@mui/material";

/**
 * Reusable data table for admin management pages.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string, render?: Function}>} props.columns
 * @param {Array} props.data - array of row objects
 * @param {boolean} props.loading
 * @param {string} [props.emptyMessage]
 * @param {Function} [props.onRowClick] - (row) => void
 * @param {number} [props.page]
 * @param {number} [props.pages]
 * @param {Function} [props.onPageChange] - (newPage) => void
 * @param {number} [props.total]
 */
export default function DataTable({
  columns,
  data = [],
  loading,
  emptyMessage = "No data found",
  onRowClick,
  page,
  pages,
  onPageChange,
  total,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-xl">
        <CircularProgress size={32} />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-xl text-gray-400">
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {data.map((row, idx) => (
              <tr
                key={row._id || idx}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500">
            Page {page} of {pages} {total ? `(${total} total)` : ""}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= pages}
              className="px-3 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
