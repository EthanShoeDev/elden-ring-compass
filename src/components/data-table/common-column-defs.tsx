import { ColumnDef, ColumnHelper } from '@tanstack/react-table';
import { Checkbox } from '../ui/checkbox';
import { DataTableColumnHeader } from './data-table-column-header';
import { CheckIcon, XIcon } from 'lucide-react';

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
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          row.toggleSelected(!!value);
        }}
        aria-label="Select row"
        className="ml-2 translate-y-[2px]"
      />
    ),
    enableSorting: true,
    enableHiding: false,
    enableResizing: true,
    enableColumnFilter: false,
  });

export const commonAccessorColumnDef = <T,>(
  columnHelper: ColumnHelper<T>,
  accessor: Parameters<ColumnHelper<T>['accessor']>[0],
  label: string,
  overrides?: Parameters<ColumnHelper<T>['accessor']>[1]
): ColumnDef<T> =>
  columnHelper.accessor(accessor, {
    id: label,
    header: ({ column }) => <DataTableColumnHeader column={column} />,
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
    filterFn: function defaultFacetedFilterFn(row, columnId, filterVal) {
      return (filterVal as Array<T>).includes(row.getValue(columnId));
    },
    ...overrides,
  });
