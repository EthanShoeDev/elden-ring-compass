import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { eventFlagOffset } from '@elden-ring-compass/data';
import {
  Array as Arr,
  Effect,
  Record as Rec,
  Schema,
  SchemaGetter,
  SchemaTransformation,
  String as Str,
} from 'effect';
import { describe, expect } from 'vitest';

import { readFixtureSave } from '@/test/fixture-save';

import { parseEldenRingData } from '../er-save-parser';
import { Cond, leaves } from './cond';
import { GATES } from './gates';
import { knownGaps, questProgress, QUESTS } from './index';
import { flatten, Lock, type Quest } from './model';
import { Outcome, type QuestProgress, StepState, Warning } from './progress';
import { rewardItem } from './rewards';

// Invariants over every authored questline, then a golden snapshot against the fixture save.

const lockConds = (lock: Lock): ReadonlyArray<Cond> =>
  Lock.$match(lock, {
    Gate: ({ gate }) => [gate.cond],
    When: ({ cond }) => [cond],
    Decision: () => [],
  });

/** Every condition a questline mentions, labeled by where it appears. */
const condsOf = (q: Quest) => {
  const flat = flatten(q.steps);
  return Arr.flatMap(flat.steps, (s) => [
    ...(s.done ? [{ at: `${s.id}.done`, cond: s.done }] : []),
    ...Arr.map(s.requires ?? [], (r) => ({
      at: `${s.id}.requires`,
      cond: r.cond,
    })),
    ...Arr.flatMap(flat.locksOf.get(s.id) ?? [], (l) =>
      Arr.map(lockConds(l), (cond) => ({ at: `${s.id}.lockedBy`, cond })),
    ),
  ]);
};

const flagIds = (cond: Cond): ReadonlyArray<number> =>
  Arr.flatMap(leaves(cond), (c) => (Cond.$is('Flag')(c) ? [c.id] : []));

const GATE_FLAGS = new Set(
  Arr.flatMap(Rec.values(GATES), (g) => flagIds(g.cond)),
);

describe.each(Arr.map(QUESTS, (q) => [q.id, q] as const))(
  'questline %s',
  (_, q) => {
    const flat = flatten(q.steps);
    const ids = Arr.map(
      [...flat.steps, ...flat.paths, ...flat.choices, ...flat.detours],
      (n) => n.id,
    );

    it('has unique step / path / choice / detour ids', () => {
      expect(Arr.filter(ids, (id, i) => ids.indexOf(id) !== i)).toEqual([]);
    });

    it('only uses addressable event flags', () => {
      const status: ReadonlyArray<number> = q.status
        ? [
            q.status.alive,
            q.status.hostile,
            q.status.hostilePermanent,
            q.status.dead,
          ]
        : [];
      const flags = [
        ...Rec.values(q.stages),
        ...status,
        ...Arr.flatMap(condsOf(q), ({ cond }) => flagIds(cond)),
      ];
      expect(
        Arr.filter(flags, (id) => eventFlagOffset(id) === undefined),
      ).toEqual([]);
    });

    it('keeps its stages inside the NPC’s event-state block', () => {
      const base = q.status?.alive;
      if (base === undefined) return;
      const outside = Arr.filter(
        Rec.toEntries(q.stages),
        ([, id]) => id < base + 5 || id > base + 19,
      );
      expect(outside).toEqual([]);
    });

    it('never uses world progression as evidence of a step', () => {
      // A shared gate (a boss, burning the Erdtree) happens whether or not the player did this
      // questline, so as `done` evidence it would wrongly infer every earlier step.
      const misuse = Arr.filter(
        condsOf(q),
        ({ at, cond }) =>
          Str.endsWith('.done')(at) &&
          Arr.some(
            leaves(cond),
            (c) =>
              Cond.$is('Flag')(c) &&
              (c.kind === 'world' || GATE_FLAGS.has(c.id)),
          ),
      );
      expect(Arr.map(misuse, ({ at }) => at)).toEqual([]);
    });

    it('only references questlines and steps that exist', () => {
      const known = new Map(
        Arr.map(QUESTS, (other) => {
          const f = flatten(other.steps);
          return [
            other.id,
            new Set(Arr.map([...f.steps, ...f.paths], (n) => n.id)),
          ] as const;
        }),
      );
      const refs = [
        ...Arr.flatMap(condsOf(q), ({ cond }) =>
          Arr.flatMap(leaves(cond), (c) =>
            Cond.$is('Reached')(c) ? [{ quest: c.quest, id: c.id }] : [],
          ),
        ),
        ...Arr.flatMap(flat.steps, (s) =>
          Arr.flatMap(flat.locksOf.get(s.id) ?? [], (l) =>
            Lock.$is('Decision')(l) ? [{ quest: l.quest, id: l.path }] : [],
          ),
        ),
      ];
      expect(
        Arr.filter(refs, (ref) => known.get(ref.quest)?.has(ref.id) !== true),
      ).toEqual([]);
    });

    it('marks how sure each piece of evidence is', () => {
      const unmarked = Arr.filter(
        flat.steps,
        (s) => s.done !== undefined && s.evidence === undefined,
      );
      expect(Arr.map(unmarked, (s) => s.id)).toEqual([]);
    });

    it('names reward items exactly as the inventory catalog does', () => {
      const unknown = Arr.flatMap(flat.steps, (s) =>
        Arr.filter(s.rewards ?? [], (name) => rewardItem(name) === undefined),
      );
      expect(unknown).toEqual([]);
    });
  },
);

