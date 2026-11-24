import { Array as Arr, Data, Option, Result } from 'effect';

import { type EvalEnv, holds, type SaveFacts } from './cond';
import {
  type Choice,
  type Detour,
  flatten,
  type Flattened,
  Lock,
  type Path,
  type Quest,
  QuestNode,
  type Step,
} from './model';

// ── Derived state ───────────────────────────────────────────────────────────────────────────────

/** Why a step can never be done. */
export type LockKind =
  | 'gate' // world progression passed it by
  | 'decision' // a different path was chosen
  | 'condition' // an authored condition (an NPC died, …)
  | 'upstream' // an earlier required step is locked, so this one is unreachable
  | 'ending' // the questline already ended on another path
  | 'npc'; // the NPC is dead / permanently hostile, or the whole questline is locked

export type StepState =
  /** The save has evidence for this step. */
  | { readonly _tag: 'Done' }
  /** No evidence of its own, but a later step has some, so it must have happened. */
  | { readonly _tag: 'Inferred' }
  /** Next up, and nothing stands in the way. */
  | { readonly _tag: 'Available' }
  /** Next up, but a requirement isn't met yet (it will be). */
  | { readonly _tag: 'Blocked'; readonly needs: ReadonlyArray<string> }
  /** Further down the line: earlier steps come first. */
  | { readonly _tag: 'Upcoming' }
  /** Permanently impossible. */
  | { readonly _tag: 'Locked'; readonly by: LockKind; readonly reason: string }
  /** Behind the player's progress (a passed detour step, or a fork's path) and unprovable. */
  | { readonly _tag: 'Unknown' };

export const StepState = Data.taggedEnum<StepState>();

/** Done, or inferred done. */
export const isFinished = (s: StepState | undefined): boolean =>
  s !== undefined && (StepState.$is('Done')(s) || StepState.$is('Inferred')(s));

/** Actionable now: `Available`, or `Blocked` on a requirement that will come. */
export const isFrontier = (s: StepState | undefined): boolean =>
  s !== undefined &&
  (StepState.$is('Available')(s) || StepState.$is('Blocked')(s));

/** Locked by a choice (here or the ending of another path): off the player's route. */
const isOffRoute = (s: StepState): boolean =>
  StepState.$is('Unknown')(s) ||
  (StepState.$is('Locked')(s) && (s.by === 'decision' || s.by === 'ending'));

export type Outcome =
  | { readonly _tag: 'NotStarted' }
  | { readonly _tag: 'InProgress' }
  | { readonly _tag: 'Completed'; readonly ending: string | undefined }
  /** Can never be completed: a required step is locked, or the NPC is gone. */
  | {
      readonly _tag: 'LockedOut';
      readonly reason: string;
      readonly step: string | undefined;
    };

export const Outcome = Data.taggedEnum<Outcome>();

/** Something the player can still lose. Raised only while the questline is still open. */
export type Warning =
  /** "Do `step` before you `before`", or it's gone for good. */
  | {
      readonly _tag: 'Deadline';
      readonly quest: string;
      readonly step: string;
      readonly stepLabel: string;
      readonly before: string;
      /** Shared gate id, so the UI can group every warning for the same trigger. */
      readonly gate: string | undefined;
      /** Missing it ends the questline, or only costs `reward`. */
      readonly stakes: 'questline' | 'reward';
      readonly reward: string | undefined;
      /** The step is actionable right now (vs. further down the line). */
      readonly now: boolean;
    }
  /** The player is at a fork: each option and what it closes off. */
  | {
      readonly _tag: 'Decision';
      readonly quest: string;
      readonly choice: string;
      readonly label: string;
      readonly options: ReadonlyArray<DecisionOption>;
    }
  | { readonly _tag: 'Hostile'; readonly quest: string };

export const Warning = Data.taggedEnum<Warning>();

export interface DecisionOption {
  readonly path: string;
  readonly label: string;
  readonly ending: string | undefined;
  /** What taking this path closes: the sibling paths, and steps in other questlines. */
  readonly locks: ReadonlyArray<string>;
}

