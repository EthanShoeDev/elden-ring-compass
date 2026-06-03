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
import { useAtom, useAtomSet, useAtomValue } from '@effect/atom-react';
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

/** Per-table state + bound TanStack `onChange` setters (consumed by `DataTable`). */
export const useDataTableState = (initProps: DataTableStateInitProps) => {
  const [tableState, setTableState] = useAtom(tableStateAtom);
  const { tableId } = initProps;
  const current = tableState[tableId] ?? defaultTableState(initProps);

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
