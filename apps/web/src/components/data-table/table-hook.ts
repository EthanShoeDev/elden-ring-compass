import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createSortedRowModel,
  createTableHook,
  filterFns,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from '@tanstack/react-table';
import type {
  AppCellContext,
  CellData,
  Column,
  ColumnDef,
  FilterFn,
  Row,
  RowData,
  Table,
} from '@tanstack/react-table';
import type { ComponentType } from 'react';

// TanStack Table v9 treats features as tree-shakeable plugins: only what's registered
// here ships in the bundle. This is the exact set the shared `DataTable` uses — no
// pagination (tables are virtualized, not paged), no grouping/expanding/pinning.
export const dataTableFeatures = tableFeatures({
  columnFacetingFeature, // faceted filter chips (unique-value counts)
  columnFilteringFeature,
  columnOrderingFeature, // header dropdown's move-left/right
  columnResizingFeature, // drag-to-resize grip (`columnResizing` state stays internal)
  columnSizingFeature, // persisted `columnSizing` widths
  columnVisibilityFeature, // View dropdown
  rowSelectionFeature, // pin-on-map column
  rowSortingFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;

// One table hook for the whole app: features + row models declared once, every table
// (sections, inventory, perf test) goes through `useAppTable`/`createAppColumnHelper`
// instead of re-passing them per call site. Row model factories take their fns as
// parameters so unused built-ins tree-shake.
export const { useAppTable, createAppColumnHelper } = createTableHook({
  features: dataTableFeatures,
  rowModels: {
    filteredRowModel: createFilteredRowModel(filterFns),
    sortedRowModel: createSortedRowModel(sortFns),
    facetedRowModel: createFacetedRowModel(),
    facetedUniqueValues: createFacetedUniqueValues(),
  },
});

// Feature-bound aliases so consumers don't thread the `TFeatures` generic everywhere.
export type DataTableColumnDef<
  TData extends RowData,
  TValue extends CellData = CellData,
> = ColumnDef<DataTableFeatures, TData, TValue>;
// `createAppColumnHelper` returns the hook-enhanced `AppColumnHelper` (contexts carry
// pre-bound components), which is not assignable to the core `ColumnHelper` — alias
// the actual return type so shared column-def builders accept it.
export type DataTableColumnHelper<TData extends RowData> = ReturnType<
  typeof createAppColumnHelper<TData>
>;
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>;
export type DataTableInstance<TData extends RowData> = Table<DataTableFeatures, TData>;
export type DataTableColumn<TData extends RowData, TValue extends CellData = CellData> = Column<
  DataTableFeatures,
  TData,
  TValue
>;
// Cell overrides on helper-built columns receive the hook-enhanced context (the
// `cell` carries pre-bound components), not the core `CellContext`. No components
// are registered here, so the last generic stays at its library constraint.
export type DataTableCellContext<
  TData extends RowData,
  TValue extends CellData = CellData,
> = AppCellContext<DataTableFeatures, TData, TValue, Record<string, ComponentType<any>>>;
export type DataTableFilterFn<TData extends RowData> = FilterFn<DataTableFeatures, TData>;
