import { GRACES } from '@elden-ring-compass/data';
import {
  Array as Arr,
  Option,
  Order,
  Record as Rec,
  Result,
  String as Str,
} from 'effect';

import type { DlcScope } from '../dlc';
import { inDlcScope } from '../dlc';
import { QUESTS } from './index';
import { flatten, Lock, type Quest, type Step, type Where } from './model';
import {
  type DecisionOption,
  Outcome,
  type QuestProgress,
  StepState,
  Warning,
} from './progress';

/**
 * Presentation helpers for the Quest Compass page: everything the UI derives from `QuestProgress`
 * (warning grouping, wording of locks and deadlines, filters) as plain functions, so it is unit
 * testable without React.
 */

// ── Visibility ─────────────────────────────────────────────────────────────────────────────────

/** Written questlines (drafts hidden) inside the active Base / DLC scope. */
export const isShownQuest = (quest: Quest, scope: DlcScope): boolean =>
  quest.draft !== true && inDlcScope(scope, quest.isDlc);

// ── Outcome filter ─────────────────────────────────────────────────────────────────────────────

export type OutcomeKey = Outcome['_tag'];

export const OUTCOME_LABEL: Record<OutcomeKey, string> = {
  NotStarted: 'Not started',
  InProgress: 'In progress',
  Completed: 'Completed',
  LockedOut: 'Locked out',
};

export const OUTCOME_KEYS: ReadonlyArray<OutcomeKey> = [
  'InProgress',
  'NotStarted',
  'Completed',
  'LockedOut',
];

/** Case-insensitive match on the NPC name (and the quest id, for links). */
export const matchesSearch = (quest: Quest, query: string): boolean => {
  const q = Str.toLowerCase(Str.trim(query));
  return (
    q === '' ||
    Str.includes(q)(Str.toLowerCase(quest.npc)) ||
    Str.includes(q)(quest.id)
  );
};

// ── Wording ────────────────────────────────────────────────────────────────────────────────────

const PATH_LABEL: ReadonlyMap<string, string> = new Map(
  Arr.flatMap(QUESTS, (q) =>
    Arr.map(
      flatten(q.steps).paths,
      (p) => [`${q.id}/${p.id}`, p.label] as const,
    ),
  ),
);

const NPC_OF: ReadonlyMap<string, string> = new Map(
  Arr.map(QUESTS, (q) => [q.id, q.npc] as const),
);

export const npcName = (questId: string): string =>
  NPC_OF.get(questId) ?? questId;

/** What a lock is, as the trigger that closes something: "Defeat Godrick the Grafted". */
export const lockTrigger = (lock: Lock): string =>
  Lock.$match(lock, {
    Gate: ({ gate }) => gate.label,
    Decision: ({ quest, path }) =>
      `Choose “${PATH_LABEL.get(`${quest}/${path}`) ?? path}” (${npcName(quest)})`,
    When: ({ label }) => label,
  });

/**
 * A deadline's trigger as a sentence head. Gates and decisions are imperative ("Burn the
 * Erdtree"), so they read "Before you burn the Erdtree"; free-form conditions keep their wording.
 */
export const beforePhrase = (
  before: string,
  gate: string | undefined,
): string =>
  gate !== undefined || Str.startsWith('Choose ')(before)
    ? `Before you ${Str.uncapitalize(before)}`
    : `Before: ${before}`;

/** A detour's lock as "Closes once you burn the Erdtree". */
export const closesPhrase = (lock: Lock): string =>
  Lock.$is('When')(lock)
    ? `Closes if: ${lock.label}`
    : `Closes once you ${Str.uncapitalize(lockTrigger(lock))}`;

/** Why a locked step can never happen, spelled out. */
export const lockedPhrase = (
  by: StepState & { readonly _tag: 'Locked' },
): string => {
  switch (by.by) {
    case 'gate': {
      return `Closed by: ${by.reason} (already done).`;
    }
    case 'decision': {
      return `Not taken — you ${Str.uncapitalize(by.reason)}.`;
    }
    case 'upstream': {
      return 'Out of reach — the questline ended at an earlier step.';
    }
    case 'condition': {
      return `Closed: ${by.reason}.`;
    }
    case 'ending':
    case 'npc': {
      return `${by.reason}.`;
    }
  }
};

const GRACE_BY_FLAG: ReadonlyMap<
  number,
  { readonly name: string; readonly region: string | null }
> = new Map(Arr.map(GRACES, (g) => [g.flagId, g] as const));

