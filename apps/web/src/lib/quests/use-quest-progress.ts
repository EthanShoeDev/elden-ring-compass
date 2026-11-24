import { Array as Arr, Result } from 'effect';
import { useMemo } from 'react';

import { useDlcScope } from '@/lib/dlc-scope';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { type EndingProgress, endingsProgress } from './endings';
import { QUESTS, questProgress } from './index';
import type { QuestProgress } from './progress';
import { isShownQuest } from './view-model';

export interface QuestCompass {
  /** A save slot is loaded; without one every questline is in its blank "guide" state. */
  readonly connected: boolean;
  /** The questlines to show: written (not drafts), in the Base / DLC scope, in display order. */
  readonly shown: ReadonlyArray<QuestProgress>;
  /** The six endings and how close the save is to each. */
  readonly endings: ReadonlyArray<EndingProgress>;
}

/** Questline and ending progress for the selected save slot, filtered for display. */
export function useQuestCompass(): QuestCompass {
  const slot = useSelectedSlot();
  const { scope } = useDlcScope();
  const all = useMemo(() => questProgress(slot), [slot]);
  const endings = useMemo(() => endingsProgress(slot), [slot]);
  const shown = useMemo(
    () =>
      Arr.filterMap(QUESTS, (q) => {
        const p = all.get(q.id);
        return p !== undefined && isShownQuest(q, scope)
          ? Result.succeed(p)
          : Result.failVoid;
      }),
    [all, scope],
  );
  return { connected: slot !== undefined, shown, endings };
}
