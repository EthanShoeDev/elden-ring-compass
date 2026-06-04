import {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnSizingState,
  OnChangeFn,
  RowSelectionState,
  SortingState,
  Updater,
  VisibilityState,
} from '@tanstack/react-table';
import { Schema } from 'effect';
import { Atom } from 'effect/unstable/reactivity';
import { useAtomSet, useAtomValue } from '@effect/atom-react';
import { useMemo } from 'react';
import { browserKvsRuntime } from '@/lib/atoms/kvs';
import { InventoryTableType } from '../sections/inventory-data-table-card';

export type TableId = 'events' | 'regions' | 'weapons' | InventoryTableType;

export type DataTableStateInitProps = {
  tableId: TableId;
  initialColumnVisibility?: VisibilityState;
  initialRowSelection?: RowSelectionState;
};

export type DataTableState = {
  tableId: TableId;
  rowSelection: RowSelectionState;
  columnVisibility: VisibilityState;
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

const tableStateAtom = Atom.kvs({
  runtime: browserKvsRuntime,
  key: 'data-table-state',
  schema: Schema.Record(Schema.String, DataTableStateSchema),
  defaultValue: () => ({}),
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

/** Per-table state + bound TanStack `onChange` setters (consumed by `DataTable`). */
export const useDataTableState = (initProps: DataTableStateInitProps) => {
  const { tableId } = initProps;
  const slice = useAtomValue(tableStateSliceFamily(tableId));
  const setTableState = useAtomSet(tableStateAtom);
  // Stable fallback for a table with no persisted state yet. Memoizing is load-bearing: an
  // un-memoized `defaultTableState(...)` returns fresh `[]`/`{}` every render, so react-table sees
  // `state.sorting`/`columnFilters`/… change identity each render and fires `autoResetPageIndex`
  // → a queued setState → re-render → new arrays → a continuous re-render loop (~60fps) that pegs
  // the main thread whenever a save is loaded. That loop — not the parse, map, or facets — is what
  // made the page sluggish/freeze/OOM.
  const fallback = useMemo(() => defaultTableState(initProps), [tableId]);
  const current = slice ?? fallback;

  const makeSetter =
    <K extends keyof DataTableState>(key: K): OnChangeFn<DataTableState[K]> =>
    (updater: Updater<DataTableState[K]>) => {
      setTableState((prev) => {
        const prevState = prev[tableId] ?? defaultTableState({ tableId });
        const value =
          typeof updater === 'function'
            ? (updater as (old: DataTableState[K]) => DataTableState[K])(prevState[key])
            : updater;
        return { ...prev, [tableId]: { ...prevState, [key]: value } };
      });
    };

  return {
    ...current,
    setRowSelection: makeSetter('rowSelection'),
    setColumnVisibility: makeSetter('columnVisibility'),
    setColumnFilters: makeSetter('columnFilters'),
    setSorting: makeSetter('sorting'),
    setColumnSizing: makeSetter('columnSizing'),
    setColumnOrder: makeSetter('columnOrder'),
  };
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
