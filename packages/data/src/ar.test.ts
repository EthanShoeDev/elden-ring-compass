import { describe, expect, it } from 'vitest';

import {
  type ArTables,
  type Attributes,
  createArCalculator,
  evaluateCalcCorrectGraph,
  type ReinforceLevel,
  type WeaponScaling,
} from './ar.ts';

// Fixtures transcribed from ThomasJClark's regulation-vanilla-v1.14 data (the
// canonical AR reference). The golden AR totals below were computed from that
// same data with the reference formula, so this test pins our port to it.

const lvl = (attack: number[], scaling: number[]): ReinforceLevel => ({
  attack,
  scaling,
});
const EMPTY_LEVEL: ReinforceLevel = { attack: [], scaling: [] };
// Sparse level array — only the upgrade levels the tests exercise are populated;
// the rest are harmless empties (compute is never called on them).
const levels = (entries: Record<number, ReinforceLevel>): ReinforceLevel[] => {
  const max = Math.max(...Object.keys(entries).map(Number));
  const arr = Array.from({ length: max + 1 }, () => EMPTY_LEVEL);
  for (const [i, v] of Object.entries(entries)) arr[Number(i)] = v;
  return arr;
};

const tables: ArTables = {
  reinforceTypes: [
    {
      id: 0,
      levels: levels({
        0: lvl([1, 1, 1, 1, 1], [1, 1, 1, 1, 1]),
        25: lvl([2.45, 2.45, 2.45, 2.45, 2.45], [1.5, 1.5, 1.8, 1.8, 1.8]),
      }),
    },
    {
      id: 100,
      levels: levels({
        25: lvl([2.35, 2.35, 2.35, 2.35, 2.35], [2.8, 0, 1.8, 1.8, 1.8]),
      }),
    },
    {
      id: 2200,
      levels: levels({
        10: lvl([2.45, 2.45, 2.45, 2.45, 2.45], [1.8, 1.8, 1.8, 1.8, 1.8]),
      }),
    },
  ],
  attackElementCorrects: [
    {
      id: 10000,
      correct: {
        physical: { str: true, dex: true },
        magic: { int: true },
        fire: { fai: true },
        lightning: { dex: true },
        holy: { fai: true },
      },
    },
  ],
  calcCorrectGraphs: [
    {
      id: 0,
      stages: [
        { maxVal: 1, maxGrowVal: 0, adjPt: 1.2 },
        { maxVal: 18, maxGrowVal: 0.25, adjPt: -1.2 },
        { maxVal: 60, maxGrowVal: 0.75, adjPt: 1 },
        { maxVal: 80, maxGrowVal: 0.9, adjPt: 1 },
        { maxVal: 150, maxGrowVal: 1.1, adjPt: 1 },
      ],
    },
    {
      id: 1,
      stages: [
        { maxVal: 1, maxGrowVal: 0, adjPt: 1.2 },
        { maxVal: 20, maxGrowVal: 0.35, adjPt: -1.2 },
        { maxVal: 60, maxGrowVal: 0.75, adjPt: 1 },
        { maxVal: 80, maxGrowVal: 0.9, adjPt: 1 },
        { maxVal: 150, maxGrowVal: 1.1, adjPt: 1 },
      ],
    },
    {
      id: 4,
      stages: [
        { maxVal: 1, maxGrowVal: 0, adjPt: 1 },
        { maxVal: 20, maxGrowVal: 0.4, adjPt: 1 },
        { maxVal: 50, maxGrowVal: 0.8, adjPt: 1 },
        { maxVal: 80, maxGrowVal: 0.95, adjPt: 1 },
        { maxVal: 99, maxGrowVal: 1, adjPt: 1 },
      ],
    },
  ],
};

const dagger: WeaponScaling = {
  id: 1000000,
  reinforceTypeId: 0,
  attackElementCorrectId: 10000,
  requirements: { str: 5, dex: 9 },
  baseAttack: { physical: 74 },
  scaling: { str: 0.35, dex: 0.65 },
  calcCorrectIds: {},
};
const heavyDagger: WeaponScaling = {
  id: 1000100,
  reinforceTypeId: 100,
  attackElementCorrectId: 10000,
  requirements: { str: 5, dex: 9 },
  baseAttack: { physical: 71 },
  scaling: { str: 0.55 },
  calcCorrectIds: { physical: 1 },
};
const moonveil: WeaponScaling = {
  id: 21150000,
  reinforceTypeId: 2200,
  attackElementCorrectId: 10000,
  requirements: { str: 12, dex: 18, int: 23 },
  baseAttack: { physical: 73, magic: 87 },
  scaling: { str: 0.12, dex: 0.5, int: 0.6 },
  calcCorrectIds: { magic: 4 },
};

const attrs = (over: Partial<Attributes>): Attributes => ({
  str: 10,
  dex: 10,
  int: 10,
  fai: 10,
  arc: 10,
  ...over,
});

describe('AR calculator', () => {
  const { compute } = createArCalculator(tables);

  it('rates a base Dagger at +0', () => {
    const ar = compute(dagger, attrs({}), 0);
    expect(ar.total).toBeCloseTo(82.62, 1);
    expect(ar.damage.physical).toBeCloseTo(82.62, 1);
    expect(ar.ineffective).toBe(false);
  });

  it('applies reinforcement and the soft-cap curve (Dagger +25)', () => {
    const ar = compute(dagger, attrs({ str: 18, dex: 60 }), 25);
    expect(ar.total).toBeCloseTo(337.67, 1);
  });

  it('rates a Heavy affinity (str-only scaling, graph 1)', () => {
    const ar = compute(heavyDagger, attrs({ str: 80 }), 25);
    expect(ar.total).toBeCloseTo(398.1, 1);
  });

  it('sums split physical + magic damage (Moonveil +10)', () => {
    const ar = compute(moonveil, attrs({ str: 16, dex: 20, int: 60 }), 10);
    expect(ar.damage.physical).toBeCloseTo(231.98, 1);
    expect(ar.damage.magic).toBeCloseTo(408.82, 1);
    expect(ar.total).toBeCloseTo(640.8, 1);
  });

  it('applies the −40% penalty when a requirement is unmet', () => {
    // str 4 < the Dagger's str requirement of 5 → physical (str/dex scaled) is penalized.
    const ar = compute(dagger, attrs({ str: 4, dex: 9, int: 1, fai: 1, arc: 1 }), 0);
    expect(ar.total).toBeCloseTo(44.4, 1); // 74 base × (1 − 0.4)
    expect(ar.ineffective).toBe(true);
  });

  it('evaluateCalcCorrectGraph is monotonic with a soft-cap bend', () => {
    const graph = tables.calcCorrectGraphs.find((g) => g.id === 0);
    expect(graph).toBeDefined();
    const curve = evaluateCalcCorrectGraph(graph?.stages ?? []);
    const at = (v: number) => curve[v] ?? 0;
    // Growth at 80 (a soft cap) should exceed growth at 18 but the marginal gain
    // from 60→80 should be smaller than 18→60 (diminishing returns).
    expect(at(80)).toBeGreaterThan(at(18));
    expect(at(60) - at(18)).toBeGreaterThan(at(80) - at(60));
  });
});
