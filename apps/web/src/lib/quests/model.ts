import { Data } from 'effect';

import { type Cond, flag } from './cond';
import type { Gate } from './gates';

/**
 * Questline model. Every NPC questline is authored the same way: a **sequence of nodes**, which
 * mirrors a community flowchart column top to bottom. A node is one of:
 *
 * - `Step`: one box. Required: the questline can't continue without it.
 * - `Choice`: a diamond, splitting into exclusive `Path`s (each itself a sequence).
 * - `Detour`: the dotted "missable" box. An ordered side-sequence that the main line doesn't need
 *   (a side reward, extra dialogue), usually with a lock that closes it.
 *
 * Ordering is implicit: a node follows whatever came before it in its sequence. Four ideas carry
 * the whole model:
 *
 * 1. **Evidence, then inference.** A step's `done` is the save evidence that it happened. Many
 *    steps leave no lasting trace (a one-off conversation), so a step also counts as done when
 *    anything *after* it in its sequence has evidence. Wrong flag? Fix that one step's `done`.
 *    World progression (bosses, burning the Erdtree) is never evidence. It happens with or
 *    without the questline, so it's a `requires`, not a step.
 * 2. **Locks are first-class.** A step can be permanently closed by progressing the world
 *    (`Lock.Gate`: you lit a Liurnia grace), by a decision (`Lock.Decision`: you took another path,
 *    here or in another questline), or by an ad-hoc condition (`Lock.When`: an NPC died). A locked
 *    required step locks out the whole questline. A locked detour only loses its reward. The same
 *    data drives the warnings *before* it happens ("do this before …").
 * 3. **Choices are exclusive.** Taking one path locks its siblings. A path that ends in an
 *    `ending` finishes the questline there.
 * 4. **Detours never block and are never inferred.** Main-line progress says nothing about
 *    whether a side reward was collected. Skipping it is exactly what's possible.
 */

export type StepKind = 'talk' | 'action' | 'event' | 'boss' | 'item';

/**
 * How sure we are about a step's `done` evidence. `script`: the game's event scripts / flag names
 * confirm it. `observed`: a community flag log saw it change. `assumed`: our best guess — verify
 * against a real save before trusting it.
 */
export type Evidence = 'script' | 'observed' | 'assumed';

/** Something that permanently closes a step (or a whole questline) once it happens. */
export type Lock =
  | { readonly _tag: 'Gate'; readonly gate: Gate }
  /** Another path was taken — in this questline or another (`quest`). */
  | {
      readonly _tag: 'Decision';
      readonly quest: string;
      readonly path: string;
    }
  | {
      readonly _tag: 'When';
      readonly cond: Cond;
      /** Reads as the thing to avoid: "Do this before <label>" ("Gowry dies", "Kill Yura"). */
      readonly label: string;
      /** Past tense, once it has happened ("Yura was killed"). Defaults to `label`. */
      readonly happened: string | undefined;
    };

export const Lock = Data.taggedEnum<Lock>();

/** A precondition: the step can't be done yet, but will become possible. */
export interface Requirement {
  readonly cond: Cond;
  readonly label: string;
}

export interface Where {
  /** A Site of Grace flag id (`GRACES.flagId`), so the step can be pinned on the map. */
  readonly grace?: number;
  readonly note?: string;
}

