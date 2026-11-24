import { any, boss, flag, has, pickup } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByGate,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const HIGHROAD_CROSS = 76900;
const MOORTH_RUINS = 76902;
const CHURCH_OF_THE_BUD = 76945;
const RECLUSES_RIVER_DOWNSTREAM = 76918;

/**
 * Dryleaf Dane (status block 4560), the monk who wants a duel at the Moorth Ruins.
 *
 * Stage machine (`common.evs.py` Event_4579): 4565 at the Moorth Ruins → 4566 in Enir-Ilim
 * (2049449225, set by Event_4843 after the Miquella's Faithful fight). His roster flag 4908
 * ("fights for Leda") is turned on when his block initialises.
 *
 * The duel (`m61_49_44_00`): his boss flag 2049440800 turns on 2049449211 (Event_2049440702),
 * which offers his reward, lot 107300 (Dryleaf Arts + Dane's Hat, pickup flag 400730).
 * May the Best Win (gesture flag 60860) is awarded once the Monk's Missive is picked up at
 * Highroad Cross (pickup 2048457510, `m61_48_45_00` CommonFunc_900005571). His Romina summon sign
 * (`m61_44_46_00` CommonFunc_90005780) appears once 2049449213 is on. Dane's Footwork (lot
 * 107310, flag 400732) is placed on his body in Enir-Ilim (`m20_01_00_00`, stage 4566).
 * The Dryleaf Robe, Arm Wraps and Cuissardes are a map treasure, lot 2050440720 (pickup flag
 * 2050447720) in `m61_50_44_00`.
 */
export const dane = defineQuest(
  {
    id: 'dane',
    npc: 'Dryleaf Dane',
    isDlc: true,
    blurb:
      'A wandering monk of the Dryleaf school who answers a challenge to a fair duel.',
    status: { ...statusBlock(4560), diesAfter: 'miquellas-faithful' },
    stages: { moorth: 4565, enirIlim: 4566 },
    sources: [
      'soulstruct common.evs.py Event_4579 (stage machine), Event_4843 (Enir-Ilim roster)',
      'soulstruct m61_49_44_00 (Moorth Ruins duel), m61_48_45_00 (Monk’s Missive / gesture), m61_44_46_00 (Romina sign)',
      'regulation.bin ItemLotParam_map getItemFlagId (Monk’s Missive, Dryleaf Arts, Dane’s Footwork)',
      'Grand Archives CT Event Flag Manager "Dryleaf Dane | Defeated"',
      'NPC Quests & Endings Guide v5 SotE flowchart, Dryleaf Dane column (ordering)',
    ],
  },
  ({ stage }) => [
    step(
      'missive',
      'Pick up the Monk’s Missive at Highroad Cross to learn May the Best Win',
      {
        kind: 'item',
        requires: [needsGate(GATES.landOfShadow)],
        // Not the gesture flag 60860: gestures carry over into NG+.
        done: any(
          pickup(2048457510, 'Monk’s Missive picked up'),
          has(2008029, 'Monk’s Missive'),
        ),
        evidence: 'script',
        where: { grace: HIGHROAD_CROSS },
        note: 'Leda can point you to him too.',
        rewards: ["Monk's Missive", 'May the Best Win'],
      },
    ),
    step('meet', 'Find Dane at the Moorth Ruins', {
      kind: 'talk',
      where: { grace: MOORTH_RUINS },
      flagTodo: 'first talk with Dane at the Moorth Ruins; the flag that flips',
    }),
    step('duel', 'Perform May the Best Win in front of him and win the duel', {
      kind: 'boss',
      done: any(
        boss(2049440800, 'Dryleaf Dane'),
        flag(2049449211, 'boss', 'duel won'),
        pickup(400730, 'Dryleaf Arts and Dane’s Hat'),
      ),
      evidence: 'script',
      lockedBy: [lockedByGate(GATES.sealingTreeBurned)],
      where: { grace: MOORTH_RUINS },
      rewards: ['Dryleaf Arts', "Dane's Hat"],
      unlocks: ['Dane’s summon sign for Romina, Saint of the Bud'],
    }),
    detour(
      'romina',
      'Fight Romina alongside Dane',
      {
        lockedBy: [
          lockedWhen(
            boss(2044450800, 'Romina, Saint of the Bud'),
            'Defeat Romina, Saint of the Bud',
            'Romina is already defeated',
          ),
        ],
        reward: 'Dane’s help against Romina',
      },
      [
        step('romina-summon', 'Summon Dane to fight Romina, Saint of the Bud', {
          kind: 'boss',
          where: { grace: CHURCH_OF_THE_BUD },
        }),
      ],
    ),
    detour(
      'dryleaf-set',
      'Dane’s Dryleaf set',
      { reward: 'Dryleaf Robe, Dryleaf Arm Wraps and Dryleaf Cuissardes' },
      [
        step(
          'dryleaf-set-pickup',
          'Find the rest of his Dryleaf set downstream on Recluses’ River',
          {
            kind: 'item',
            done: pickup(2050447720, 'Dryleaf set picked up'),
            evidence: 'script',
            where: { grace: RECLUSES_RIVER_DOWNSTREAM },
            rewards: [
              'Dryleaf Robe',
              'Dryleaf Arm Wraps',
              'Dryleaf Cuissardes',
            ],
          },
        ),
      ],
    ),
    step('miquellas-faithful', 'Face Dane among Leda’s allies in Enir-Ilim', {
      kind: 'boss',
      done: stage('enirIlim'),
      evidence: 'script',
      requires: [needsGate(GATES.sealingTreeBurned)],
      where: { note: 'Enir-Ilim, the Miquella’s Faithful fight' },
    }),
    detour(
      'footwork',
      'The rest of Dane’s gear',
      { reward: 'Dane’s Footwork' },
      [
        step('footwork-pickup', 'Take Dane’s Footwork from his body', {
          kind: 'item',
          done: pickup(400732, 'Dane’s Footwork'),
          evidence: 'script',
          rewards: ["Dane's Footwork"],
          where: {
            note: 'Enir-Ilim after the fight (the community chart places it near Recluses’ River Downstream)',
          },
        }),
      ],
    ),
  ],
);