/** Where a step happens: grace name (with region) and/or a free-form note. */
export const whereText = (where: Where | undefined): string | undefined => {
  if (where === undefined) return undefined;
  const grace =
    where.grace === undefined ? undefined : GRACE_BY_FLAG.get(where.grace);
  const graceText =
    grace === undefined
      ? undefined
      : grace.region === null || grace.region === grace.name
        ? grace.name
        : `${grace.name} (${grace.region})`;
  const parts = Arr.filter(
    [graceText, where.note],
    (s): s is string => s !== undefined && s !== '',
  );
  return Arr.isReadonlyArrayNonEmpty(parts)
    ? Arr.join(parts, ' · ')
    : undefined;
};

/** The label of a step id in a questline (falls back to the id). */
export const stepLabel = (quest: Quest, stepId: string): string =>
  Option.match(
    Arr.findFirst(flatten(quest.steps).steps, (s) => s.id === stepId),
    { onNone: () => stepId, onSome: (s) => s.label },
  );

// ── Per-quest summaries ────────────────────────────────────────────────────────────────────────

export const deadlinesOf = (
  p: QuestProgress,
): ReadonlyArray<Warning & { readonly _tag: 'Deadline' }> =>
  Arr.filter(p.warnings, Warning.$is('Deadline'));

export const decisionsOf = (
  p: QuestProgress,
): ReadonlyArray<Warning & { readonly _tag: 'Decision' }> =>
  Arr.filter(p.warnings, Warning.$is('Decision'));

export interface WarningSummary {
  /** Deadlines on steps you can do now, plus open decisions and hostility. */
  readonly active: number;
  /** One of them would end the questline. */
  readonly critical: boolean;
}

export const warningSummary = (p: QuestProgress): WarningSummary => {
  const nowDeadlines = Arr.filter(deadlinesOf(p), (w) => w.now);
  const others = Arr.filter(p.warnings, (w) => !Warning.$is('Deadline')(w));
  return {
    active: nowDeadlines.length + others.length,
    critical:
      Arr.some(nowDeadlines, (w) => w.stakes === 'questline') ||
      Arr.some(others, Warning.$is('Hostile')),
  };
};

// ── "Act now" ──────────────────────────────────────────────────────────────────────────────────

export interface DeadlineStep {
  readonly step: string;
  readonly label: string;
  readonly now: boolean;
  readonly stakes: 'questline' | 'reward';
  readonly reward: string | undefined;
}

/** One questline's steps under one trigger. */
export interface DeadlineEntry {
  readonly quest: Quest;
  readonly steps: ReadonlyArray<DeadlineStep>;
  /** Any of its steps is actionable right now. */
  readonly now: boolean;
  /** Missing it ends the questline (vs. only losing rewards). */
  readonly questline: boolean;
  /** The rewards at stake (detour steps), deduplicated. */
  readonly rewards: ReadonlyArray<string>;
}

/** Every deadline sharing one trigger ("Before you light any Site of Grace in Liurnia"). */
export interface DeadlineGroup {
  readonly key: string;
  readonly heading: string;
  readonly entries: ReadonlyArray<DeadlineEntry>;
  readonly now: boolean;
  readonly questline: boolean;
}

interface Urgent {
  readonly now: boolean;
  readonly questline: boolean;
}

/** Actionable now first, then questline-ending stakes first. */
const urgency = Order.combine(
  Order.mapInput(Order.flip(Order.Boolean), (x: Urgent) => x.now),
  Order.mapInput(Order.flip(Order.Boolean), (x: Urgent) => x.questline),
);

const stepUrgency = Order.combine(
  Order.mapInput(Order.flip(Order.Boolean), (x: DeadlineStep) => x.now),
  Order.mapInput(
    Order.flip(Order.Boolean),
    (x: DeadlineStep) => x.stakes === 'questline',
  ),
);

/**
 * Group every open deadline by its trigger, most urgent first: groups with something to do now,
 * then those that would end a questline. Within a group, one entry per questline.
 */
