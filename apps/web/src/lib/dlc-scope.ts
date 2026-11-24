// The save-aware half of base game / DLC scoping (see `dlc.ts`): whether the
// selected character has started Shadow of the Erdtree, and the active scope.
import { useAtom } from '@effect/atom-react';
import { useHydrated } from '@tanstack/react-router';
import { Schema } from 'effect';
import { Atom } from 'effect/reactivity';
import { useEffect } from 'react';

import { appRuntime } from '@/lib/atoms/runtime';
import { useEldenRingSave } from '@/lib/atoms/save';
import {
  useSelectedSlot,
  useSlotSelection,
} from '@/stores/slot-selection-store';

import { DlcScope } from './dlc';
import { hasStartedDlc } from './vm/dlc-progress';

// The viewer's explicit choice from the top bar; `null` = follow the save (see
// useDlcScope). Persisted.
const dlcScopeChoiceAtom = Atom.kvs({
  runtime: appRuntime,
  key: 'dlcScope',
  schema: Schema.NullOr(DlcScope),
  defaultValue: () => null,
});

// A scope change made indirectly — a table's Content filter, a realm pick the
// scope hides, the map's realm tabs. It lasts only for the character it was
// made on (`slotKey`) and isn't persisted, so it never stops the top bar from
// following the save; picking in the top bar clears it.
const scopeAdjustmentAtom = Atom.make<{
  slotKey: string;
  scope: DlcScope;
} | null>(null).pipe(Atom.keepAlive);

/**
 * The active content scope. Until the viewer picks one it follows the selected
 * save: base game for a character that hasn't started the DLC, everything
 * otherwise (and with no save loaded).
 */
export function useDlcScope() {
  const slot = useSelectedSlot();
  const [slotIndex] = useSlotSelection();
  const steamId = useEldenRingSave().data?.global_steam_id;
  const slotKey = `${String(steamId)}:${String(slotIndex)}`;
  const [stored, setChoice] = useAtom(dlcScopeChoiceAtom);
  const [adjustment, setAdjustment] = useAtom(scopeAdjustmentAtom);
  // The server can't see the stored choice, so render the automatic scope until
  // hydration and only then apply it — otherwise the first render mismatches.
  const choice = useHydrated() ? stored : null;
  const started = slot === undefined ? undefined : hasStartedDlc(slot);
  const settled: DlcScope = choice ?? (started === false ? 'base' : 'all');
  const active = adjustment?.slotKey === slotKey ? adjustment : null;
  // Switching character drops it for good (coming back follows the save again).
  useEffect(() => {
    if (adjustment !== null && adjustment.slotKey !== slotKey)
      setAdjustment(null);
  }, [adjustment, slotKey, setAdjustment]);
  const scope = active?.scope ?? settled;
  return {
    scope,
    /** `true` while the scope is the save-derived default, not a viewer pick. */
    isAutomatic: choice === null && active === null,
    /** DLC status of the selected character; `undefined` with no save loaded. */
    started,
    /** The top bar: a lasting, persisted choice. */
    setScope: (next: DlcScope | null) => {
      setAdjustment(null);
      setChoice(next);
    },
    /**
     * A table filter or map tab: changes the scope for the current character
     * only, without locking in a choice (see `scopeAdjustmentAtom`).
     */
    adjustScope: (next: DlcScope) =>
      setAdjustment(next === settled ? null : { slotKey, scope: next }),
  };
}
