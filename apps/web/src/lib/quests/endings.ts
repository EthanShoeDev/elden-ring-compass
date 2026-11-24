import { Array as Arr, Data } from 'effect';

import type { Slot } from '../save-dto';
import { all, type Cond, type EvalEnv, has, holds, not, world } from './cond';
import { flagFacts, slotFacts } from './facts';
import { QUESTS } from './index';
import { deriveQuests, Outcome, type QuestProgress } from './progress';

/**
 * The game's six endings. Which one you get is decided at the Elden Throne after the final boss,
 * but most must be *secured* beforehand. That means finishing a questline (Ranni) or holding the
 * Mending Rune a questline gives you (Order, Duskborn, Despair). Accepting the Frenzied Flame
 * overrides all of them unless you cure it.
 *
 * Several endings can be secured at once; the throne then offers each one as a choice. Age of
 * Fracture is always available.
 */
export type EndingId =
  | 'fracture'
  | 'order'
  | 'duskborn'
  | 'stars'
  | 'despair'
  | 'frenzied-flame';

export interface Ending {
  readonly id: EndingId;
  readonly name: string;
  /** How to secure it, in plain words. */
  readonly how: string;
  /** The questline that leads to it (its progress drives this ending's status). */
  readonly quest: string | undefined;
  /** Save evidence that the ending is secured. Absent: secured when `quest` is completed. */
  readonly secured?: Cond;
}

/** Flag 108 `狂い火を受領`: the Frenzied Flame was accepted. 116 `狂い火抑え`: it was cured. */
const FRENZIED_FLAME_ACTIVE = all(
  world(108, 'accepted the Frenzied Flame'),
  not(world(116, 'cured the Frenzied Flame')),
);

export const ENDINGS: ReadonlyArray<Ending> = [
  {
    id: 'fracture',
    name: 'Age of Fracture',
    how: 'The default: become Elden Lord without using a Mending Rune.',
    quest: undefined,
    secured: all(),
  },
  {
    id: 'order',
    name: 'Age of Order',
    how: 'Help Brother Corhyn and Goldmask to the end of their questline to receive the Mending Rune of Perfect Order.',
    quest: 'corhyn',
    secured: has(8182, 'Mending Rune of Perfect Order'),
  },
  {
    id: 'duskborn',
    name: 'Age of the Duskborn',
    how: 'Follow Fia’s questline to the end to receive the Mending Rune of the Death-Prince.',
    quest: 'fia',
    secured: has(8183, 'Mending Rune of the Death-Prince'),
  },
  {
    id: 'stars',
    name: 'Age of the Stars',
    how: 'Complete Ranni’s questline. She can then be summoned at the Elden Throne.',
    quest: 'ranni',
  },
  {
    id: 'despair',
    name: 'Blessing of Despair',
    how: 'Follow the Dung Eater’s questline to the end to receive the Mending Rune of the Fell Curse.',
    quest: 'dung-eater',
    secured: has(8184, 'Mending Rune of the Fell Curse'),
  },
  {
    id: 'frenzied-flame',
    name: 'Lord of Frenzied Flame',
    how: 'Accept the Frenzied Flame from the Three Fingers beneath Leyndell. It overrides every other ending unless cured with Miquella’s Needle.',
    quest: 'hyetta',
    secured: FRENZIED_FLAME_ACTIVE,
  },
];

export type EndingState =
  /** You hold what you need: this ending will be offered at the throne. */
  | { readonly _tag: 'Secured' }
  /** Its questline is underway. */
  | {
      readonly _tag: 'InProgress';
      readonly done: number;
      readonly total: number;
      /** The questline's next step(s), in plain words. */
      readonly next: ReadonlyArray<string>;
    }
  /** Nothing has closed it off yet; start its questline. */
  | { readonly _tag: 'Available' }
  /** Its questline can no longer be completed. */
  | { readonly _tag: 'LockedOut'; readonly reason: string }
  /** The Frenzied Flame overrides it until cured with Miquella's Needle. */
  | { readonly _tag: 'Overridden' };

export const EndingState = Data.taggedEnum<EndingState>();

export interface EndingProgress {
  readonly ending: Ending;
  readonly state: EndingState;
}

/** Each ending's status, given the questlines' derived progress. */
export function deriveEndings(
  progress: ReadonlyMap<string, QuestProgress>,
  env: EvalEnv,
): ReadonlyArray<EndingProgress> {
  const frenzied = holds(FRENZIED_FLAME_ACTIVE, env);
  return Arr.map(ENDINGS, (ending) => {
    const p =
      ending.quest === undefined ? undefined : progress.get(ending.quest);
    const state = ((): EndingState => {
      if (frenzied && ending.id !== 'frenzied-flame')
        return EndingState.Overridden();
      const securedNow =
        ending.secured === undefined
          ? p !== undefined && Outcome.$is('Completed')(p.outcome)
          : holds(ending.secured, env);
      if (securedNow) return EndingState.Secured();
      if (p === undefined || p.quest.draft === true)
        return EndingState.Available();
      return Outcome.$match(p.outcome, {
        NotStarted: () => EndingState.Available(),
        // A completed questline whose item isn't held: the rune was used or lost.
        Completed: () => EndingState.Available(),
        InProgress: () =>
          EndingState.InProgress({
            done: p.done,
            total: p.total,
            next: Arr.map(p.next, (s) => s.label),
          }),
        LockedOut: ({ reason }) => EndingState.LockedOut({ reason }),
      });
    })();
    return { ending, state };
  });
}

/** Ending status for `slot` (no save: every ending just "available"). */
export function endingsProgress(
  slot: Readonly<Slot> | undefined,
): ReadonlyArray<EndingProgress> {
  const facts = slot ? slotFacts(slot) : flagFacts();
  const env: EvalEnv = { ...facts, reached: () => false };
  return deriveEndings(deriveQuests(QUESTS, facts), env);
}
