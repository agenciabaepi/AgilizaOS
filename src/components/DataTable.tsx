'use client';
import React from 'react';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: string;
  headerClassName?: string;
  cellClassName?: string;
  render?: (row: T) => React.ReactNode;
};

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  onEdit,
  onDelete,
}: DataTableProps<T>) {
  return (
    <div className="w-full max-w-full overflow-x-auto">
      <table className="w-full min-w-[480px] sm:min-w-[640px] lg:min-w-[720px] bg-white border border-gray-200 text-sm">
      <thead className="bg-gray-100">
        <tr>
          {columns.map(col => (
            <th
              key={col.key as string}
              className={`px-2 py-2 sm:px-4 text-left text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap ${col.width || ''} ${col.headerClassName || ''}`}
            >
              {col.header}
            </th>
          ))}
          {(onEdit || onDelete) && (
            <th className="sticky right-0 z-10 bg-gray-100 px-2 py-2 sm:px-4 text-left text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
              Ações
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr
            key={row[rowKey] as React.Key}
            className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50 transition`}
          >
            {columns.map(col => (
              <td
                key={col.key as string}
                className={`px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-700 align-middle ${col.cellClassName || ''}`}
              >
                {col.render ? col.render(row) : (row[col.key as keyof T] as any) ?? '-'}
              </td>
            ))}
            {(onEdit || onDelete) && (
              <td className={`sticky right-0 z-10 px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-1 sm:gap-2">
                {onEdit && (
                  <button type="button" onClick={() => onEdit(row)} aria-label="Editar">
                    <PencilSquareIcon className="h-5 w-5 text-gray-600 hover:text-black" />
                  </button>
                )}
                {onDelete && (
                  <button type="button" onClick={() => onDelete(row)} aria-label="Excluir">
                    <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-800" />
                  </button>
                )}
                </div>
              </td>
            )}
          </tr>
        ))}
        {data.length === 0 && (
          <tr>
            <td
              colSpan={columns.length + ((onEdit || onDelete) ? 1 : 0)}
              className="px-4 py-6 text-center text-gray-500"
            >
              Nenhum registro encontrado
            </td>
          </tr>
        )}
      </tbody>
    </table>
    </div>
  );
}

export default DataTable;