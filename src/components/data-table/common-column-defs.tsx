import { ColumnDef, ColumnHelper } from '@tanstack/react-table';
import { Checkbox } from '../ui/checkbox';
import { DataTableColumnHeader } from './data-table-column-header';

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
        className="ml-2 translate-y-[2px]"
      />
    ),
    enableSorting: true,
    enableHiding: false,
    enableResizing: true,
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
        typeof value === 'string'
          ? value
          : value == null
            ? 'NA'
            : JSON.stringify(value);
      return <div>{renderValue}</div>;
    },
    filterFn: 'arrIncludesSome',
    ...overrides,
  });
