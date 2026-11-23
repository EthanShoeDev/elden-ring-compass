// Base game vs Shadow of the Erdtree scoping (issue #12) — the pure part. Every
// boss, grace and item carries an install-derived `isDlc`; a scope decides which
// of them the tables, completion totals and map quick-selects show. The
// save-aware default lives in `dlc-scope.ts`.
import { Schema } from 'effect';

export const DlcScope = Schema.Literals(['base', 'dlc', 'all']);
export type DlcScope = typeof DlcScope.Type;

export const DLC_SCOPE_LABEL: Record<DlcScope, string> = {
  base: 'Base game',
  dlc: 'Shadow of the Erdtree',
  all: 'All content',
};

/** Whether a row with this `isDlc` belongs in `scope`. */
export const inDlcScope = (scope: DlcScope, isDlc: boolean) =>
  scope === 'all' || (scope === 'dlc') === isDlc;
