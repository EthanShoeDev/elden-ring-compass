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
  return (tableId: string) => {
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

export type DataTableStateInitProps = {
  tableId: string;
  initialColumnVisibility?: VisibilityState;
  initialRowSelection?: RowSelectionState;
};

export type DataTableState = {
  tableId: string;
  rowSelection: RowSelectionState;
  columnVisibility: VisibilityState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  columnSizing: ColumnSizingState;
  columnOrder: ColumnOrderState;
};

type DataTableStore = {
  setTableState: (state: Record<string, DataTableState | undefined>) => void;
  tableState: Record<string, DataTableState | undefined>;
  clearAllRowSelection: () => void;
  setColumnVisibility: (tableId: string) => OnChangeFn<VisibilityState>;
  setColumnFilters: (tableId: string) => OnChangeFn<ColumnFiltersState>;
  setColumnSizing: (tableId: string) => OnChangeFn<ColumnSizingState>;
  setSorting: (tableId: string) => OnChangeFn<SortingState>;
  setRowSelection: (tableId: string) => OnChangeFn<RowSelectionState>;
  setColumnOrder: (tableId: string) => OnChangeFn<ColumnOrderState>;
};

export const useDataTableStore = create<DataTableStore>()(
  persist(
    (set, get) => ({
      setTableState: (state) => {
        set({ tableState: state });
      },
      tableState: {},
      clearAllRowSelection: () => {
        console.log('clearAllRowSelection', get().tableState);
        set((state) => ({
          tableState: Object.fromEntries(
            Object.entries(state.tableState).map(([tableId, tableState]) => [
              tableId,
              {
                ...tableState,
                rowSelection: {},
              } as DataTableState,
            ])
          ),
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