export interface QuestProgress {
  readonly quest: Quest;
  readonly outcome: Outcome;
  /** By step id. Every step has exactly one state. */
  readonly states: ReadonlyMap<string, StepState>;
  /** Choice id → the path taken (absent while undecided or when the save can't tell). */
  readonly chosen: ReadonlyMap<string, string>;
  /** The actionable frontier: steps that are `Available` or `Blocked`. */
  readonly next: ReadonlyArray<Step>;
  readonly warnings: ReadonlyArray<Warning>;
  /** Required steps on the player's route that are done or inferred, out of `total`. */
  readonly done: number;
  readonly total: number;
}

// ── Registry-level derivation ───────────────────────────────────────────────────────────────────

interface Indexed {
  readonly quest: Quest;
  readonly flat: Flattened;
  readonly stepById: ReadonlyMap<string, Step>;
  readonly pathById: ReadonlyMap<string, Path>;
}

const indexQuest = (quest: Quest): Indexed => {
  const flat = flatten(quest.steps);
  return {
    quest,
    flat,
    stepById: new Map(Arr.map(flat.steps, (s) => [s.id, s] as const)),
    pathById: new Map(Arr.map(flat.paths, (p) => [p.id, p] as const)),
  };
};

type DerivedProgress = QuestProgress & {
  readonly reached: ReadonlySet<string>;
};

/** How a lock reads once it has fired ("Chose …") and as a warning before it fires ("Choose …"). */
interface LockText {
  readonly by: LockKind;
  readonly reason: string;
  readonly before: string;
}

/**
 * Derive every questline's progress from one save. Cross-questline references (`Reached`,
 * `Lock.Decision`) resolve against the other questline's *derived* state, computed lazily; a
 * reference cycle falls back to that step's raw evidence instead of recursing forever.
 */
export function deriveQuests(
  quests: ReadonlyArray<Quest>,
  facts: SaveFacts,
): ReadonlyMap<string, QuestProgress> {
  const index = new Map(Arr.map(quests, (q) => [q.id, indexQuest(q)] as const));
  const results = new Map<string, DerivedProgress>();
  const inFlight = new Set<string>();

  const rawEvidence = (questId: string, id: string): boolean => {
    const ix = index.get(questId);
    if (!ix) return false;
    const s = ix.stepById.get(id);
    if (s) return stepHasEvidence(s, env);
    const p = ix.pathById.get(id);
    return p ? seqHasEvidence(p.steps, env) : false;
  };

  const env: EvalEnv = {
    ...facts,
    reached: (questId, id) =>
      inFlight.has(questId)
        ? rawEvidence(questId, id)
        : (get(questId)?.reached.has(id) ?? false),
  };

  /** Everything decision `pathId` of `questId` closes in *other* questlines. */
  const crossLocks = (questId: string, pathId: string): Array<string> =>
    Arr.flatMap([...index.values()], ({ quest, flat }) =>
      quest.id === questId
        ? []
        : Arr.filterMap(flat.steps, (s) =>
            Arr.some(
              flat.locksOf.get(s.id) ?? [],
              (l) =>
                Lock.$is('Decision')(l) &&
                l.quest === questId &&
                l.path === pathId,
            )
              ? Result.succeed(`${quest.npc}: ${s.label}`)
              : Result.failVoid,
          ),
    );

  const describeLock = (lock: Lock): LockText =>
    Lock.$match(lock, {
      Gate: ({ gate }) => ({
        by: 'gate' as const,
        reason: gate.label,
        before: gate.label,
      }),
      Decision: ({ quest, path }) => {
        const ix = index.get(quest);
        const what = `“${ix?.pathById.get(path)?.label ?? path}” (${ix?.quest.npc ?? quest})`;
        return {
          by: 'decision' as const,
          reason: `Chose ${what}`,
          before: `Choose ${what}`,
        };
      },
      When: ({ label, happened }) => ({
        by: 'condition' as const,
        reason: happened ?? label,
        before: label,
      }),
    });

  const get = (questId: string): DerivedProgress | undefined => {
    const cached = results.get(questId);
    if (cached) return cached;
    const ix = index.get(questId);
    if (!ix) return undefined;
    inFlight.add(questId);
    const progress = deriveOne(ix, env, describeLock, crossLocks);
    inFlight.delete(questId);
    results.set(questId, progress);
    return progress;
  };

  return new Map(
    Arr.filterMap(quests, (q) => {
      const p = get(q.id);
      return p ? Result.succeed([q.id, p] as const) : Result.failVoid;
    }),
  );
}

