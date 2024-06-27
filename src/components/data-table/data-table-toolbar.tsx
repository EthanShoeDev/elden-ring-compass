import { Cross2Icon } from '@radix-ui/react-icons';
import { FilterFn, Table } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from './data-table-view-options';

import { defaultFacetedFilterFnSymbol } from './common-column-defs';
import { DataTableFacetedFilter } from './data-table-faceted-filter';

type DataTableToolbarProps<TData> = {
  table: Table<TData>;
};

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  'use no memo';
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="mr-10 flex flex-1 flex-wrap items-center gap-2">
        <Input
          placeholder={'Search'}
          value={
            (table.getColumn('Name')?.getFilterValue() as string | undefined) ??
            ''
          }
          onChange={(event) =>
            table.getColumn('Name')?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table
          .getAllLeafColumns()
          .filter(
            (col) =>
              col.getCanFilter() &&
              (
                col.getFilterFn() as FilterFn<unknown> & {
                  [defaultFacetedFilterFnSymbol]?: boolean;
                }
              )[defaultFacetedFilterFnSymbol]
          )
          .map((column) => {
            const options = Array.from(
              column.getFacetedUniqueValues().keys()
            ).map((value) => ({
              label:
                typeof value != 'string'
                  ? value == null
                    ? 'NA'
                    : JSON.stringify(value)
                  : value,
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
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 size-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
