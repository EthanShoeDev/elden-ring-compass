import { Array as Arr, Record as Rec } from 'effect';
import { describe, expect, it } from 'vitest';

import { all, flag, has, not, reached, talk } from './cond';
import { flagFacts } from './facts';
import type { Gate } from './gates';
import {
  choice,
  defineQuest,
  detour,
  lockedByDecision,
  lockedByGate,
  lockedWhen,
  path,
  statusBlock,
  step,
} from './model';
import {
  deriveQuests,
  type QuestProgress,
  StepState,
  Warning,
} from './progress';

// Synthetic questlines exercising each rule of the model, independent of real game flags.

const SHORTCUT: Gate = {
  id: 'shortcut',
  label: 'Take the shortcut',
  cond: flag(900, 'world'),
};
const BOSS = { cond: flag(800, 'boss'), label: 'Beat the boss' };

const alpha = defineQuest(
  {
    id: 'alpha',
    npc: 'Alpha',
    isDlc: false,
    blurb: '',
    status: statusBlock(100),
    stages: { initial: 105 },
    sources: [],
  },
  () => [
    step('a1', 'Meet Alpha', { kind: 'talk', done: talk(1) }),
    step('a2', 'Untracked chat', { kind: 'talk' }),
    detour(
      'hat',
      'The hat',
      { lockedBy: [lockedByGate(SHORTCUT)], reward: 'Hat' },
      [
        step('h1', 'Find the hat', { kind: 'item', done: talk(3) }),
        step('h2', 'Show Alpha the hat', { kind: 'talk', done: talk(7) }),
      ],
    ),
    step('a4', 'Report the boss', {
      kind: 'talk',
      done: talk(4),
      requires: [BOSS],
    }),
    choice('c1', 'Whose side?', [
      path('good', 'Side with Alpha', [
        step('g1', 'Help Alpha', { kind: 'action', done: talk(10) }),
        step('g2', 'Thank Alpha', { kind: 'talk', done: talk(11) }),
      ]),
      path(
        'bad',
        'Betray Alpha',
        [step('b1', 'Betray', { kind: 'action', done: talk(20) })],
        { ending: 'Betrayal' },
      ),
    ]),
    step('a5', 'Farewell', { kind: 'talk', done: talk(5) }),
  ],
);

const beta = defineQuest(
  {
    id: 'beta',
    npc: 'Beta',
    isDlc: false,
    blurb: '',
    stages: {},
    sources: [],
  },
  () => [
    step('x1', 'Ask Beta about Alpha', {
      kind: 'talk',
      done: talk(50),
      lockedBy: [lockedByDecision('alpha', 'bad')],
    }),
    step('x2', 'Beta leaves', { kind: 'event', done: talk(51) }),
  ],
);

const gamma = defineQuest(
  {
    id: 'gamma',
    npc: 'Gamma',
    isDlc: false,
    blurb: '',
    stages: {},
    sources: [],
  },
  () => [
    step('s1', 'Catch Gamma before the shortcut', {
      kind: 'talk',
      done: talk(60),
      lockedBy: [lockedByGate(SHORTCUT)],
    }),
    step('s2', 'Finish', { kind: 'talk', done: talk(61) }),
  ],
);

const derive = (...on: ReadonlyArray<number>) =>
  deriveQuests([alpha, beta, gamma], flagFacts(on));

const states = (p: QuestProgress | undefined) =>
  Rec.fromEntries(
    Arr.map([...(p?.states ?? [])], ([id, s]) => [
      id,
      StepState.$is('Locked')(s) ? `Locked:${s.by}` : s._tag,
    ]),
  );

const warningsOf = (p: QuestProgress | undefined, tag: Warning['_tag']) =>
  Arr.filter(p?.warnings ?? [], Warning.$is(tag));