export const deadlineGroups = (
  progress: ReadonlyArray<QuestProgress>,
): ReadonlyArray<DeadlineGroup> => {
  const flat = Arr.flatMap(progress, (p) =>
    Arr.map(deadlinesOf(p), (w) => ({ p, w })),
  );
  const byTrigger = Arr.groupBy(flat, ({ w }) => w.gate ?? w.before);
  const groups = Arr.map(Rec.toEntries(byTrigger), ([key, items]) => {
    const first = Arr.headNonEmpty(items);
    const byQuest = Arr.groupBy(items, ({ p }) => p.quest.id);
    const entries = Arr.filterMap(
      Arr.map(progress, (p) => p.quest.id),
      (questId): Result.Result<DeadlineEntry, void> => {
        const qs = byQuest[questId];
        if (qs === undefined) return Result.failVoid;
        const head = Arr.headNonEmpty(qs);
        const steps = Arr.sort(
          Arr.dedupeWith(
            Arr.map(qs, ({ w }): DeadlineStep => ({
              step: w.step,
              label: w.stepLabel,
              now: w.now,
              stakes: w.stakes,
              reward: w.reward,
            })),
            (a, b) => a.step === b.step,
          ),
          stepUrgency,
        );
        return Result.succeed({
          quest: head.p.quest,
          steps,
          now: Arr.some(steps, (s) => s.now),
          questline: Arr.some(steps, (s) => s.stakes === 'questline'),
          rewards: Arr.dedupe(
            Arr.filterMap(steps, (s) =>
              s.reward === undefined
                ? Result.failVoid
                : Result.succeed(s.reward),
            ),
          ),
        });
      },
    );
    const sorted = Arr.sort(entries, urgency);
    return {
      key,
      heading: beforePhrase(first.w.before, first.w.gate),
      entries: sorted,
      now: Arr.some(sorted, (e) => e.now),
      questline: Arr.some(sorted, (e) => e.questline),
    };
  });
  return Arr.sort(groups, urgency);
};

/**
 * Split deadlines for the "Up next" panel: `soon` holds only what matters now (a step you can do
 * right now, in a questline you've already started); everything else is `later`.
 */
export const splitDeadlines = (
  progress: ReadonlyArray<QuestProgress>,
): {
  readonly soon: ReadonlyArray<DeadlineGroup>;
  readonly later: ReadonlyArray<DeadlineGroup>;
} => {
  const started = new Set(
    Arr.filterMap(progress, (p) =>
      Outcome.$is('InProgress')(p.outcome)
        ? Result.succeed(p.quest.id)
        : Result.failVoid,
    ),
  );
  const isSoon = (e: DeadlineEntry) => e.now && started.has(e.quest.id);
  const keep = (
    groups: ReadonlyArray<DeadlineGroup>,
    pred: (e: DeadlineEntry) => boolean,
  ): ReadonlyArray<DeadlineGroup> =>
    Arr.filterMap(groups, (g) => {
      const entries = Arr.filter(g.entries, pred);
      return Arr.isReadonlyArrayNonEmpty(entries)
        ? Result.succeed({
            ...g,
            entries,
            now: Arr.some(entries, (e) => e.now),
            questline: Arr.some(entries, (e) => e.questline),
          })
        : Result.failVoid;
    });
  const groups = deadlineGroups(progress);
  return {
    soon: keep(groups, isSoon),
    later: Arr.sort(
      keep(groups, (e) => !isSoon(e)),
      urgency,
    ),
  };
};

export interface PendingDecision {
  readonly quest: Quest;
  readonly choice: string;
  readonly label: string;
  readonly options: ReadonlyArray<DecisionOption>;
}

export const pendingDecisions = (
  progress: ReadonlyArray<QuestProgress>,
): ReadonlyArray<PendingDecision> =>
  Arr.flatMap(progress, (p) =>
    Arr.map(decisionsOf(p), (w) => ({
      quest: p.quest,
      choice: w.choice,
      label: w.label,
      options: w.options,
    })),
  );

export const hostileQuests = (
  progress: ReadonlyArray<QuestProgress>,
): ReadonlyArray<Quest> =>
  Arr.filterMap(progress, (p) =>
    Arr.some(p.warnings, Warning.$is('Hostile'))
      ? Result.succeed(p.quest)
      : Result.failVoid,
  );

export interface NextUp {
  readonly quest: Quest;
  readonly step: Step;
  readonly state: StepState;
}

/** The actionable frontier of every questline already under way (detour steps included). */
export const nextUp = (
  progress: ReadonlyArray<QuestProgress>,
): ReadonlyArray<NextUp> =>
  Arr.flatMap(progress, (p) =>
    Outcome.$is('InProgress')(p.outcome)
      ? Arr.filterMap(p.next, (step) => {
          const state = p.states.get(step.id);
          return state === undefined
            ? Result.failVoid
            : Result.succeed({ quest: p.quest, step, state });
        })
      : [],
  );
