import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  Table,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type CSSProperties, useState } from 'react';

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

  const rowCount = table.getRowModel().rows.length;
  const totalWidth = table.getTotalSize();
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  // The scroll container is the virtualizer's scroll element (the virtualizer
  // lives in <DataTableBody> so scrolling only re-renders the rows — not this
  // component's toolbar + faceted filters, which iterate every row). It's tracked
  // as state (callback ref) rather than a useRef: because <DataTableBody> is a
  // *descendant* of this div, its mount layout-effect runs before this div's ref
  // attaches — a plain ref would still read null there and the virtualizer would
  // never measure (empty body). Setting state on mount re-renders the body with
  // the real element so the virtualizer attaches its observers.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  return (
    <div className={cn(fill ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4', className)}>
      <div className='shrink-0'>
        <DataTableToolbar table={table} />
      </div>
      <div
        ref={setScrollEl}
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
          <DataTableBody table={table} scrollEl={scrollEl} />
        </table>
      </div>
      <div className='shrink-0 px-2 text-sm text-muted-foreground'>
        {selectedCount > 0 && <>{selectedCount} pinned · </>}
        {rowCount.toLocaleString()} {rowCount === 1 ? 'row' : 'rows'}
      </div>
    </div>
  );
}

/**
 * The virtualized `<tbody>`. Kept as its own component so the row virtualizer's
 * scroll-driven re-renders stay scoped here — re-rendering the parent on every
 * scroll frame would re-run the toolbar's faceted-filter aggregation over all
 * rows. The body reserves the full scroll height and absolutely-positions each
 * visible row at its virtual offset.
 */
function DataTableBody<TData>({
  table,
  scrollEl,
}: {
  table: Table<TData>;
  scrollEl: HTMLDivElement | null;
}) {
  'use no memo';
  const { rows } = table.getRowModel();

  // `scrollEl` is null on the server, during hydration, and on the first client
  // render (the parent's callback ref sets it on mount) — all render zero virtual
  // items, so there's no hydration mismatch. The state update flips it to the
  // real element, which re-renders this body and lets the virtualizer measure.
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  if (!rows.length) {
    return (
      <tbody className='grid'>
        <tr className='flex'>
          <td className='flex h-24 w-full items-center justify-center text-center'>No results.</td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className='relative grid' style={{ height: rowVirtualizer.getTotalSize() }}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];
        if (!row) return null;
        return (
          <tr
            key={row.id}
            data-state={row.getIsSelected() && 'selected'}
            // `contain: layout paint` isolates each row's layout/paint so a forced
            // reflow (e.g. the tooltip's floating-ui reading a cell rect on hover)
            // doesn't recompute the whole virtualized grid.
            className='absolute flex w-full border-b transition-colors [contain:layout_paint] hover:bg-muted/50 data-[state=selected]:bg-muted'
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
      })}
    </tbody>
  );
}