describe('quest progress', () => {
  it('starts every questline at its first step, with deadlines warned up front', () => {
    const all = derive();
    const a = all.get('alpha');
    expect(a?.outcome._tag).toBe('NotStarted');
    expect(states(a)).toMatchObject({
      a1: 'Available',
      a2: 'Upcoming',
      h1: 'Upcoming',
    });
    expect(a?.warnings).toEqual([
      expect.objectContaining({
        _tag: 'Deadline',
        step: 'h1',
        before: 'Take the shortcut',
        gate: 'shortcut',
        stakes: 'reward',
        reward: 'Hat',
        now: false,
      }),
      expect.objectContaining({ _tag: 'Deadline', step: 'h2' }),
    ]);
    // A cross-questline decision lock is warned on the locked side too.
    expect(all.get('beta')?.warnings).toEqual([
      expect.objectContaining({
        _tag: 'Deadline',
        step: 'x1',
        before: 'Choose “Betray Alpha” (Alpha)',
        stakes: 'questline',
      }),
    ]);
  });

  it('infers untracked steps from later evidence', () => {
    const a = derive(4).get('alpha');
    expect(a?.outcome._tag).toBe('InProgress');
    expect(states(a)).toMatchObject({
      a1: 'Inferred',
      a2: 'Inferred',
      a4: 'Done',
      g1: 'Available',
      b1: 'Available',
      a5: 'Upcoming',
    });
    expect(a?.done).toBe(3);
  });

  it('keeps detours ordered and independent of the main line', () => {
    const a = derive(1, 7).get('alpha');
    // h2's evidence implies h1 (same detour) but says nothing about a2 on the main line.
    expect(states(a)).toMatchObject({
      h1: 'Inferred',
      h2: 'Done',
      a2: 'Available',
    });
    // And main-line progress past the detour doesn't tick it off: the hat is still gettable.
    expect(states(derive(4).get('alpha'))).toMatchObject({
      h1: 'Available',
      h2: 'Upcoming',
    });
  });

  it('shows an untracked step and its follower as next together', () => {
    const a = derive(1).get('alpha');
    expect(states(a)).toMatchObject({ a2: 'Available' });
    expect(a?.states.get('a4')).toEqual({
      _tag: 'Blocked',
      needs: ['Beat the boss'],
    });
    expect(derive(1, 800).get('alpha')?.states.get('a4')?._tag).toBe(
      'Available',
    );
  });

  it('warns at a fork with what each path closes off, across questlines', () => {
    const [decision] = warningsOf(derive(4).get('alpha'), 'Decision');
    expect(decision).toMatchObject({
      choice: 'c1',
      options: [
        { path: 'good', locks: ['“Betray Alpha”'] },
        {
          path: 'bad',
          ending: 'Betrayal',
          locks: ['“Side with Alpha”', 'Beta: Ask Beta about Alpha'],
        },
      ],
    });
  });

  it('locks a detour when the world moves past it, without failing the questline', () => {
    const a = derive(1, 900).get('alpha');
    expect(a?.outcome._tag).toBe('InProgress');
    expect(a?.states.get('h1')).toEqual({
      _tag: 'Locked',
      by: 'gate',
      reason: 'Take the shortcut',
    });
    expect(states(a)).toMatchObject({ h2: 'Locked:gate' });
    expect(warningsOf(a, 'Deadline')).toEqual([]);
  });

  it('locks out the whole questline when a required step is passed by', () => {
    const g = derive(900).get('gamma');
    expect(g?.outcome).toEqual({
      _tag: 'LockedOut',
      reason: 'Take the shortcut',
      step: 's1',
    });
    expect(states(g)).toEqual({ s1: 'Locked:gate', s2: 'Locked:upstream' });
    expect(g?.warnings).toEqual([]);
  });

  it('a decision locks sibling paths, ends the questline, and locks other questlines', () => {
    const all = derive(4, 20);
    const a = all.get('alpha');
    expect(a?.outcome).toEqual({ _tag: 'Completed', ending: 'Betrayal' });
    expect(a?.chosen.get('c1')).toBe('bad');
    expect(states(a)).toMatchObject({
      g1: 'Locked:decision',
      g2: 'Locked:decision',
      b1: 'Done',
      a5: 'Locked:ending',
    });
    expect(all.get('beta')?.outcome).toEqual({
      _tag: 'LockedOut',
      reason: 'Chose “Betray Alpha” (Alpha)',
      step: 'x1',
    });
  });

  it('marks a fork Unknown when later progress shows a path was taken but not which', () => {
    const a = derive(5).get('alpha');
    expect(a?.outcome).toEqual({ _tag: 'Completed', ending: undefined });
    expect(states(a)).toMatchObject({
      g1: 'Unknown',
      b1: 'Unknown',
      a5: 'Done',
    });
  });

  it('locks out a questline whose NPC is dead, unless it was already complete', () => {
    const a = derive(1, 103).get('alpha');
    expect(a?.outcome).toEqual({
      _tag: 'LockedOut',
      reason: 'Alpha is dead',
      step: undefined,
    });
    expect(states(a)).toMatchObject({ a1: 'Done', a2: 'Locked:npc' });
    expect(derive(5, 103).get('alpha')?.outcome._tag).toBe('Completed');
  });

  it('says "can’t tell" rather than "locked" for an untracked optional step that has closed', () => {
    const kappa = defineQuest(
      {
        id: 'kappa',
        npc: 'Kappa',
        isDlc: false,
        blurb: '',
        stages: {},
        sources: [],
      },
      () => [
        step('k1', 'Meet Kappa', {
          kind: 'talk',
          done: talk(71),
          evidence: 'script',
        }),
        detour(
          'summon',
          'Summon Kappa for the boss',
          {
            lockedBy: [lockedByGate(SHORTCUT)],
            reward: 'Kappa’s help (dialogue only)',
          },
          [step('k2', 'Use Kappa’s summon sign', { kind: 'action' })],
        ),
      ],
    );
    const k2 = (...on: ReadonlyArray<number>) =>
      deriveQuests([kappa], flagFacts(on)).get('kappa')?.states.get('k2')?._tag;
    expect(k2(71)).toBe('Available');
    expect(k2(71, 900)).toBe('Unknown');
  });

  it('treats a death the story causes (`diesAfter`) as expected, not a lockout', () => {
    const omega = defineQuest(
      {
        id: 'omega',
        npc: 'Omega',
        isDlc: false,
        blurb: '',
        status: { ...statusBlock(600), diesAfter: 'o2' },
        stages: {},
        sources: [],
      },
      () => [
        step('o1', 'Meet Omega', {
          kind: 'talk',
          done: talk(81),
          evidence: 'script',
        }),
        step('o2', 'Omega’s last stand', {
          kind: 'event',
          done: talk(82),
          evidence: 'script',
        }),
        step('o3', 'Take Omega’s blade', {
          kind: 'item',
          done: talk(83),
          evidence: 'script',
        }),
      ],
    );
    const run = (...on: ReadonlyArray<number>) =>
      deriveQuests([omega], flagFacts(on)).get('omega');
    // Dead after the scripted step: the loot is still next.
    expect(run(81, 82, 603)?.outcome._tag).toBe('InProgress');
    expect(run(81, 82, 603)?.states.get('o3')?._tag).toBe('Available');
    // Permanently hostile for a scripted fight counts the same.
    expect(run(81, 82, 602)?.outcome._tag).toBe('InProgress');
    // Killed before the story got there: locked out.
    expect(run(81, 603)?.outcome).toEqual({
      _tag: 'LockedOut',
      reason: 'Omega is dead',
      step: undefined,
    });
  });

  it('counts held items and words ad-hoc locks in the past tense once they fire', () => {
    const CURSE = 3001;
    const sigma = defineQuest(
      {
        id: 'sigma',
        npc: 'Sigma',
        isDlc: false,
        blurb: '',
        stages: {},
        sources: [],
      },
      () => [
        step('s1', 'Bring five curses', {
          kind: 'item',
          done: has(CURSE, 'Curse', 5),
          evidence: 'script',
          lockedBy: [
            lockedWhen(flag(91, 'status'), 'Sigma leaves', 'Sigma has left'),
          ],
        }),
      ],
    );
    const run = (count: number, ...on: ReadonlyArray<number>) =>
      deriveQuests([sigma], flagFacts(on, new Map([[CURSE, count]]))).get(
        'sigma',
      );
    expect(run(4)?.states.get('s1')?._tag).toBe('Available');
    expect(run(5)?.states.get('s1')?._tag).toBe('Done');
    expect(warningsOf(run(4), 'Deadline')).toEqual([
      expect.objectContaining({ before: 'Sigma leaves' }),
    ]);
    expect(run(4, 91)?.outcome).toEqual({
      _tag: 'LockedOut',
      reason: 'Sigma has left',
      step: 's1',
    });
  });

  it('warns when the NPC is hostile but can still be absolved', () => {
    expect(derive(1, 101).get('alpha')?.warnings).toContainEqual({
      _tag: 'Hostile',
      quest: 'alpha',
    });
  });

  it('reads inventory, other questlines and negations, and locks on ad-hoc conditions', () => {
    const TOKEN = 2001;
    const delta = defineQuest(
      {
        id: 'delta',
        npc: 'Delta',
        isDlc: false,
        blurb: '',
        stages: {},
        sources: [],
      },
      () => [
        step('d1', 'Carry the token', {
          kind: 'item',
          done: has(TOKEN, 'Token'),
        }),
        step('d2', 'Hand it over after Alpha’s farewell', {
          kind: 'talk',
          done: all(reached('alpha', 'a5'), not(has(TOKEN, 'Token')), talk(70)),
          lockedBy: [lockedWhen(flag(71, 'status'), 'Delta left for good')],
        }),
      ],
    );
    const run = (
      goods: ReadonlyMap<number, number>,
      ...on: ReadonlyArray<number>
    ) => deriveQuests([alpha, delta], flagFacts(on, goods)).get('delta');

    expect(states(run(new Map([[TOKEN, 1]])))).toEqual({
      d1: 'Done',
      d2: 'Available',
    });
    // Token handed over (no longer held) after Alpha's farewell: d2 done, d1 inferred.
    expect(states(run(new Map(), 5, 70))).toEqual({
      d1: 'Inferred',
      d2: 'Done',
    });
    // Same flags but Alpha's farewell not reached: d2's evidence doesn't hold.
    expect(states(run(new Map(), 70))).toMatchObject({ d1: 'Available' });
    expect(run(new Map([[TOKEN, 1]]), 71)?.outcome).toEqual({
      _tag: 'LockedOut',
      reason: 'Delta left for good',
      step: 'd2',
    });
  });
});
