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
  filterFn_arrIncludes,
  filterFn_equals,
  filterFn_inDateRange,
  filterFn_includesString,
  filterFn_inNumberRange,
  filterFn_weakEquals,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
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

// TanStack Table v9 treats features as tree-shakeable plugins: only what's registered
// here ships in the bundle. This is the exact set the shared `DataTable` uses — no
// pagination (tables are virtualized, not paged), no grouping/expanding/pinning.
// Row-model factories and the filter/sort fn registries are slots on the same
// object (v9 stable moved them off `createTableHook`); the registries decide which
// string `filterFn`/`sortingFn` names (and the `'auto'` resolution) are valid.
// Registered: every fn table-core's `'auto'` resolution can pick
// (column_getAutoFilterFn / column_getAutoSortFn), which also covers the only
// string name columns use (`'includesString'`).
const dataTableFeatures = tableFeatures({
  columnFacetingFeature, // faceted filter chips (unique-value counts)
  columnFilteringFeature,
  columnOrderingFeature, // header dropdown's move-left/right
  columnResizingFeature, // drag-to-resize grip (`columnResizing` state stays internal)
  columnSizingFeature, // persisted `columnSizing` widths
  columnVisibilityFeature, // View dropdown
  rowSelectionFeature, // pin-on-map column
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns: {
    arrIncludes: filterFn_arrIncludes,
    equals: filterFn_equals,
    inDateRange: filterFn_inDateRange,
    includesString: filterFn_includesString,
    inNumberRange: filterFn_inNumberRange,
    weakEquals: filterFn_weakEquals,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

export type DataTableFeatures = typeof dataTableFeatures;

// One table hook for the whole app: features + row models declared once, every table
// (sections, inventory, perf test) goes through `useAppTable`/`createAppColumnHelper`
// instead of re-passing them per call site.
export const { useAppTable, createAppColumnHelper } = createTableHook({
  features: dataTableFeatures,
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
> = AppCellContext<DataTableFeatures, TData, TValue, Record<never, never>>;
export type DataTableFilterFn<TData extends RowData> = FilterFn<DataTableFeatures, TData>;
