// The save-aware half of base game / DLC scoping (see `dlc.ts`): whether the
// selected character has started Shadow of the Erdtree, and the active scope.
import { useAtom } from '@effect/atom-react';
import { useHydrated } from '@tanstack/react-router';
import { Schema } from 'effect';
import { Atom } from 'effect/reactivity';

import { appRuntime } from '@/lib/atoms/runtime';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { DlcScope } from './dlc';
import { hasStartedDlc } from './vm/dlc-progress';

// The viewer's explicit choice; `null` = follow the save (see useDlcScope).
const dlcScopeChoiceAtom = Atom.kvs({
  runtime: appRuntime,
  key: 'dlcScope',
  schema: Schema.NullOr(DlcScope),
  defaultValue: () => null,
});

/**
 * The active content scope. Until the viewer picks one it follows the selected
 * save: base game for a character that hasn't started the DLC, everything
 * otherwise (and with no save loaded).
 */
export function useDlcScope() {
  const slot = useSelectedSlot();
  const [stored, setChoice] = useAtom(dlcScopeChoiceAtom);
  // The server can't see the stored choice, so render the automatic scope until
  // hydration and only then apply it — otherwise the first render mismatches.
  const choice = useHydrated() ? stored : null;
  const started = slot === undefined ? undefined : hasStartedDlc(slot);
  const scope: DlcScope = choice ?? (started === false ? 'base' : 'all');
  return {
    scope,
    /** `true` while the scope is the save-derived default, not a viewer pick. */
    isAutomatic: choice === null,
    /** DLC status of the selected character; `undefined` with no save loaded. */
    started,
    setScope: setChoice,
  };
}
