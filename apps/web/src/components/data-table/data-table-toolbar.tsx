import { X as Cross2Icon } from 'lucide-react';
import { ReactTable, RowData } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from './data-table-view-options';

import { defaultFacetedFilterFnSymbol } from './common-column-defs';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { DataTableFeatures, DataTableFilterFn } from './table-hook';

type DataTableToolbarProps<TData extends RowData> = {
  // The hook-returned table (not the core `Table`): the toolbar reads state via
  // `table.state`, and `useAppTable` hands `DataTable` a fresh reference per state
  // change, so this prop's identity is itself the re-render signal.
  table: ReactTable<DataTableFeatures, TData>;
};

export function DataTableToolbar<TData extends RowData>({ table }: DataTableToolbarProps<TData>) {
  const isFiltered = table.state.columnFilters.length > 0;

  return (
    <div className='flex items-center justify-between'>
      <div className='mr-10 flex flex-1 flex-wrap items-center gap-2'>
        <Input
          placeholder={'Search'}
          value={(table.getColumn('Name')?.getFilterValue() as string | undefined) ?? ''}
          onChange={(event) => table.getColumn('Name')?.setFilterValue(event.target.value)}
          className='h-8 w-[150px] lg:w-[250px]'
        />
        {table
          .getAllLeafColumns()
          .filter(
            (col) =>
              col.getCanFilter() &&
              (
                col.getFilterFn() as DataTableFilterFn<TData> & {
                  [defaultFacetedFilterFnSymbol]?: boolean;
                }
              )[defaultFacetedFilterFnSymbol],
          )
          .map((column) => {
            // [value, count] pairs. Numeric columns (e.g. Upgrade Level, Locations)
            // read most naturally sorted by value ascending; everything else by
            // aggregate count descending (most-common first). `getFacetedUniqueValues`
            // iterates in row-encounter order otherwise, which feels random.
            const entries = Array.from(column.getFacetedUniqueValues().entries());
            const isNumeric = entries.length > 0 && entries.every(([v]) => typeof v === 'number');
            entries.sort(([va, ca], [vb, cb]) =>
              isNumeric ? (va as number) - (vb as number) : cb - ca,
            );
            const options = entries.map(([value]) => ({
              label:
                typeof value != 'string' ? (value == null ? 'NA' : JSON.stringify(value)) : value,
              value: value as unknown,
            }));
            return (
              <DataTableFacetedFilter
                key={column.id}
                column={column}
                title={column.columnDef.id}
                options={options}
              />
            );
          })}
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => {
              table.resetColumnFilters();
            }}
            className='h-8 px-2 lg:px-3'
          >
            Reset
            <Cross2Icon className='ml-2 size-4' />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