// ── One questline ───────────────────────────────────────────────────────────────────────────────

const stepHasEvidence = (s: Step, env: EvalEnv): boolean =>
  s.done !== undefined && holds(s.done, env);

const nodeHasEvidence = (node: QuestNode, env: EvalEnv): boolean =>
  QuestNode.$match(node, {
    Step: (s) => stepHasEvidence(s, env),
    Choice: (c) => Arr.some(c.paths, (p) => seqHasEvidence(p.steps, env)),
    // Independent both ways: doing a side detour proves nothing about the main line around it.
    Detour: () => false,
  });

const seqHasEvidence = (
  nodes: ReadonlyArray<QuestNode>,
  env: EvalEnv,
): boolean => Arr.some(nodes, (n) => nodeHasEvidence(n, env));

const lockFires = (lock: Lock, env: EvalEnv): boolean =>
  Lock.$match(lock, {
    Gate: ({ gate }) => holds(gate.cond, env),
    Decision: ({ quest, path }) => env.reached(quest, path),
    When: ({ cond }) => holds(cond, env),
  });

/** The first locked required step of a sequence that can therefore never complete. */
interface Lockout {
  readonly step: string;
  readonly reason: string;
}

interface SeqResult {
  /** Every required node in the sequence is done or inferred. */
  readonly complete: boolean;
  readonly ending: string | undefined;
  readonly lockout: Lockout | undefined;
}

const OPEN: SeqResult = {
  complete: true,
  ending: undefined,
  lockout: undefined,
};

