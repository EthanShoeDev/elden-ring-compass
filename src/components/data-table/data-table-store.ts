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
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { InventoryTableType } from '../sections/inventory-data-table-card';

const defaultTableState = (props: DataTableStateInitProps) => ({
  tableId: props.tableId,
  columnVisibility: props.initialColumnVisibility ?? {},
  rowSelection: props.initialRowSelection ?? {},
  columnFilters: [],
  sorting: [],
  columnSizing: {},
  columnOrder: [],
});

const handleOnChangeParam = <
  T extends DataTableState[K],
  K extends keyof DataTableState,
>(
  key: K,
  set: (fn: (state: DataTableStore) => Partial<DataTableStore>) => void
) => {
  return (tableId: TableId) => {
    const childSet = (
      fn: (state: DataTableState) => Partial<DataTableState>
    ) => {
      set((state) => ({
        tableState: {
          ...state.tableState,
          [tableId]: {
            ...state.tableState[tableId],
            ...fn(state.tableState[tableId] ?? defaultTableState({ tableId })),
          } as DataTableState,
        },
      }));
    };

    return (updaterFn: Updater<T>) => {
      if (typeof updaterFn === 'function') {
        childSet((state) => ({
          [key]: (updaterFn as (old: T) => T)(state[key] as T),
        }));
      } else {
        childSet(() => ({ [key]: updaterFn }));
      }
    };
  };
};

export type TableId = 'events' | 'regions' | InventoryTableType;

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

type DataTableStore = {
  setTableState: (state: Record<TableId, DataTableState | undefined>) => void;
  tableState: Record<TableId, DataTableState | undefined>;
  clearAllRowSelection: () => void;
  setColumnVisibility: (tableId: TableId) => OnChangeFn<VisibilityState>;
  setColumnFilters: (tableId: TableId) => OnChangeFn<ColumnFiltersState>;
  setColumnSizing: (tableId: TableId) => OnChangeFn<ColumnSizingState>;
  setSorting: (tableId: TableId) => OnChangeFn<SortingState>;
  setRowSelection: (tableId: TableId) => OnChangeFn<RowSelectionState>;
  setColumnOrder: (tableId: TableId) => OnChangeFn<ColumnOrderState>;
};

export const useDataTableStore = create<DataTableStore>()(
  persist(
    (set, get) => ({
      setTableState: (state) => {
        set({ tableState: state });
      },
      tableState: {} as Record<TableId, DataTableState | undefined>,
      clearAllRowSelection: () => {
        console.log('clearAllRowSelection', get().tableState);
        set((state) => ({
          tableState: Object.fromEntries(
            Object.entries(state.tableState).map(([tableId, tableState]) => [
              tableId as TableId,
              {
                ...tableState,
                rowSelection: {},
              } as DataTableState,
            ])
          ) as Record<TableId, DataTableState | undefined>,
        }));
      },
      setRowSelection: handleOnChangeParam('rowSelection', set),
      setColumnVisibility: handleOnChangeParam('columnVisibility', set),
      setColumnFilters: handleOnChangeParam('columnFilters', set),
      setSorting: handleOnChangeParam('sorting', set),
      setColumnSizing: handleOnChangeParam('columnSizing', set),
      setColumnOrder: handleOnChangeParam('columnOrder', set),
    }),
    {
      name: 'data-table-store',
    }
  )
);

export const useDataTableState = (initProps: DataTableStateInitProps) => {
  const store = useDataTableStore();

  if (!store.tableState[initProps.tableId]) {
    store.setTableState({
      ...store.tableState,
      [initProps.tableId]: defaultTableState(initProps),
    });
  }

  return {
    ...(store.tableState[initProps.tableId] ?? defaultTableState(initProps)),
    setRowSelection: store.setRowSelection(initProps.tableId),
    setColumnVisibility: store.setColumnVisibility(initProps.tableId),
    setColumnFilters: store.setColumnFilters(initProps.tableId),
    setSorting: store.setSorting(initProps.tableId),
    setColumnSizing: store.setColumnSizing(initProps.tableId),
    setColumnOrder: store.setColumnOrder(initProps.tableId),
  };
};
