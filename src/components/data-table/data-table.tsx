import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { cn } from '@/lib/utils';
import {
  DataTableProvider,
  DataTableStoreProps,
  useDataTableContext,
} from './data-table-context';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

export function DataTable<TData, TValue>({
  className,
  columns,
  data,
  ...props
}: {
  className?: string;
  columns: Array<ColumnDef<TData, TValue>>;
  data: Array<TData>;
} & DataTableStoreProps) {
  return (
    <DataTableProvider key={props.tableId} {...props}>
      <DataTableInner className={className} columns={columns} data={data} />
    </DataTableProvider>
  );
}

function DataTableInner<TData, TValue>({
  className,
  columns,
  data,
}: {
  className?: string;
  columns: Array<ColumnDef<TData, TValue>>;
  data: Array<TData>;
}) {
  'use no memo';
  // const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
  //   initialColumnVisibility ?? {}
  // );
  // const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const state = useDataTableContext((state) => state);

  const table = useReactTable({
    data,
    columns,
    initialState: {
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
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
    enableRowSelection: true,
    columnResizeMode: 'onChange',
    onRowSelectionChange: state.setRowSelection,
    onSortingChange: state.setSorting,
    onColumnSizingChange: state.setColumnSizing,
    onColumnFiltersChange: state.setColumnFilters,
    onColumnVisibilityChange: state.setColumnVisibility,
    onColumnOrderChange: state.setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });
  return (
    <div className={cn('space-y-4', className)}>
      <DataTableToolbar table={table} />
      <ScrollArea>
        <div className="rounded-md border">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className="relative"
                        style={{
                          width: header.getSize(),
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              'absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none select-none border-r hover:bg-muted',
                              header.column.getIsResizing()
                                ? 'bg-secondary-foreground/20 hover:bg-secondary-foreground/20'
                                : ''
                            )}
                          ></div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="has-[img]:p-0">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <DataTablePagination table={table} />
    </div>
  );
}
