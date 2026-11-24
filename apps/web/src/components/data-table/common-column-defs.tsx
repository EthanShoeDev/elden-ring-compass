import type { RowData } from '@tanstack/react-table';
import { Subscribe } from '@tanstack/react-table';
import { Array as Arr, Option, Predicate, Schema } from 'effect';
import { CheckIcon, ExternalLinkIcon, XIcon } from 'lucide-react';

import { DlcTag } from '@/components/misc/dlc-tag';
import { DLC_SCOPE_LABEL } from '@/lib/dlc';
import { wikiPageUrl } from '@/lib/wiki';

import { DataTableColumnHeader } from './data-table-column-header';
import { PinToggle, PinUnavailable } from './pin-toggle';
import type {
  DataTableColumnDef,
  DataTableColumnHelper,
  DataTableRow,
} from './table-hook';

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
        selector={(s) => ({
          rowSelection: s.rowSelection,
          columnFilters: s.columnFilters,
        })}
      >
        {() => {
          const all = table.getIsAllPageRowsSelected();
          const some = table.getIsSomePageRowsSelected();
          return (
            // The header row is a fixed h-10; a visible "Pin" caption under the
            // 30px toggle overflowed it, so the label is screen-reader only.
            <div className='flex justify-center'>
              <PinToggle
                state={all ? 'on' : some ? 'ind' : 'off'}
                onToggle={() => {
                  table.toggleAllPageRowsSelected(!all);
                }}
                title={all ? 'Unpin this page' : 'Pin all on this page'}
              />
              <span className='sr-only'>Pin</span>
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
        <Subscribe
          source={table.atoms.rowSelection}
          selector={(s) => !!s[row.id]}
        >
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

/**
 * Per-row external link to the row's Fextralife wiki page. Link-only — the wiki
 * forbids scraping its content. `wikiName` resolves the row to its page name
 * (`wikiNameForItem` / `wikiNameForBoss` in `@/lib/wiki`); `null` means the wiki
 * has no page for the row, rendered as a muted dash. Every URL these resolvers
 * can produce is validated offline by `scripts/wiki-link-check.ts`.
 */
export const commonWikiColumnDef = <T extends RowData>(
  columnHelper: DataTableColumnHelper<T>,
  wikiName: (row: T) => string | null,
): DataTableColumnDef<T> =>
  columnHelper.display({
    id: 'wiki',
    header: 'Wiki',
    size: 56,
    enableResizing: false,
    enableHiding: true,
    cell: ({ row }) => {
      const name = wikiName(row.original);
      return (
        <div className='flex justify-center'>
          {name === null ? (
            <span className='text-muted-foreground/40'>—</span>
          ) : (
            <a
              href={wikiPageUrl(name)}
              target='_blank'
              rel='noreferrer'
              title={`${name} — Elden Ring Wiki`}
              className='text-muted-foreground hover:text-foreground'
            >
              <ExternalLinkIcon className='size-3.5' />
              <span className='sr-only'>{name} on the Elden Ring Wiki</span>
            </a>
          )}
        </div>
      );
    },
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
 * Faceted filter over SEVERAL values per row (`getUniqueValues`): an item found
 * in two realms, a stack that's both carried and in the Sorting Chest. Keeps a
 * row when any of its values is selected. Ignores non-array filter values.
 */
function multiValueFilterFn<T extends RowData>(
  row: DataTableRow<T>,
  columnId: string,
  filterVal: unknown,
) {
  if (!Arr.isArray(filterVal) || filterVal.length === 0) return true;
  return Arr.some(row.getUniqueValues<unknown>(columnId), (v) =>
    filterVal.includes(v),
  );
}
multiValueFilterFn[defaultFacetedFilterFnSymbol] = true;

/**
 * A faceted column whose rows each carry a list of values. The facet counts and
 * filters per value; the cell shows them joined (pass `cell` to render badges).
 */
export const multiValueColumnDef = <T extends RowData>(
  columnHelper: DataTableColumnHelper<T>,
  values: (row: T) => readonly string[],
  label: string,
  overrides?: Parameters<DataTableColumnHelper<T>['accessor']>[1],
): DataTableColumnDef<T> =>
  commonAccessorColumnDef(
    columnHelper,
    (row: T) => Arr.join(values(row), ', '),
    label,
    {
      id: label,
      getUniqueValues: values,
      filterFn: multiValueFilterFn,
      ...overrides,
    },
  );

/**
 * Content: Base game / Shadow of the Erdtree. Complements the global scope in the
 * top bar — with it on "All", this splits a table without leaving the page.
 */
export const contentColumnDef = <
  T extends RowData & { readonly isDlc: boolean },
>(
  columnHelper: DataTableColumnHelper<T>,
): DataTableColumnDef<T> =>
  commonAccessorColumnDef(
    columnHelper,
    (row: T) => DLC_SCOPE_LABEL[row.isDlc ? 'dlc' : 'base'],
    CONTENT_COLUMN_ID,
  );

/** Column id of {@link contentColumnDef} — linked to the global content scope. */
export const CONTENT_COLUMN_ID = 'Content';

/** Realm: which interactive map(s) a row is on (`realmLabels`). */
export const realmColumnDef = <T extends RowData>(
  columnHelper: DataTableColumnHelper<T>,
  realms: (row: T) => readonly string[],
): DataTableColumnDef<T> => multiValueColumnDef(columnHelper, realms, 'Realm');

/** `JSON.stringify` that yields `None` (instead of `undefined` or a throw) for values with no JSON form. */
export const encodeJsonOption = Schema.encodeOption(
  Schema.fromJsonString(Schema.Unknown),
);

/** Name cell with a SotE tag on Shadow of the Erdtree rows; pass as a Name column's `cell`. */
export const renderNameCell = <
  T extends RowData & { readonly name: string; readonly isDlc: boolean },
>({
  row,
}: {
  row: DataTableRow<T>;
}) => (
  <div className='flex items-center gap-1.5'>
    <span>{row.original.name}</span>
    {row.original.isDlc && <DlcTag />}
  </div>
);

export const commonAccessorColumnDef = <T extends RowData>(
  columnHelper: DataTableColumnHelper<T>,
  accessor: Parameters<DataTableColumnHelper<T>['accessor']>[0],
  label: string,
  overrides?: Parameters<DataTableColumnHelper<T>['accessor']>[1],
): DataTableColumnDef<T> =>
  columnHelper.accessor(accessor, {
    id: label,
    header: ({ column, table }) => (
      <DataTableColumnHeader table={table} column={column} />
    ),
    cell: (cell) => {
      const value = cell.renderValue();
      const renderValue =
        Predicate.isString(value) || Predicate.isNumber(value) ? (
          value
        ) : Predicate.isNullish(value) ? (
          'NA'
        ) : Predicate.isBoolean(value) ? (
          value ? (
            <CheckIcon className='size-4 text-green-300' />
          ) : (
            <XIcon className='size-4 text-red-300' />
          )
        ) : (
          Option.getOrUndefined(encodeJsonOption(value))
        );
      return <div>{renderValue}</div>;
    },
    filterFn: defaultFacetedFilterFn,
    ...overrides,
  });
