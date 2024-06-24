import { ColumnDef, ColumnHelper } from '@tanstack/react-table';
import { Checkbox } from '../ui/checkbox';
import { DataTableColumnHeader } from './data-table-column-header';
import { ReactNode } from 'react';

export const commonSelectColumnDef = <T,>(
  columnHelper: ColumnHelper<T>
): ColumnDef<T> =>
  columnHelper.display({
    id: 'select',
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
        className="translate-y-[2px]"
      />
    ),
    enableSorting: true,
    enableHiding: false,
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
    cell: (cell) => <div>{cell.renderValue() as ReactNode}</div>,
    filterFn: 'arrIncludesSome',
    ...overrides,
  });
