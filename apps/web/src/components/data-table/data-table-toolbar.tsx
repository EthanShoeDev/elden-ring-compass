import type { ReactTable, RowData } from '@tanstack/react-table';
import { Array as Arr, Option, Predicate } from 'effect';
import { X as Cross2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  CONTENT_COLUMN_ID,
  defaultFacetedFilterFnSymbol,
  encodeJsonOption,
} from './common-column-defs';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { DataTableViewOptions } from './data-table-view-options';
import type { DataTableFeatures, DataTableFilterFn } from './table-hook';

type DataTableToolbarProps<TData extends RowData> = {
  // The hook-returned table (not the core `Table`): the toolbar reads state via
  // `table.state`, and `useAppTable` hands `DataTable` a fresh reference per state
  // change, so this prop's identity is itself the re-render signal.
  table: ReactTable<DataTableFeatures, TData>;
};

export function DataTableToolbar<TData extends RowData>({
  table,
}: DataTableToolbarProps<TData>) {
  // The Content filter is the top bar's base game / DLC scope (see
  // `useDlcScopeFilterLink`), an app-wide setting: Reset leaves it alone, and
  // it alone doesn't count as "filtered".
  const isFiltered = Arr.some(
    table.state.columnFilters,
    (f) => f.id !== CONTENT_COLUMN_ID,
  );

  return (
    <div className='flex items-center justify-between'>
      <div className='mr-10 flex flex-1 flex-wrap items-center gap-2'>
        <Input
          placeholder='Search'
          value={
            (table.getColumn('Name')?.getFilterValue() as string | undefined) ??
            ''
          }
          onChange={(event) =>
            table.getColumn('Name')?.setFilterValue(event.target.value)
          }
          className='h-8 w-[150px] lg:w-[250px]'
        />
        {Arr.map(
          Arr.filter(
            table.getAllLeafColumns(),
            (col) =>
              col.getCanFilter() &&
              (
                col.getFilterFn() as DataTableFilterFn<TData> & {
                  [defaultFacetedFilterFnSymbol]?: boolean;
                }
              )[defaultFacetedFilterFnSymbol] === true,
          ),
          (column) => {
            // [value, count] pairs over ALL rows, not the faceted ones: other
            // filters must not make an option vanish (Content = Base game would
            // otherwise drop Land of Shadow from Realm). The live counts beside
            // each option still come from the faceted model; an option the other
            // filters empty shows its full count, marked as hidden. Numeric columns
            // (e.g. Upgrade Level, Locations) read most naturally sorted by value
            // ascending; everything else by count descending (most-common first).
            const totals = new Map<unknown, number>();
            for (const row of table.getCoreRowModel().rows)
              for (const v of row.getUniqueValues<unknown>(column.id))
                totals.set(v, (totals.get(v) ?? 0) + 1);
            const entries = Array.from(totals.entries());
            const isNumeric =
              entries.length > 0 &&
              Arr.every(entries, ([v]) => Predicate.isNumber(v));
            entries.sort(([va, ca], [vb, cb]) =>
              isNumeric ? (va as number) - (vb as number) : cb - ca,
            );
            const options = Arr.map(entries, ([value, total]) => ({
              label: Predicate.isString(value)
                ? value
                : Predicate.isNullish(value)
                  ? 'NA'
                  : Option.getOrElse(encodeJsonOption(value), () => 'NA'),
              value,
              total,
            }));
            return (
              <DataTableFacetedFilter
                key={column.id}
                column={column}
                title={column.columnDef.id}
                options={options}
              />
            );
          },
        )}
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => {
              table.setColumnFilters((prev) =>
                Arr.filter(prev, (f) => f.id === CONTENT_COLUMN_ID),
              );
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
