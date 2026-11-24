import { Array as Arr, Data } from 'effect';

/**
 * What a flag means, for the debug view and for invariant tests (e.g. `stage` ids must sit inside
 * the quest's event-state block). Purely descriptive — evaluation treats every kind the same.
 */
export type FlagKind =
  | 'talk' // persistent "this dialogue has played" flag (会話用フラグ)
  | 'stage' // the NPC's one-hot event-state flag (イベント状態)
  | 'status' // alive / hostile / dead (キャラ状態フラグ)
  | 'boss' // boss defeat flag
  | 'grace' // Site of Grace lit
  | 'world' // world progression (Erdtree burned, any Liurnia grace lit, …)
  | 'pickup' // a treasure / item-lot pickup flag
  | 'gesture'; // gesture unlocked (carries into NG+: never sole evidence)

/**
 * A condition over the save: the evidence that a step happened, the trigger that locks one out, or
 * a precondition. Plain data — not closures — so it can be evaluated, explained flag-by-flag in a
 * debug view, and statically checked (every flag id addressable, every cross-quest reference
 * resolves) in tests. That is what makes a wrong step *fixable*: you can see exactly which flag
 * disagreed with the save.
 */
export type Cond =
  | {
      readonly _tag: 'Flag';
      readonly id: number;
      readonly kind: FlagKind;
      readonly label?: string | undefined;
    }
  | {
      readonly _tag: 'Has';
      readonly goodId: number;
      readonly label: string;
      /** Hold at least this many (default 1). */
      readonly atLeast: number;
    }
  /** A step (or a choice's path) in some questline has been reached — done, inferred, or taken. */
  | { readonly _tag: 'Reached'; readonly quest: string; readonly id: string }
  | { readonly _tag: 'Not'; readonly cond: Cond }
  | { readonly _tag: 'All'; readonly conds: ReadonlyArray<Cond> }
  | { readonly _tag: 'Any'; readonly conds: ReadonlyArray<Cond> };

export const Cond = Data.taggedEnum<Cond>();

/** The raw save facts a condition reads. */
export interface SaveFacts {
  readonly flag: (id: number) => boolean;
  /** How many of a good (Goods param id) the character holds. */
  readonly goodCount: (goodId: number) => number;
}

/** Save facts plus cross-quest resolution (`Reached`), supplied by the progress derivation. */
export interface EvalEnv extends SaveFacts {
  readonly reached: (quest: string, id: string) => boolean;
}

export const holds = (cond: Cond, env: EvalEnv): boolean =>
  Cond.$match(cond, {
    Flag: ({ id }) => env.flag(id),
    Has: ({ goodId, atLeast }) => env.goodCount(goodId) >= atLeast,
    Reached: ({ quest, id }) => env.reached(quest, id),
    Not: ({ cond: inner }) => !holds(inner, env),
    All: ({ conds }) => Arr.every(conds, (c) => holds(c, env)),
    Any: ({ conds }) => Arr.some(conds, (c) => holds(c, env)),
  });

/** A condition evaluated node-by-node — the debug view's "why is this step (not) done?". */
export interface Explained {
  readonly text: string;
  readonly holds: boolean;
  readonly children: ReadonlyArray<Explained>;
}

export const explain = (cond: Cond, env: EvalEnv): Explained => {
  const leaf = (text: string): Explained => ({
    text,
    holds: holds(cond, env),
    children: [],
  });
  return Cond.$match(cond, {
    Flag: ({ id, kind, label }) =>
      leaf(`${kind} flag ${id}${label === undefined ? '' : ` (${label})`}`),
    Has: ({ goodId, label, atLeast }) =>
      leaf(`has ${atLeast > 1 ? `${atLeast}× ` : ''}${label} (good ${goodId})`),
    Reached: ({ quest, id }) => leaf(`reached ${quest} › ${id}`),
    Not: ({ cond: inner }) => ({
      text: 'not',
      holds: holds(cond, env),
      children: [explain(inner, env)],
    }),
    All: ({ conds }) => ({
      text: 'all of',
      holds: holds(cond, env),
      children: Arr.map(conds, (c) => explain(c, env)),
    }),
    Any: ({ conds }) => ({
      text: 'any of',
      holds: holds(cond, env),
      children: Arr.map(conds, (c) => explain(c, env)),
    }),
  });
};

/** Every leaf of a condition, for invariant tests (addressable flags, resolvable references). */
export const leaves = (
  cond: Cond,
): ReadonlyArray<Exclude<Cond, { _tag: 'Not' | 'All' | 'Any' }>> =>
  Cond.$match(cond, {
    Flag: (c) => [c],
    Has: (c) => [c],
    Reached: (c) => [c],
    Not: ({ cond: inner }) => leaves(inner),
    All: ({ conds }) => Arr.flatMap(conds, leaves),
    Any: ({ conds }) => Arr.flatMap(conds, leaves),
  });

// ── Builders ────────────────────────────────────────────────────────────────────────────────────

export const flag = (id: number, kind: FlagKind, label?: string): Cond =>
  Cond.Flag({ id, kind, label });
export const talk = (id: number, label?: string): Cond =>
  flag(id, 'talk', label);
export const pickup = (id: number, label?: string): Cond =>
  flag(id, 'pickup', label);
export const boss = (defeatFlagId: number, label?: string): Cond =>
  flag(defeatFlagId, 'boss', label);
export const world = (id: number, label?: string): Cond =>
  flag(id, 'world', label);
export const has = (goodId: number, label: string, atLeast = 1): Cond =>
  Cond.Has({ goodId, label, atLeast });
export const reached = (quest: string, id: string): Cond =>
  Cond.Reached({ quest, id });
export const not = (cond: Cond): Cond => Cond.Not({ cond });
export const all = (...conds: ReadonlyArray<Cond>): Cond => Cond.All({ conds });
export const any = (...conds: ReadonlyArray<Cond>): Cond => Cond.Any({ conds });