it('a blank save starts every questline', () => {
  for (const p of questProgress(undefined).values()) {
    expect(Outcome.$is('NotStarted')(p.outcome)).toBe(true);
    expect(p.next.length).toBeGreaterThan(0);
  }
});

it('lists every unknown or unverified flag as the save-diff tool’s work queue', () => {
  const gaps = knownGaps();
  const steps = new Map(
    Arr.map(
      QUESTS,
      (q) =>
        [q.id, new Set(Arr.map(flatten(q.steps).steps, (s) => s.id))] as const,
    ),
  );
  // Each gap points at a real step, and every flagTodo says what to record.
  expect(
    Arr.filter(gaps, (g) => steps.get(g.quest)?.has(g.step) !== true),
  ).toEqual([]);
  expect(
    Arr.filter(
      gaps,
      (g) => g.kind === 'flag-todo' && Str.isEmpty(Str.trim(g.detail)),
    ),
  ).toEqual([]);
  expect(gaps.length).toBeGreaterThan(0);
});

/** A readable digest of one questline's progress, for the golden snapshot. */
const digest = (p: QuestProgress) => ({
  outcome: Outcome.$match(p.outcome, {
    NotStarted: () => 'NotStarted',
    InProgress: () => 'InProgress',
    Completed: ({ ending }) =>
      `Completed${ending === undefined ? '' : `: ${ending}`}`,
    LockedOut: ({ reason }) => `LockedOut: ${reason}`,
  }),
  progress: `${p.done}/${p.total}`,
  steps: Rec.fromEntries(
    Arr.map([...p.states], ([id, s]) => [
      id,
      StepState.$is('Locked')(s) ? `Locked (${s.by}): ${s.reason}` : s._tag,
    ]),
  ),
  warnings: Arr.map(p.warnings, (w) =>
    Warning.$match(w, {
      Deadline: ({ step, before }) => `${step} before: ${before}`,
      Decision: ({ choice }) => `decide: ${choice}`,
      Hostile: () => 'hostile',
    }),
  ),
});

// `Schema.fromJsonString` always encodes compactly; rebuild it with `space: 2` so snapshot diffs
// read line by line (same pattern as the extractor's images stage).
const PrettyJson = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Unknown,
    new SchemaTransformation.Transformation<unknown, string>(
      SchemaGetter.parseJson(),
      SchemaGetter.stringifyJson({ space: 2 }),
    ),
  ),
);

// One snapshot file per questline (`__snapshots__/fixture/<id>.json`), so questlines can be
// written and re-snapshotted independently: `vitest run src/lib/quests -t "fixture <id>" -u`.
// Review every diff by hand: it's what the real save says about the questline.
const progressBySlot = Effect.gen(function* () {
  const buffer = yield* readFixtureSave;
  const save = parseEldenRingData(buffer);
  const named = Arr.filter(
    save.slots,
    (s) => s.player_game_data.character_name.length > 0,
  );
  return Arr.map(
    named,
    (slot) =>
      [slot.player_game_data.character_name, questProgress(slot)] as const,
  );
}).pipe(Effect.cached, Effect.runSync);

it.layer(NodeServices.layer)('questlines on the fixture save', (it) => {
  for (const q of QUESTS) {
    if (q.draft === true) continue;
    it.effect(`fixture ${q.id}`, () =>
      Effect.gen(function* () {
        const slots = yield* progressBySlot;
        const summary = Rec.fromEntries(
          Arr.flatMap(slots, ([name, all]) => {
            const p = all.get(q.id);
            return p ? [[name, digest(p)] as const] : [];
          }),
        );
        const json = yield* Schema.encodeEffect(PrettyJson)(summary);
        yield* Effect.promise(() =>
          expect(`${json}\n`).toMatchFileSnapshot(
            `./__snapshots__/fixture/${q.id}.json`,
          ),
        );
      }),
    );
  }
});
