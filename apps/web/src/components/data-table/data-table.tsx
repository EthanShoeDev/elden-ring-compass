import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type CSSProperties, useRef } from 'react';

import { cn } from '@/lib/utils';
import { DataTableStateInitProps, useDataTableState } from './data-table-store';
import { DataTableToolbar } from './data-table-toolbar';

// Every row is forced to this fixed height (see the `<tr>` style + cell
// `overflow-hidden`), so the virtualizer's translate math is exact without
// per-row measurement. Cells are single-line (`whitespace-nowrap`), and the
// tallest content (a `size-6` icon) fits comfortably.
const ROW_HEIGHT = 44;

// Shared flex sizing for a header/body cell. Header and body must use the
// identical rule or the two grids drift out of alignment. Width comes from the
// column's `getSize()` (basis); the `Name` column grows to fill leftover width
// when the viewport is wider than the table, and nothing shrinks below its
// basis (so wide tables keep their width and the container scrolls instead).
const cellStyle = (columnId: string, size: number): CSSProperties => ({
  flexGrow: columnId === 'Name' ? 1 : 0,
  flexShrink: 0,
  flexBasis: size,
});

export function DataTable<TData extends { id: number; name: string }, TValue>({
  className,
  columns,
  data,
  fill = false,
  maxBodyHeight = '70vh',
  ...props
}: {
  className?: string;
  columns: Array<ColumnDef<TData, TValue>>;
  data: Array<TData>;
  /**
   * Fill the available height of a flex-column parent (`flex-1 min-h-0`) instead
   * of capping at `maxBodyHeight`. Use on table-only routes whose card is given
   * the full viewport height; leave off on mixed-content pages.
   */
  fill?: boolean;
  /** Cap for the scrolling body when not in `fill` mode. */
  maxBodyHeight?: string;
} & DataTableStateInitProps) {
  'use no memo';
  const state = useDataTableState(props);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: state.sorting,
      columnVisibility: state.columnVisibility,
      rowSelection: state.rowSelection,
      columnFilters: state.columnFilters,
      columnSizing: state.columnSizing,
      columnOrder: state.columnOrder,
    },
    defaultColumn: {
      minSize: 50,
    },
    columnResizeMode: 'onChange',
    enableRowSelection: (row) => {
      // A row is pinnable if it has an extracted overworld position: an event
      // pixel (graces / field bosses) or an item with overworld pickup locations.
      const r = row.original as { pixel?: unknown; hasCoords?: boolean };
      return !!(r.pixel || r.hasCoords);
    },
    getRowId: (row) => row.id.toString(),
    onRowSelectionChange: state.setRowSelection,
    onSortingChange: state.setSorting,
    onColumnSizingChange: state.setColumnSizing,
    onColumnFiltersChange: state.setColumnFilters,
    onColumnVisibilityChange: state.setColumnVisibility,
    onColumnOrderChange: state.setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const { rows } = table.getRowModel();
  const totalWidth = table.getTotalSize();
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  // The scroll container is the virtualizer's scroll element. `getScrollElement`
  // is null on the server and during the hydration render (the ref attaches
  // after), so both render zero virtual items — no hydration mismatch; the rows
  // appear right after mount when the measuring effect runs.
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div className={cn(fill ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4', className)}>
      <div className='shrink-0'>
        <DataTableToolbar table={table} />
      </div>
      <div
        ref={scrollRef}
        className={cn('relative overflow-auto rounded-md border', fill && 'min-h-0 flex-1')}
        style={fill ? undefined : { maxHeight: maxBodyHeight }}
      >
        {/* CSS grid layout (not auto table layout) so column widths come straight
            from `getSize()` and stay stable as rows virtualize in/out. The `Name`
            column grows to absorb slack when the viewport is wider than the sum of
            columns; otherwise the table keeps its natural width and scrolls. */}
        <table className='grid w-full caption-bottom text-sm' style={{ minWidth: totalWidth }}>
          <thead className='sticky top-0 z-10 grid bg-background [&_tr]:border-b'>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className='flex w-full'>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className='relative flex h-10 items-center px-2 text-left align-middle font-medium whitespace-nowrap text-foreground'
                    style={cellStyle(header.column.id, header.getSize())}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanResize() && (
                      // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- column-resize grip is a pointer-only drag affordance with no keyboard equivalent
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          'absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none border-r select-none hover:bg-muted',
                          header.column.getIsResizing() &&
                            'bg-secondary-foreground/20 hover:bg-secondary-foreground/20',
                        )}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {/* The body reserves the full scroll height; visible rows are absolutely
              translated to their virtual position. */}
          <tbody
            className='relative grid'
            style={{ height: rows.length ? rowVirtualizer.getTotalSize() : undefined }}
          >
            {rows.length ? (
              virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                return (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className='absolute flex w-full border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'
                    style={{ height: ROW_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className='flex items-center overflow-hidden p-2 align-middle whitespace-nowrap has-[img]:p-0'
                        style={cellStyle(cell.column.id, cell.column.getSize())}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr className='flex'>
                <td className='flex h-24 w-full items-center justify-center text-center'>
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className='shrink-0 px-2 text-sm text-muted-foreground'>
        {selectedCount > 0 && <>{selectedCount} pinned · </>}
        {rows.length.toLocaleString()} {rows.length === 1 ? 'row' : 'rows'}
      </div>
    </div>
  );
}
