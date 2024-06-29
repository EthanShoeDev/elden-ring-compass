import { ColumnDef, ColumnHelper, Row } from '@tanstack/react-table';
import { CheckIcon, XIcon } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { DataTableColumnHeader } from './data-table-column-header';

export const commonSelectColumnDef = <T,>(
  columnHelper: ColumnHelper<T>
): ColumnDef<T> =>
  columnHelper.display({
    id: 'select',
    size: 1,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => {
          table.toggleAllPageRowsSelected(!!value);
        }}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => {
      return (
        <Checkbox
          disabled={!row.getCanSelect()}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
          className="ml-2 translate-y-[2px]"
        />
      );
    },
    enableSorting: true,
    enableHiding: false,
    enableResizing: true,
    enableColumnFilter: false,
  });

export const defaultFacetedFilterFnSymbol = Symbol('defaultFacetedFilterFn');
function defaultFacetedFilterFn<T>(
  row: Row<T>,
  columnId: string,
  filterVal: Array<T>
) {
  return filterVal.includes(row.getValue(columnId));
}
defaultFacetedFilterFn[defaultFacetedFilterFnSymbol] = true;

export const commonAccessorColumnDef = <T,>(
  columnHelper: ColumnHelper<T>,
  accessor: Parameters<ColumnHelper<T>['accessor']>[0],
  label: string,
  overrides?: Parameters<ColumnHelper<T>['accessor']>[1]
): ColumnDef<T> =>
  columnHelper.accessor(accessor, {
    id: label,
    header: ({ column, table }) => (
      <DataTableColumnHeader table={table} column={column} />
    ),
    cell: (cell) => {
      const value = cell.renderValue();
      const renderValue =
        typeof value === 'string' || typeof value === 'number' ? (
          value
        ) : value == null ? (
          'NA'
        ) : typeof value == 'boolean' ? (
          value ? (
            <CheckIcon className="size-4 text-green-300" />
          ) : (
            <XIcon className="size-4 text-red-300" />
          )
        ) : (
          JSON.stringify(value)
        );
      return <div>{renderValue}</div>;
    },
    filterFn: defaultFacetedFilterFn,
    ...overrides,
  });
