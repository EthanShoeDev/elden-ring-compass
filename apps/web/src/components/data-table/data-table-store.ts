import {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnSizingState,
  ColumnVisibilityState,
  OnChangeFn,
  RowData,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import { Schema } from 'effect';
import { Atom } from 'effect/unstable/reactivity';
import { useAtomSet, useAtomValue } from '@effect/atom-react';
import { useHydrated } from '@tanstack/react-router';
import { useEffect } from 'react';
import { browserKvsRuntime } from '@/lib/atoms/kvs';
import { defaultEventRowSelection } from '@/lib/vm/events';
import { InventoryTableType } from '../sections/inventory-data-table-card';
import type { DataTableInstance } from './table-hook';

export type TableId =
  | 'events'
  | 'bosses'
  | 'regions'
  | 'weapons'
  | 'weapon-calculator'
  | InventoryTableType;

export type DataTableStateInitProps = {
  tableId: TableId;
  initialColumnVisibility?: ColumnVisibilityState;
  initialRowSelection?: RowSelectionState;
};

export type DataTableState = {
  tableId: TableId;
  rowSelection: RowSelectionState;
  columnVisibility: ColumnVisibilityState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  columnSizing: ColumnSizingState;
  columnOrder: ColumnOrderState;
};

type TableStateMap = Record<TableId, DataTableState | undefined>;

const defaultTableState = (props: DataTableStateInitProps): DataTableState => ({
  tableId: props.tableId,
  columnVisibility: props.initialColumnVisibility ?? {},
  rowSelection: props.initialRowSelection ?? {},
  columnFilters: [],
  sorting: [],
  columnSizing: {},
  columnOrder: [],
});

// Per-table UI state (sorting/filters/visibility/selection/sizing/order), persisted
// via typesafe kvs — replaced the Zustand `persist` store. The schema validates the
// localStorage payload; arrays are validated as readonly while the app consumes
// TanStack's mutable types, so the atom is cast to the app shape in one place here.
const DataTableStateSchema = Schema.Struct({
  tableId: Schema.String,
  rowSelection: Schema.Record(Schema.String, Schema.Boolean),
  columnVisibility: Schema.Record(Schema.String, Schema.Boolean),
  columnFilters: Schema.Array(Schema.Struct({ id: Schema.String, value: Schema.Unknown })),
  sorting: Schema.Array(Schema.Struct({ id: Schema.String, desc: Schema.Boolean })),
  columnSizing: Schema.Record(Schema.String, Schema.Number),
  columnOrder: Schema.Array(Schema.String),
});

// First-visit default: with no persisted state, seed the `events` table so every
// placeable grace and boss is already pinned on the map (what a user would get by
// clicking all four quick-select buttons). `defaultValue` is used ONLY when the
// `data-table-state` key is absent — the first time someone lands on the site — and
// is superseded the moment any table state is written, so a returning user who has
// cleared their pins keeps an empty map.
const tableStateAtom = Atom.kvs({
  runtime: browserKvsRuntime,
  key: 'data-table-state',
  schema: Schema.Record(Schema.String, DataTableStateSchema),
  defaultValue: () => ({
    events: {
      tableId: 'events',
      rowSelection: defaultEventRowSelection(),
      columnVisibility: {},
      columnFilters: [],
      sorting: [],
      columnSizing: {},
      columnOrder: [],
    },
  }),
  // oxlint-disable-next-line unknown-cast/forbidden -- the schema validates the persisted readonly shape; the app uses TanStack's mutable types, bridged here once
}) as unknown as Atom.Writable<TableStateMap, TableStateMap>;

// Per-table derived slice. Each `DataTable` subscribes only to ITS slice, so interacting with one
// table no longer re-renders every other mounted table (the old `useAtom(tableStateAtom)` read the
// whole map, so any change re-rendered all of them — the coarse-subscription regression vs the old
// Zustand selectors). `Atom.map` dedupes on equality: a single-table write produces `{...prev, [id]:
// next}`, so sibling slices keep their reference and don't notify.
const tableStateSliceFamily = Atom.family((tableId: TableId) =>
  Atom.map(tableStateAtom, (state) => state[tableId]),
);

// The six persisted slices (the table also owns transient state like
// `columnResizing` that is intentionally not persisted).
type PersistedKey =
  | 'rowSelection'
  | 'columnVisibility'
  | 'columnFilters'
  | 'sorting'
  | 'columnSizing'
  | 'columnOrder';

/**
 * Two-way bridge between a v9 table's self-owned state atoms and the persisted
 * kvs slice (consumed by `DataTable`).
 *
 * The table is NOT controlled via `options.state`: v9 syncs controlled state
 * into its atom graph DURING RENDER (`setOptions` → `syncExternalStateToBaseAtoms`),
 * which makes every keystroke notify mounted `Subscribe` components mid-render —
 * React's "cannot update a component while rendering" warning. Instead the table
 * owns its slices and this hook:
 *
 *  - table → kvs: subscribes to each per-slice atom and mirrors writes into the
 *    persisted map (fires in event handlers / effects, never during render).
 *  - kvs → table: pushes the persisted slice into the table post-hydration, and
 *    whenever an EXTERNAL writer changes it (the inventory ownership toggle via
 *    `useColumnFilterValue`, the map's `useRowSelectionControls`). Ref-equality
 *    guards stop the echo after one round trip.
 *
 * Hydration: the slice lives in localStorage (client-only), so SSR and the first
 * client render use the table's `initialState`; the persisted filters/sorting/
 * sizing restore in the post-mount effect. See `useHydrated`.
 */
export const useDataTableStateSync = <TData extends RowData>(
  table: DataTableInstance<TData>,
  initProps: DataTableStateInitProps,
) => {
  const { tableId } = initProps;
  const hydrated = useHydrated();
  const slice = useAtomValue(tableStateSliceFamily(tableId));
  const setTableState = useAtomSet(tableStateAtom);
  // Stable across renders (populated at table construction), unlike the `table`
  // wrapper `useAppTable` returns — keying the subscription effect on it means
  // subscribe-once instead of per-render churn.
  const atoms = table.atoms;

  // table → kvs. Per-slice subscriptions are spelled out (not looped) because
  // indexing `atoms` by the key union collapses `subscribe` to an uncallable
  // overload union.
  useEffect(() => {
    const mirror = <K extends PersistedKey>(key: K, value: DataTableState[K]) => {
      setTableState((prev) => {
        const prevState = prev[tableId] ?? defaultTableState({ tableId });
        if (prevState[key] === value) return prev;
        return { ...prev, [tableId]: { ...prevState, [key]: value } };
      });
    };
    const subscriptions = [
      atoms.sorting.subscribe(() => mirror('sorting', atoms.sorting.get())),
      atoms.columnFilters.subscribe(() => mirror('columnFilters', atoms.columnFilters.get())),
      atoms.columnVisibility.subscribe(() =>
        mirror('columnVisibility', atoms.columnVisibility.get()),
      ),
      atoms.columnSizing.subscribe(() => mirror('columnSizing', atoms.columnSizing.get())),
      atoms.columnOrder.subscribe(() => mirror('columnOrder', atoms.columnOrder.get())),
      atoms.rowSelection.subscribe(() => mirror('rowSelection', atoms.rowSelection.get())),
    ];
    return () => {
      for (const s of subscriptions) s.unsubscribe();
    };
  }, [atoms, setTableState, tableId]);

  // kvs → table. Runs after every render (the `table` wrapper is per-render fresh),
  // but each pass is six ref compares — a no-op unless kvs and the table diverged.
  useEffect(() => {
    if (!hydrated || !slice) return;
    if (slice.sorting !== atoms.sorting.get()) table.setSorting(slice.sorting);
    if (slice.columnFilters !== atoms.columnFilters.get())
      table.setColumnFilters(slice.columnFilters);
    if (slice.columnVisibility !== atoms.columnVisibility.get())
      table.setColumnVisibility(slice.columnVisibility);
    if (slice.columnSizing !== atoms.columnSizing.get()) table.setColumnSizing(slice.columnSizing);
    if (slice.columnOrder !== atoms.columnOrder.get()) table.setColumnOrder(slice.columnOrder);
    if (slice.rowSelection !== atoms.rowSelection.get()) table.setRowSelection(slice.rowSelection);
  }, [hydrated, slice, atoms, table]);
};

/**
 * Read/write a SINGLE column's filter value for a table, from outside the
 * `DataTable` (e.g. the inventory card's ownership segmented control, which is the
 * UI for the Quantity column's filter). Writes the same `columnFilters` slice the
 * table reads, so the control and the table share one source of truth. Gated on
 * hydration like `useDataTableState` so the control's SSR/first-client render
 * (value `undefined`) matches before the persisted filter restores.
 */
export const useColumnFilterValue = (tableId: TableId, columnId: string) => {
  const hydrated = useHydrated();
  const slice = useAtomValue(tableStateSliceFamily(tableId));
  const setTableState = useAtomSet(tableStateAtom);
  const value = hydrated ? slice?.columnFilters.find((f) => f.id === columnId)?.value : undefined;
  const setValue = (next: unknown) => {
    setTableState((prev) => {
      const prevState = prev[tableId] ?? defaultTableState({ tableId });
      const others = prevState.columnFilters.filter((f) => f.id !== columnId);
      const columnFilters =
        next == null || next === '' ? others : [...others, { id: columnId, value: next }];
      return { ...prev, [tableId]: { ...prevState, columnFilters } };
    });
  };
  return [value, setValue] as const;
};

/** The full per-table state map (e.g. to derive selected map markers). */
export const useTableStateMap = (): TableStateMap => useAtomValue(tableStateAtom);

/** Row-selection controls used outside a single table (e.g. the map section). */
export const useRowSelectionControls = () => {
  const setTableState = useAtomSet(tableStateAtom);

  const setRowSelection =
    (tableId: TableId): OnChangeFn<RowSelectionState> =>
    (updater) => {
      setTableState((prev) => {
        const prevState = prev[tableId] ?? defaultTableState({ tableId });
        const rowSelection =
          typeof updater === 'function' ? updater(prevState.rowSelection) : updater;
        return { ...prev, [tableId]: { ...prevState, rowSelection } };
      });
    };

  const clearAllRowSelection = () => {
    setTableState(
      (prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([id, state]) => [
            id,
            state ? { ...state, rowSelection: {} } : state,
          ]),
        ) as TableStateMap,
    );
  };

  return { setRowSelection, clearAllRowSelection };
};