export interface Step {
  readonly _tag: 'Step';
  /** Stable kebab-case id, unique within the questline (tests and cross-quest refs use it). */
  readonly id: string;
  /** Our own wording — never copied from a guide. */
  readonly label: string;
  readonly kind: StepKind;
  /** Save evidence that this step happened. Absent: only ever inferred from later steps. */
  readonly done?: Cond;
  readonly evidence?: Evidence;
  readonly requires?: ReadonlyArray<Requirement>;
  readonly lockedBy?: ReadonlyArray<Lock>;
  /**
   * The save flag for this step isn't known yet. Describe the in-game action to record in a
   * save-flag diff (docs/projects/future/save-flag-diff-checkpoints.md) to find it, e.g. "talk to
   * Hewg after Godrick dies; the flag that flips". Listed by `knownGaps()`.
   */
  readonly flagTodo?: string;
  /**
   * Items this step gives you: EXACT in-game names as they appear in the inventory catalog
   * ("Spirit Jellyfish Ashes", "Curtsy", "Crimson Hood"), so the UI can show each one's icon and
   * wiki page. A test rejects names that don't resolve.
   */
  readonly rewards?: ReadonlyArray<string>;
  /**
   * Non-item things this step opens up, in plain words: a service ("Spirit Tuning"), a shop
   * ("Boc’s armor alterations"), an ending ("The Age of the Stars ending"), a summon.
   */
  readonly unlocks?: ReadonlyArray<string>;
  readonly where?: Where;
  /** Rest at a grace / reload the area after this step for the next one to appear. */
  readonly reload?: boolean;
  readonly note?: string;
}

export interface Path {
  /** Unique within the questline; also what a `Lock.Decision` references. */
  readonly id: string;
  readonly label: string;
  readonly steps: ReadonlyArray<QuestNode>;
  /** Taking this path to its end finishes the questline with this ending. */
  readonly ending?: string;
  /**
   * A bad outcome (the NPC ends up a puppet, dies, is betrayed): still shown as an option, but
   * nothing warns you that you might "lose" it.
   */
  readonly failure?: boolean;
}

export interface Choice {
  readonly _tag: 'Choice';
  readonly id: string;
  readonly label: string;
  readonly paths: ReadonlyArray<Path>;
}

export interface Detour {
  readonly _tag: 'Detour';
  readonly id: string;
  readonly label: string;
  readonly steps: ReadonlyArray<QuestNode>;
  /** Closes every step inside (in addition to each step's own locks). */
  readonly lockedBy?: ReadonlyArray<Lock>;
  /**
   * What the player loses if it gets locked, shown verbatim ("Missed: …"). Name the concrete item
   * ("Crimson Hood"), or say what kind of content it is and that no item is lost ("Her Stormhill
   * Shack dialogue (dialogue only, no item)").
   */
  readonly reward: string;
}

export type QuestNode = Step | Choice | Detour;

export const QuestNode = Data.taggedEnum<QuestNode>();

/** The NPC's status block (`EFID_Talk_NPCnnn` ids nnn0–nnn3). */
export interface StatusFlags {
  readonly alive: number;
  /** Hostile but absolvable (Church of Vows). */
  readonly hostile: number;
  readonly hostilePermanent: number;
  readonly dead: number;
  /**
   * The NPC dies, or turns permanently hostile for a scripted fight, as part of their own story
   * once this step is reached (Thops, Rogier, Irina, Ymir, …): from then on "dead" / "permanently
   * hostile" is the expected outcome, not a lockout.
   */
  readonly diesAfter?: string;
}

export interface Quest {
  readonly id: string;
  readonly npc: string;
  readonly isDlc: boolean;
  readonly blurb: string;
  readonly status?: StatusFlags;
  /** The NPC's one-hot event-state flags (exactly one is on at a time), in story order. */
  readonly stages: Readonly<Record<string, number>>;
  readonly steps: ReadonlyArray<QuestNode>;
  /** Whole-questline lockouts beyond the NPC's status (dead / permanently hostile). */
  readonly lockedBy?: ReadonlyArray<Lock>;
  /** Where the steps and flags came from, for whoever fixes them next. */
  readonly sources: ReadonlyArray<string>;
  /** Not written yet: a placeholder so the registry is complete. The UI hides drafts. */
  readonly draft?: boolean;
}

/** Every node of a questline in authoring (top-to-bottom) order, plus per-step structure. */
export interface Flattened {
  readonly steps: ReadonlyArray<Step>;
  readonly paths: ReadonlyArray<Path>;
  readonly choices: ReadonlyArray<Choice>;
  readonly detours: ReadonlyArray<Detour>;
  /** Step id → the innermost detour containing it (absent: the step is required). */
  readonly detourOf: ReadonlyMap<string, Detour>;
  /** Step id → the innermost choice path containing it (absent: not inside a choice). */
  readonly pathOf: ReadonlyMap<string, Path>;
  /** Step id → every lock that closes it: its own plus those of each enclosing detour. */
  readonly locksOf: ReadonlyMap<string, ReadonlyArray<Lock>>;
}