function deriveOne(
  ix: Indexed,
  env: EvalEnv,
  describeLock: (lock: Lock) => LockText,
  crossLocks: (questId: string, pathId: string) => Array<string>,
): DerivedProgress {
  const { quest, flat } = ix;
  const states = new Map<string, StepState>();
  const chosen = new Map<string, string>();
  const frontierChoices: Array<Choice> = [];

  const markAll = (nodes: ReadonlyArray<QuestNode>, state: StepState) => {
    for (const s of flatten(nodes).steps) states.set(s.id, state);
  };

  const deriveStep = (
    s: Step,
    implied: boolean,
    reachable: boolean,
    upstream: Lockout | undefined,
  ): StepState => {
    if (stepHasEvidence(s, env)) return StepState.Done();
    if (implied) return StepState.Inferred();
    const fired = Arr.findFirst(flat.locksOf.get(s.id) ?? [], (l) =>
      lockFires(l, env),
    );
    if (Option.isSome(fired)) {
      // An optional step the save can't track may well have been done before it closed (a
      // co-op summon, a side fight): "can't tell" is honest, "locked" would be a false loss.
      if (s.done === undefined && flat.detourOf.has(s.id))
        return StepState.Unknown();
      const { by, reason } = describeLock(fired.value);
      return StepState.Locked({ by, reason });
    }
    if (upstream)
      return StepState.Locked({
        by: 'upstream',
        reason: `Unreachable: “${ix.stepById.get(upstream.step)?.label ?? upstream.step}” is locked`,
      });
    if (!reachable) return StepState.Upcoming();
    const needs = Arr.filterMap(s.requires ?? [], (r) =>
      holds(r.cond, env) ? Result.failVoid : Result.succeed(r.label),
    );
    return Arr.isReadonlyArrayNonEmpty(needs)
      ? StepState.Blocked({ needs })
      : StepState.Available();
  };

  const walkChoice = (
    c: Choice,
    implied: boolean,
    reachable: boolean,
    upstream: Lockout | undefined,
  ): SeqResult => {
    const taken = Arr.filter(c.paths, (p) => seqHasEvidence(p.steps, env));
    const [first] = taken;
    if (first === undefined) {
      if (implied) {
        // Something after the fork happened, so a path was taken, but the save can't say which.
        for (const p of c.paths) markAll(p.steps, StepState.Unknown());
        return OPEN;
      }
      const results = Arr.map(c.paths, (p) =>
        walk(p.steps, false, reachable, upstream),
      );
      if (reachable && !upstream) frontierChoices.push(c);
      const allLocked = Arr.every(results, (r) => r.lockout !== undefined);
      return {
        complete: false,
        ending: undefined,
        lockout: allLocked ? results[0]?.lockout : undefined,
      };
    }
    chosen.set(c.id, first.id);
    for (const p of c.paths) {
      if (!Arr.contains(taken, p))
        markAll(
          p.steps,
          StepState.Locked({
            by: 'decision',
            reason: `Chose “${first.label}”`,
          }),
        );
    }
    const r = walk(first.steps, implied, reachable, upstream);
    return {
      complete: r.complete,
      ending: r.complete ? (first.ending ?? r.ending) : undefined,
      lockout: r.lockout,
    };
  };

  const walkDetour = (
    d: Detour,
    passed: boolean,
    reachable: boolean,
    upstream: Lockout | undefined,
  ): void => {
    // Main-line progress never implies a detour: walk it as its own sequence.
    walk(d.steps, false, reachable, upstream);
    if (!passed) return;
    // The main line has moved past it. Steps with no evidence to check can't be told apart from
    // skipped ones.
    for (const s of flatten(d.steps).steps) {
      const state = states.get(s.id);
      if (
        s.done === undefined &&
        state !== undefined &&
        (StepState.$is('Available')(state) || StepState.$is('Upcoming')(state))
      )
        states.set(s.id, StepState.Unknown());
    }
  };

  /**
   * Walk one sequence in order. `impliedAfter`: something after this whole sequence has
   * evidence. `open`: everything required before it is finished.
   */
  const walk = (
    nodes: ReadonlyArray<QuestNode>,
    impliedAfter: boolean,
    open: boolean,
    upstreamIn: Lockout | undefined,
  ): SeqResult => {
    // laterEvidence[i]: something after node i (in this sequence, or after it) has evidence.
    const laterEvidence = Arr.map(
      nodes,
      (_, i) => impliedAfter || seqHasEvidence(Arr.drop(nodes, i + 1), env),
    );
    let reachable = open;
    let complete = true;
    let ending: string | undefined;
    let lockout: Lockout | undefined;
    let upstream = upstreamIn;

    const fail = (r: Lockout | undefined) => {
      complete = false;
      if (r !== undefined && lockout === undefined) {
        lockout = r;
        upstream ??= r;
      }
    };

    Arr.forEach(nodes, (node, i) => {
      if (ending !== undefined) {
        markAll(
          [node],
          StepState.Locked({
            by: 'ending',
            reason: `Questline ended: ${ending}`,
          }),
        );
        return;
      }
      const implied = laterEvidence[i] ?? false;
      QuestNode.$match(node, {
        // A detour never blocks, completes or locks out the main line.
        Detour: (d) => walkDetour(d, implied, reachable, upstream),
        Step: (s) => {
          const state = deriveStep(s, implied, reachable, upstream);
          states.set(s.id, state);
          if (isFinished(state)) return;
          fail(
            StepState.$is('Locked')(state)
              ? { step: s.id, reason: state.reason }
              : undefined,
          );
          // The save can never confirm an untracked step, so it doesn't hide the one after it:
          // both show as next, and the follower's evidence will confirm this one.
          const untracked =
            s.done === undefined && StepState.$is('Available')(state);
          if (!untracked) reachable = false;
        },
        Choice: (c) => {
          const r = walkChoice(c, implied, reachable, upstream);
          if (r.complete) {
            ending = r.ending;
            return;
          }
          reachable = false;
          fail(r.lockout);
        },
      });
    });
    return { complete, ending, lockout };
  };

  const root = walk(quest.steps, false, true, undefined);

  // ── Outcome ──
  const flagOn = (id: number | undefined) => id !== undefined && env.flag(id);
  const questLock = Arr.findFirst(quest.lockedBy ?? [], (l) =>
    lockFires(l, env),
  );
  // A death or turn the story itself causes (after `diesAfter`) is expected, not a lockout.
  const diesAfter = quest.status?.diesAfter;
  const scriptedEnd =
    diesAfter !== undefined && isFinished(states.get(diesAfter));
  const npcGone =
    !scriptedEnd && flagOn(quest.status?.dead)
      ? `${quest.npc} is dead`
      : !scriptedEnd && flagOn(quest.status?.hostilePermanent)
        ? `${quest.npc} is permanently hostile`
        : Option.getOrUndefined(
            Option.map(questLock, (l) => describeLock(l).reason),
          );

  const outcome: Outcome = root.complete
    ? Outcome.Completed({ ending: root.ending })
    : npcGone !== undefined
      ? Outcome.LockedOut({ reason: npcGone, step: undefined })
      : root.lockout
        ? Outcome.LockedOut({
            reason: root.lockout.reason,
            step: root.lockout.step,
          })
        : Arr.some([...states.values()], isFinished)
          ? Outcome.InProgress()
          : Outcome.NotStarted();

  if (npcGone !== undefined && !root.complete) {
    for (const [id, s] of states) {
      if (!isFinished(s) && !StepState.$is('Locked')(s))
        states.set(id, StepState.Locked({ by: 'npc', reason: npcGone }));
    }
  }

  // ── Warnings (only while the questline is still open) ──
  const stillOpen =
    Outcome.$is('NotStarted')(outcome) || Outcome.$is('InProgress')(outcome);
  const warnings: Array<Warning> = [];
  if (stillOpen) {
    for (const s of flat.steps) {
      const state = states.get(s.id);
      const pending =
        isFrontier(state) ||
        (state !== undefined && StepState.$is('Upcoming')(state));
      if (!pending) continue;
      // Nobody needs a warning before they "miss" a bad ending.
      if (flat.pathOf.get(s.id)?.failure === true) continue;
      const inDetour = flat.detourOf.get(s.id);
      for (const lock of flat.locksOf.get(s.id) ?? []) {
        if (lockFires(lock, env)) continue;
        warnings.push(
          Warning.Deadline({
            quest: quest.id,
            step: s.id,
            stepLabel: s.label,
            before: describeLock(lock).before,
            gate: Lock.$is('Gate')(lock) ? lock.gate.id : undefined,
            stakes: inDetour ? 'reward' : 'questline',
            reward: inDetour?.reward,
            now: isFrontier(state),
          }),
        );
      }
    }
    for (const c of frontierChoices) {
      warnings.push(
        Warning.Decision({
          quest: quest.id,
          choice: c.id,
          label: c.label,
          options: Arr.map(c.paths, (p) => ({
            path: p.id,
            label: p.label,
            ending: p.ending,
            locks: [
              ...Arr.filterMap(c.paths, (other) =>
                other === p
                  ? Result.failVoid
                  : Result.succeed(`“${other.label}”`),
              ),
              ...crossLocks(quest.id, p.id),
            ],
          })),
        }),
      );
    }
    if (flagOn(quest.status?.hostile))
      warnings.push(Warning.Hostile({ quest: quest.id }));
  }

  // ── Summary ──
  const onRoute = Arr.filter(flat.steps, (s) => {
    const state = states.get(s.id);
    return (
      !flat.detourOf.has(s.id) && state !== undefined && !isOffRoute(state)
    );
  });

  return {
    quest,
    outcome,
    states,
    chosen,
    next: Arr.filter(flat.steps, (s) => isFrontier(states.get(s.id))),
    warnings,
    done: Arr.filter(onRoute, (s) => isFinished(states.get(s.id))).length,
    total: onRoute.length,
    reached: new Set([
      ...Arr.filterMap([...states], ([id, s]) =>
        isFinished(s) ? Result.succeed(id) : Result.failVoid,
      ),
      ...chosen.values(),
    ]),
  };
}
