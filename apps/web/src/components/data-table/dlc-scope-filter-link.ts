import { useHydrated } from '@tanstack/react-router';
import type { ColumnFiltersState, RowData } from '@tanstack/react-table';
import { Array as Arr, Option } from 'effect';
import { useEffect, useRef } from 'react';

import { DLC_SCOPE_LABEL, type DlcScope, inDlcScope } from '@/lib/dlc';
import { useDlcScope } from '@/lib/dlc-scope';

import { CONTENT_COLUMN_ID } from './common-column-defs';
import { type TableId, useColumnFiltersState } from './data-table-store';
import type { DataTableInstance } from './table-hook';

const CONTENT = CONTENT_COLUMN_ID;

/** The Content filter value that shows exactly `scope`. */
const scopeToFilter = (scope: DlcScope): string[] | undefined =>
  scope === 'all' ? undefined : [DLC_SCOPE_LABEL[scope]];

/** The scope a Content filter value shows (none or both picked = everything). */
const filterToScope = (value: unknown): DlcScope => {
  if (!Arr.isArray(value)) return 'all';
  const base = value.includes(DLC_SCOPE_LABEL.base);
  const dlc = value.includes(DLC_SCOPE_LABEL.dlc);
  return base === dlc ? 'all' : base ? 'base' : 'dlc';
};

/** A row's facet values per column, and whether it's DLC content. */
type ScopedRow = {
  isDlc: boolean;
  values: (columnId: string) => readonly unknown[];
};

/** Values column `columnId` takes on rows inside `scope`. */
const valuesInScope = (
  rows: readonly ScopedRow[],
  columnId: string,
  scope: DlcScope,
): ReadonlySet<unknown> => {
  const out = new Set<unknown>();
  for (const r of rows)
    if (inDlcScope(scope, r.isDlc))
      for (const v of r.values(columnId)) out.add(v);
  return out;
};

/**
 * The filters that follow the scope: ones describing WHERE content is (a Land of
 * Shadow realm, a DLC map). Save-state columns (Status, Discovered, Defeated…)
 * must not: "Owned" with nothing owned in the DLC is a correct empty table, not
 * a reason to widen the scope, and narrowing the scope mustn't drop it.
 */
const SCOPE_LINKED_COLUMNS: ReadonlySet<string> = new Set(['Realm', 'Map']);
const linkedFilters = (filters: ColumnFiltersState) =>
  Arr.filter(
    filters,
    (f) => SCOPE_LINKED_COLUMNS.has(f.id) && Arr.isArray(f.value),
  );

/** A stable key for the linked picks, to notice when the viewer changes them. */
const picksKeyOf = (filters: ColumnFiltersState) =>
  Arr.join(
    Arr.map(linkedFilters(filters), (f) =>
      Arr.isArray(f.value)
        ? `${f.id}=${Arr.join(Arr.map(f.value, String), '|')}`
        : f.id,
    ),
    '&',
  );

/**
 * Links a table's Content filter to the global base game / DLC scope (the top
 * bar control), so they're one setting, and keeps the Realm / Map filters
 * consistent with it — no state where a pick silently empties the table:
 *
 *  - scope changes (top bar, or this table's Content filter) → the Content
 *    filter follows, and Realm / Map picks with no rows left in the new scope
 *    are dropped (Base drops a Land of Shadow realm or a DLC map);
 *  - Content filter changes → the scope follows, everywhere;
 *  - picking a realm / map only out-of-scope rows have → the scope widens to
 *    all content instead of showing an empty table.
 *
 * On mount it also drops persisted filters for columns the table no longer has
 * or can't filter (e.g. the removed Location column) — they'd be invisible,
 * yet keep "Reset" showing.
 *
 * The rows themselves are never cut to the scope, so every filter always lists
 * every option. Whichever side changed since the last pass wins; on mount the
 * global scope does (a table's persisted filters may be stale).
 */
export function useDlcScopeFilterLink<TData extends RowData>(
  table: DataTableInstance<TData>,
  tableId: TableId,
) {
  const hydrated = useHydrated();
  // `adjustScope`, not `setScope`: a filter-driven change lasts for this
  // character only and doesn't stop the top bar from following the save.
  const { scope, adjustScope } = useDlcScope();
  const hasContent = Arr.some(
    table.getAllLeafColumns(),
    (c) => c.id === CONTENT,
  );
  const [filters, setFilters] = useColumnFiltersState(tableId);
  const contentScope = filterToScope(
    Option.getOrUndefined(Arr.findFirst(filters ?? [], (f) => f.id === CONTENT))
      ?.value,
  );
  const picksKey = picksKeyOf(filters ?? []);
  const seen = useRef<{
    scope: DlcScope;
    contentScope: DlcScope;
    picksKey: string;
  } | null>(null);

  useEffect(() => {
    if (!hydrated || !hasContent || filters === undefined) return;
    const filterable = new Set(
      Arr.map(
        Arr.filter(table.getAllLeafColumns(), (c) => c.getCanFilter()),
        (c) => c.id,
      ),
    );
    const rows: ScopedRow[] = Arr.map(table.getCoreRowModel().rows, (r) => ({
      isDlc: (r.original as { isDlc?: boolean }).isDlc === true,
      // `undefined` for a column the table doesn't have.
      values: (id) => r.getUniqueValues<unknown>(id) ?? [],
    }));
    const prev = seen.current;
    seen.current = { scope, contentScope, picksKey };

    if (prev === null || prev.scope !== scope) {
      // Scope → filters: Content mirrors it; out-of-scope realm / map picks
      // are dropped (and, on mount, filters no column can apply).
      const content = scopeToFilter(scope);
      setFilters((current) => {
        const next: ColumnFiltersState = [];
        for (const f of current) {
          if (f.id === CONTENT || !filterable.has(f.id)) continue;
          if (!SCOPE_LINKED_COLUMNS.has(f.id) || !Arr.isArray(f.value)) {
            next.push(f);
            continue;
          }
          const live = valuesInScope(rows, f.id, scope);
          const kept = Arr.filter(f.value, (v) => live.has(v));
          if (kept.length === f.value.length) next.push(f);
          else if (kept.length > 0) next.push({ ...f, value: kept });
        }
        const currentContent = Option.getOrUndefined(
          Arr.findFirst(current, (f) => f.id === CONTENT),
        );
        const unchanged =
          filterToScope(currentContent?.value) === scope &&
          next.length + (currentContent ? 1 : 0) === current.length &&
          Arr.every(next, (f) => current.includes(f));
        if (unchanged) return current;
        return content === undefined
          ? next
          : [...next, { id: CONTENT, value: content }];
      });
    } else if (prev.contentScope !== contentScope) {
      // Content filter → scope.
      if (contentScope !== scope) adjustScope(contentScope);
    } else if (prev.picksKey !== picksKey) {
      // A realm / map only out-of-scope rows have → widen rather than empty
      // the table.
      const outOfScope = Arr.some(linkedFilters(filters), (f) => {
        const live = valuesInScope(rows, f.id, scope);
        const anywhere = valuesInScope(rows, f.id, 'all');
        return (
          Arr.isArray(f.value) &&
          Arr.some(f.value, (v) => !live.has(v) && anywhere.has(v))
        );
      });
      if (outOfScope && scope !== 'all') adjustScope('all');
    }
  });
}
