import { Array as Arr, Record as Rec } from 'effect';
import { describe, expect, it } from 'vitest';

import { talk } from './cond';
import { deriveEndings, EndingState } from './endings';
import { flagFacts } from './facts';
import { defineQuest, statusBlock, step } from './model';
import { deriveQuests } from './progress';

// Synthetic stand-ins for the questlines the endings hang off (same ids, made-up flags).
const line = (id: string, statusBase: number, flags: ReadonlyArray<number>) =>
  defineQuest(
    {
      id,
      npc: id,
      isDlc: false,
      blurb: '',
      status: statusBlock(statusBase),
      stages: {},
      sources: [],
    },
    () =>
      Arr.map(flags, (f, i) =>
        step(`${id}-${i}`, `Step ${i}`, {
          kind: 'talk',
          done: talk(f),
          evidence: 'script',
        }),
      ),
  );

const QUESTS = [
  line('corhyn', 100, [1, 2]),
  line('fia', 200, [11, 12]),
  line('ranni', 300, [21, 22]),
  line('dung-eater', 400, [31, 32]),
  line('hyetta', 500, [41, 42]),
];

const endings = (
  on: ReadonlyArray<number>,
  goods: ReadonlyMap<number, number> = new Map(),
) => {
  const facts = flagFacts(on, goods);
  const progress = deriveQuests(QUESTS, facts);
  return Rec.fromEntries(
    Arr.map(
      deriveEndings(progress, { ...facts, reached: () => false }),
      (e) => [e.ending.id, e.state],
    ),
  );
};

const tags = (on: ReadonlyArray<number>, goods?: ReadonlyMap<number, number>) =>
  Rec.map(endings(on, goods), (s) => s._tag);

describe('endings', () => {
  it('starts with only the Age of Fracture secured', () => {
    expect(tags([])).toEqual({
      fracture: 'Secured',
      order: 'Available',
      duskborn: 'Available',
      stars: 'Available',
      despair: 'Available',
      'frenzied-flame': 'Available',
    });
  });

  it('secures a rune ending by holding its Mending Rune', () => {
    expect(tags([], new Map([[8183, 1]]))).toMatchObject({
      duskborn: 'Secured',
    });
  });

  it('secures the Age of the Stars by completing Ranni’s questline', () => {
    expect(tags([21])).toMatchObject({ stars: 'InProgress' });
    expect(tags([22])).toMatchObject({ stars: 'Secured' });
  });

  it('reports an in-progress questline with its next step', () => {
    expect(endings([1]).order).toEqual(
      EndingState.InProgress({ done: 1, total: 2, next: ['Step 1'] }),
    );
  });

  it('locks out an ending whose questline can no longer be finished', () => {
    expect(endings([11, 203]).duskborn).toEqual(
      EndingState.LockedOut({ reason: 'fia is dead' }),
    );
  });

  it('lets an uncured Frenzied Flame override every other ending', () => {
    expect(tags([108], new Map([[8182, 1]]))).toEqual({
      fracture: 'Overridden',
      order: 'Overridden',
      duskborn: 'Overridden',
      stars: 'Overridden',
      despair: 'Overridden',
      'frenzied-flame': 'Secured',
    });
    // Cured with Miquella's Needle: the others come back.
    expect(tags([108, 116], new Map([[8182, 1]]))).toMatchObject({
      order: 'Secured',
      'frenzied-flame': 'Available',
    });
  });
});
