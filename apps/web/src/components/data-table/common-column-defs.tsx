import { ColumnDef, ColumnHelper, Row } from '@tanstack/react-table';
import { CheckIcon, XIcon } from 'lucide-react';
import { MapPinGlyph } from '@/components/icons/map-pin-glyph';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from './data-table-column-header';

/**
 * The map-pin affordance that replaces the old select checkbox. A row's
 * "selection" is what drops it as a pin on the interactive map, so the control
 * reads as a pin: a hollow MapPin you can fill, an amber filled pin when pinned,
 * and a muted dash for rows with no extracted overworld location (those can't be
 * pinned — `row.getCanSelect()` is false). Mirrors the compass-app design kit's
 * `PinToggle`.
 */
function PinToggle({
  state,
  onToggle,
  title,
}: {
  state: 'on' | 'ind' | 'off';
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      type='button'
      aria-label={title}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'inline-flex size-[30px] items-center justify-center rounded-md border transition-colors',
        state === 'on'
          ? 'border-amber-500/60 bg-amber-500/15 text-amber-400'
          : state === 'ind'
            ? 'border-amber-500/40 text-amber-400/90 hover:bg-amber-500/10'
            : 'border-input text-muted-foreground hover:border-amber-500/55 hover:bg-amber-500/10 hover:text-amber-400',
      )}
    >
      <MapPinGlyph className='size-[15px]' filled={state === 'on'} />
    </button>
  );
}

function PinUnavailable() {
  return (
    <span
      className='inline-flex size-[30px] items-center justify-center'
      title="No map data — can't be pinned"
    >
      <span className='block h-0.5 w-2.5 rounded-sm bg-muted-foreground/35' />
    </span>
  );
}

/**
 * Pin column for the data tables. Pinning a row = placing it on the map, so the
 * header pins/unpins every pinnable row on the page and each cell toggles a
 * single row. (Formerly a select-all / row checkbox.)
 */
export const commonPinColumnDef = <T,>(columnHelper: ColumnHelper<T>): ColumnDef<T> =>
  columnHelper.display({
    id: 'pin',
    size: 56,
    header: ({ table }) => {
      const all = table.getIsAllPageRowsSelected();
      const some = table.getIsSomePageRowsSelected();
      return (
        <div className='flex flex-col items-center gap-0.5'>
          <PinToggle
            state={all ? 'on' : some ? 'ind' : 'off'}
            onToggle={() => {
              table.toggleAllPageRowsSelected(!all);
            }}
            title={all ? 'Unpin this page' : 'Pin all on this page'}
          />
          <span className='text-[9px] font-bold tracking-wider text-muted-foreground uppercase'>
            Pin
          </span>
        </div>
      );
    },
    cell: ({ row }) => {
      if (!row.getCanSelect()) {
        return (
          <div className='flex justify-center'>
            <PinUnavailable />
          </div>
        );
      }
      const on = row.getIsSelected();
      return (
        <div className='flex justify-center'>
          <PinToggle
            state={on ? 'on' : 'off'}
            onToggle={() => {
              row.toggleSelected(!on);
            }}
            title={on ? 'Remove pin' : 'Pin on map'}
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enableColumnFilter: false,
  });

export const defaultFacetedFilterFnSymbol = Symbol('defaultFacetedFilterFn');
function defaultFacetedFilterFn<T>(row: Row<T>, columnId: string, filterVal: Array<T>) {
  return filterVal.includes(row.getValue(columnId));
}
defaultFacetedFilterFn[defaultFacetedFilterFnSymbol] = true;

export const commonAccessorColumnDef = <T,>(
  columnHelper: ColumnHelper<T>,
  accessor: Parameters<ColumnHelper<T>['accessor']>[0],
  label: string,
  overrides?: Parameters<ColumnHelper<T>['accessor']>[1],
): ColumnDef<T> =>
  columnHelper.accessor(accessor, {
    id: label,
    header: ({ column, table }) => <DataTableColumnHeader table={table} column={column} />,
    cell: (cell) => {
      const value = cell.renderValue();
      const renderValue =
        typeof value === 'string' || typeof value === 'number' ? (
          value
        ) : value == null ? (
          'NA'
        ) : typeof value == 'boolean' ? (
          value ? (
            <CheckIcon className='size-4 text-green-300' />
          ) : (
            <XIcon className='size-4 text-red-300' />
          )
        ) : (
          JSON.stringify(value)
        );
      return <div>{renderValue}</div>;
    },
    filterFn: defaultFacetedFilterFn,
    ...overrides,
  });
