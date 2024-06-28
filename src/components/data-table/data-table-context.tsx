/* eslint-disable react-refresh/only-export-components */
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
import { createContext, useContext, useRef } from 'react';
import { createStore, useStore } from 'zustand';
import { persist } from 'zustand/middleware';

type DataTableProviderProps = React.PropsWithChildren<DataTableStoreProps>;

export function DataTableProvider({
  children,
  ...props
}: DataTableProviderProps) {
  const storeRef = useRef<DataTableStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createDataTableStore(props);
  }
  return (
    <DataTableContext.Provider value={storeRef.current}>
      {children}
    </DataTableContext.Provider>
  );
}

export const DataTableContext = createContext<DataTableStore | null>(null);
export type DataTableStoreProps = {
  tableId: string;
  initialColumnVisibility?: VisibilityState;
};

type DataTableState = {
  tableId: string;
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
  columnVisibility: VisibilityState;
  setColumnVisibility: OnChangeFn<VisibilityState>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: OnChangeFn<ColumnFiltersState>;
  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;
  columnSizing: ColumnSizingState;
  setColumnSizing: OnChangeFn<ColumnSizingState>;
  columnOrder: ColumnOrderState;
  setColumnOrder: OnChangeFn<ColumnOrderState>;
};

type DataTableStore = ReturnType<typeof createDataTableStore>;

const handleOnChangeParam = <
  T extends DataTableState[K],
  K extends keyof DataTableState,
>(
  key: K
) => {
  return (
    set: (
      partial:
        | Partial<DataTableState>
        | ((state: DataTableState) => Partial<DataTableState>)
    ) => void,
    get: () => DataTableState
  ) => {
    return (updaterFn: Updater<T>) => {
      if (typeof updaterFn === 'function') {
        const currentState = get()[key];
        set({ [key]: (updaterFn as (old: T) => T)(currentState as T) });
      } else {
        set({ [key]: updaterFn });
      }
    };
  };
};

export const createDataTableStore = (initProps: DataTableStoreProps) => {
  return createStore<DataTableState>()(
    persist(
      (set, get) => ({
        tableId: initProps.tableId,
        columnVisibility: initProps.initialColumnVisibility ?? {},
        rowSelection: {},
        setRowSelection: handleOnChangeParam('rowSelection')(set, get),
        setColumnVisibility: handleOnChangeParam('columnVisibility')(set, get),
        columnFilters: [],
        setColumnFilters: handleOnChangeParam('columnFilters')(set, get),
        sorting: [],
        setSorting: handleOnChangeParam('sorting')(set, get),
        columnSizing: {},
        setColumnSizing: handleOnChangeParam('columnSizing')(set, get),
        columnOrder: [],
        setColumnOrder: handleOnChangeParam('columnOrder')(set, get),
      }),
      {
        name: `data-table-state-${initProps.tableId}`,
      }
    )
  );
};

export function useDataTableContext<T>(
  selector: (state: DataTableState) => T
): T {
  const store = useContext(DataTableContext);
  if (!store) throw new Error('Missing DataTableContext.Provider in the tree');
  return useStore(store, selector);
}
