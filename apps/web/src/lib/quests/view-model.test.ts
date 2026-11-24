import { Array as Arr, Result } from 'effect';
import { describe, expect, it } from 'vitest';

import { flag, talk } from './cond';
import { flagFacts } from './facts';
import type { Gate } from './gates';
import { QUESTS } from './index';
import { choice, defineQuest, detour, lockedByGate, path, step } from './model';
import { deriveQuests, StepState } from './progress';
import {
  beforePhrase,
  deadlineGroups,
  isShownQuest,
  lockedPhrase,
  matchesSearch,
  nextUp,
  pendingDecisions,
  splitDeadlines,
  warningSummary,
  whereText,
} from './view-model';

const BRIDGE: Gate = {
  id: 'bridge',
  label: 'Cross the bridge',
  cond: flag(900, 'world'),
};

const alpha = defineQuest(
  {
    id: 'alpha',
    npc: 'Alpha',
    isDlc: false,
    blurb: '',
    stages: {},
    sources: [],
  },
  () => [
    step('a1', 'Meet Alpha', { kind: 'talk', done: talk(1) }),
    detour(
      'hat',
      'The hat',
      { lockedBy: [lockedByGate(BRIDGE)], reward: 'Hat' },
      [step('h1', 'Find the hat', { kind: 'item', done: talk(3) })],
    ),
    step('a2', 'Talk again', {
      kind: 'talk',
      done: talk(2),
      lockedBy: [lockedByGate(BRIDGE)],
    }),
    choice('c1', 'Whose side?', [
      path('good', 'Side with Alpha', [
        step('g1', 'Help', { kind: 'action', done: talk(10) }),
      ]),
      path('bad', 'Betray Alpha', [
        step('b1', 'Betray', { kind: 'action', done: talk(20) }),
      ]),
    ]),
  ],
);

const beta = defineQuest(
  {
    id: 'beta',
    npc: 'Beta',
    isDlc: true,
    blurb: '',
    stages: {},
    sources: [],
  },
  () => [
    step('x1', 'Meet Beta', {
      kind: 'talk',
      done: talk(50),
      lockedBy: [lockedByGate(BRIDGE)],
    }),
  ],
);

const derive = (on: ReadonlyArray<number>) => {
  const all = deriveQuests([alpha, beta], flagFacts(on));
  return Arr.filterMap([alpha, beta], (q) => {
    const p = all.get(q.id);
    return p === undefined ? Result.failVoid : Result.succeed(p);
  });
};

describe('quest view model', () => {
  it('groups deadlines by trigger, one entry per questline, urgent first', () => {
    const groups = deadlineGroups(derive([1]));
    expect(Arr.map(groups, (g) => g.key)).toStrictEqual(['bridge']);
    const [bridge] = groups;
    expect(bridge?.heading).toBe('Before you cross the bridge');
    expect(bridge?.now).toBe(true);
    expect(Arr.map(bridge?.entries ?? [], (e) => e.quest.id)).toStrictEqual([
      'alpha',
      'beta',
    ]);
    const alphaEntry = bridge?.entries[0];
    // The hat (reward) and "Talk again" (questline) are both actionable after meeting Alpha.
    expect(alphaEntry?.questline).toBe(true);
    expect(alphaEntry?.rewards).toStrictEqual(['Hat']);
    expect(alphaEntry?.steps[0]?.stakes).toBe('questline');
  });

  it('keeps only actionable deadlines of started questlines in "soon"', () => {
    const { soon, later } = splitDeadlines(derive([1]));
    expect(
      Arr.map(soon, (g) => Arr.map(g.entries, (e) => e.quest.id)),
    ).toStrictEqual([['alpha']]);
    expect(
      Arr.map(later, (g) => Arr.map(g.entries, (e) => e.quest.id)),
    ).toStrictEqual([['beta']]);
  });

  it('drops deadlines once the gate has fired, and spells out the lock', () => {
    const progress = derive([1, 900]);
    expect(deadlineGroups(progress)).toStrictEqual([]);
    const state = progress[0]?.states.get('a2');
    expect(state !== undefined && StepState.$is('Locked')(state)).toBe(true);
    if (state !== undefined && StepState.$is('Locked')(state))
      expect(lockedPhrase(state)).toBe(
        'Closed by: Cross the bridge (already done).',
      );
  });

  it('lists pending decisions and next steps for questlines under way', () => {
    const progress = derive([1, 2]);
    const [decision] = pendingDecisions(progress);
    expect(decision?.label).toBe('Whose side?');
    expect(Arr.map(decision?.options ?? [], (o) => o.locks)).toStrictEqual([
      ['“Betray Alpha”'],
      ['“Side with Alpha”'],
    ]);
    // Beta hasn't started, so only Alpha's frontier shows.
    expect(Arr.map(nextUp(progress), (n) => n.quest.id)).toStrictEqual([
      'alpha',
      'alpha',
      'alpha',
    ]);
    const [first] = progress;
    expect(first && warningSummary(first).active).toBeGreaterThan(0);
  });

  it('words triggers and filters questlines', () => {
    expect(beforePhrase('Choose “X” (Y)', undefined)).toBe(
      'Before you choose “X” (Y)',
    );
    expect(beforePhrase('Beta dies', undefined)).toBe('Before: Beta dies');
    expect(matchesSearch(alpha, ' alp ')).toBe(true);
    expect(matchesSearch(alpha, 'beta')).toBe(false);
    expect(isShownQuest(beta, 'base')).toBe(false);
    expect(isShownQuest(beta, 'all')).toBe(true);
    expect(whereText({ grace: 76102, note: 'By the fire' })).toBe(
      'Stormhill Shack (Stormhill) · By the fire',
    );
  });

  it('hides draft questlines', () => {
    const drafts = Arr.filter(QUESTS, (q) => q.draft === true);
    expect(Arr.every(drafts, (q) => !isShownQuest(q, 'all'))).toBe(true);
  });
});