export const flatten = (nodes: ReadonlyArray<QuestNode>): Flattened => {
  const steps: Array<Step> = [];
  const paths: Array<Path> = [];
  const choices: Array<Choice> = [];
  const detours: Array<Detour> = [];
  const detourOf = new Map<string, Detour>();
  const pathOf = new Map<string, Path>();
  const locksOf = new Map<string, ReadonlyArray<Lock>>();
  const visit = (
    seq: ReadonlyArray<QuestNode>,
    detour: Detour | undefined,
    inherited: ReadonlyArray<Lock>,
  ): void => {
    for (const node of seq) {
      QuestNode.$match(node, {
        Step: (s) => {
          steps.push(s);
          if (detour) detourOf.set(s.id, detour);
          locksOf.set(s.id, [...inherited, ...(s.lockedBy ?? [])]);
        },
        Choice: (c) => {
          choices.push(c);
          for (const p of c.paths) {
            paths.push(p);
            visit(p.steps, detour, inherited);
          }
        },
        Detour: (d) => {
          detours.push(d);
          visit(d.steps, d, [...inherited, ...(d.lockedBy ?? [])]);
        },
      });
    }
  };
  visit(nodes, undefined, []);
  for (const p of paths)
    for (const s of flatten(p.steps).steps)
      if (!pathOf.has(s.id)) pathOf.set(s.id, p);
  return { steps, paths, choices, detours, detourOf, pathOf, locksOf };
};

// ── Builders ────────────────────────────────────────────────────────────────────────────────────

type StepOptions = Omit<Step, '_tag' | 'id' | 'label'>;

export const step = (
  id: string,
  label: string,
  options: StepOptions,
): QuestNode => QuestNode.Step({ id, label, ...options });

export const choice = (
  id: string,
  label: string,
  paths: ReadonlyArray<Path>,
): QuestNode => QuestNode.Choice({ id, label, paths });

export const detour = (
  id: string,
  label: string,
  options: Omit<Detour, '_tag' | 'id' | 'label' | 'steps'>,
  steps: ReadonlyArray<QuestNode>,
): QuestNode => QuestNode.Detour({ id, label, steps, ...options });

export const path = (
  id: string,
  label: string,
  steps: ReadonlyArray<QuestNode>,
  options: { readonly ending?: string; readonly failure?: boolean } = {},
): Path => ({ id, label, steps, ...options });

export const lockedByGate = (gate: Gate): Lock => Lock.Gate({ gate });
export const lockedByDecision = (quest: string, pathId: string): Lock =>
  Lock.Decision({ quest, path: pathId });
export const lockedWhen = (
  cond: Cond,
  label: string,
  happened?: string,
): Lock => Lock.When({ cond, label, happened });
export const needsGate = (gate: Gate): Requirement => ({
  cond: gate.cond,
  label: gate.label,
});

/** The status block starting at `base` (alive, hostile, hostile-permanent, dead). */
export const statusBlock = (base: number): StatusFlags => ({
  alive: base,
  hostile: base + 1,
  hostilePermanent: base + 2,
  dead: base + 3,
});

/**
 * Define a questline. `stages` is typed into the step builder so `stage('spiritTuner')` is checked
 * at compile time — a renamed or misspelled stage is a type error, not a silently-false flag.
 */
export const defineQuest = <const S extends string>(
  def: Omit<Quest, 'steps' | 'stages'> & {
    readonly stages: Readonly<Record<S, number>>;
  },
  steps: (helpers: {
    readonly stage: (name: S) => Cond;
  }) => ReadonlyArray<QuestNode>,
): Quest => ({
  ...def,
  steps: steps({
    stage: (name) => flag(def.stages[name], 'stage', name),
  }),
});
