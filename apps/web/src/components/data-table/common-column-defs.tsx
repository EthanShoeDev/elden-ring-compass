import { RowData, Subscribe } from '@tanstack/react-table';
import { CheckIcon, XIcon } from 'lucide-react';
import { MapPinGlyph } from '@/components/icons/map-pin-glyph';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableColumnDef, DataTableColumnHelper, DataTableRow } from './table-hook';

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
export const commonPinColumnDef = <T extends RowData>(
  columnHelper: DataTableColumnHelper<T>,
): DataTableColumnDef<T> =>
  columnHelper.display({
    id: 'pin',
    size: 56,
    // Header and cell read selection through builder APIs (`getIsAllPageRowsSelected`,
    // `getIsSelected`) from stable `table`/`row` references, which hides the state
    // dependency from the React Compiler — wrap in `Subscribe` so the JSX re-runs on
    // the slices those reads derive from (the v9-documented pattern).
    header: ({ table }) => (
      <Subscribe
        source={table.store}
        // The page-rows aggregate also shifts when filtering changes which rows exist.
        selector={(s) => ({ rowSelection: s.rowSelection, columnFilters: s.columnFilters })}
      >
        {() => {
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
        }}
      </Subscribe>
    ),
    cell: ({ row, table }) => {
      if (!row.getCanSelect()) {
        return (
          <div className='flex justify-center'>
            <PinUnavailable />
          </div>
        );
      }
      return (
        // Per-row atom subscription: only this row's pin re-renders on selection
        // changes, and the read is compiler-visible (see header comment).
        <Subscribe source={table.atoms.rowSelection} selector={(s) => !!s[row.id]}>
          {(on) => (
            <div className='flex justify-center'>
              <PinToggle
                state={on ? 'on' : 'off'}
                onToggle={() => {
                  row.toggleSelected(!on);
                }}
                title={on ? 'Remove pin' : 'Pin on map'}
              />
            </div>
          )}
        </Subscribe>
      );
    },
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enableColumnFilter: false,
  });

export const defaultFacetedFilterFnSymbol = Symbol('defaultFacetedFilterFn');
function defaultFacetedFilterFn<T extends RowData>(
  row: DataTableRow<T>,
  columnId: string,
  filterVal: Array<T>,
) {
  return filterVal.includes(row.getValue(columnId));
}
defaultFacetedFilterFn[defaultFacetedFilterFnSymbol] = true;

/**
 * Filter for the inventory Quantity column. ONE filter value, two shapes, so the
 * prominent All/Owned/Missing segmented control (see `InventoryDataTableCard`) and
 * the column's faceted dropdown stay linked to a single source of truth instead of
 * being two controls that can disagree:
 *   - `'owned'`   → `quantity > 0`   (the toggle's Owned preset)
 *   - `'missing'` → `quantity === 0` (the toggle's Missing preset)
 *   - `number[]`  → exact-value facet selection (e.g. "weapons I have 2 of")
 *   - anything else / cleared → keep every row
 * Tagged with `defaultFacetedFilterFnSymbol` so the toolbar still renders the
 * faceted chip; the facet UI interprets the `'owned'`/`'missing'` presets into
 * checked boxes (see `DataTableFacetedFilter`).
 */
export function quantityFilterFn<T extends RowData>(
  row: DataTableRow<T>,
  columnId: string,
  filterVal: unknown,
) {
  const qty = row.getValue<number>(columnId);
  if (filterVal === 'owned') return qty > 0;
  if (filterVal === 'missing') return qty === 0;
  if (Array.isArray(filterVal)) return filterVal.length === 0 || filterVal.includes(qty);
  return true;
}
quantityFilterFn[defaultFacetedFilterFnSymbol] = true;

export const commonAccessorColumnDef = <T extends RowData>(
  columnHelper: DataTableColumnHelper<T>,
  accessor: Parameters<DataTableColumnHelper<T>['accessor']>[0],
  label: string,
  overrides?: Parameters<DataTableColumnHelper<T>['accessor']>[1],
): DataTableColumnDef<T> =>
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
