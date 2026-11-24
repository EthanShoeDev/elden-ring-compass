import { any, boss, flag, has, pickup, reached } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByDecision,
  lockedByGate,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const THREE_PATH_CROSS = 76802;
const HIGHROAD_CROSS = 76900;
const MAIN_GATE_PLAZA = 72101;
const STOREHOUSE_FIRST_FLOOR = 72111;
const DARK_CHAMBER_ENTRANCE = 72114;
const MESSMERS_DARK_CHAMBER = 72110;

/**
 * Hornsent (status block 4360), the vengeful hornsent hunting Messmer.
 *
 * Stage machine (`common.evs.py` Event_4379): 4365 at Three-Path Cross → 4366 at Highroad Cross
 * once 2046429214 is on (Event_4844: Scadu Altus reached, flag 4925, or the charm broken, 4927)
 * → 4368 once Messmer dies (2048459225) → 4369 after 21019220 (Event_4844, set from 21019216,
 * which also unlocks his Rauh invasion in `m61_44_46_00`) → 4370 in Enir-Ilim, among Leda's
 * allies (Event_4843, only while 4892 "fights for Leda" is still on). 4892 is turned on when his
 * block initialises and is the roster flag the Miquella's Faithful fight reads (`m20_01_00_00`).
 *
 * Messmer summon: `m21_01_00_00` Event_21010700 sets 21012702 when his sign is used, and
 * Event_21010702 turns that into 21019215 when Messmer dies. Helping Leda instead kills him
 * (7623 → 4363, Event_21000711). Rauh invasion cleared = 2044460180 (CommonFunc_90005792).
 * Rewards are ItemLotParam_map pickup flags: Cross Map 400610, New Cross Map 400611, Furnace
 * Visages 400612 (lots 1061x0–1061x2).
 */
export const hornsent = defineQuest(
  {
    id: 'hornsent',
    npc: 'Hornsent',
    isDlc: true,
    blurb:
      'A masked hornsent warrior out for revenge on Messmer and the crusade that burned his people.',
    status: { ...statusBlock(4360), diesAfter: 'rauh-invasion' },
    stages: {
      threePath: 4365,
      highroad: 4366,
      darkChamber: 4368,
      rauh: 4369,
      enirIlim: 4370,
    },
    sources: [
      'soulstruct common.evs.py Event_4379 (stage machine), Event_4844 (moves), Event_4620 (map flags)',
      'soulstruct m21_00_00_00 / m21_01_00_00 (Leda invasion, Messmer summon), m61_44_46_00 (Rauh invasion)',
      'regulation.bin ItemLotParam_map getItemFlagId (Cross Map / New Cross Map / Furnace Visage)',
      'Paramdex NpcParam names (Hornsent at Three-Path Cross, Highroad Cross, Storehouse, Enir-Ilim)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Hornsent column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Hornsent at Three-Path Cross and accept his Cross Map', {
      kind: 'talk',
      requires: [needsGate(GATES.landOfShadow)],
      done: any(pickup(400610, 'Cross Map'), has(2008007, 'Cross Map')),
      evidence: 'script',
      rewards: ['Cross Map'],
      where: { grace: THREE_PATH_CROSS },
    }),
    detour(
      'scorpion-stew',
      'Share a hornsent meal',
      { reward: 'Three Furnace Visages' },
      [
        step('give-stew', 'Give Hornsent a Scorpion Stew', {
          kind: 'item',
          done: pickup(400612, 'Furnace Visages'),
          evidence: 'script',
          rewards: ['Furnace Visage'],
          note: 'He hands over three of them.',
          requires: [
            {
              cond: reached('grandam', 'first-stew'),
              label: 'Get a Scorpion Stew from the Hornsent Grandam in Belurat',
            },
          ],
        }),
      ],
    ),
    step(
      'new-cross-map',
      'After reaching Scadu Altus, talk to him at Highroad Cross for the New Cross Map',
      {
        kind: 'talk',
        done: any(
          pickup(400611, 'New Cross Map'),
          has(2008012, 'New Cross Map'),
        ),
        evidence: 'script',
        requires: [
          {
            cond: any(
              stage('highroad'),
              stage('darkChamber'),
              stage('rauh'),
              stage('enirIlim'),
            ),
            label:
              'Hornsent has moved to Highroad Cross (reach Scadu Altus, or break Miquella’s charm)',
          },
        ],
        where: { grace: HIGHROAD_CROSS },
        rewards: ['New Cross Map'],
      },
    ),
    step(
      'after-charm',
      'Once Miquella’s charm breaks, talk to him at Highroad Cross, then rest',
      {
        kind: 'talk',
        requires: [needsGate(GATES.miquellaCharmBroken)],
        where: { grace: HIGHROAD_CROSS },
        reload: true,
        flagTodo:
          'talk to Hornsent at Highroad Cross after the charm breaks; the flag that flips',
      },
    ),
    detour(
      'hippopotamus',
      'Fight the Golden Hippopotamus together',
      {
        lockedBy: [
          lockedWhen(
            boss(21000850, 'Golden Hippopotamus'),
            'Defeat the Golden Hippopotamus',
            'The Golden Hippopotamus is already defeated',
          ),
        ],
        reward: 'Hornsent’s help against the Golden Hippopotamus',
      },
      [
        step(
          'hippopotamus-summon',
          'Summon Hornsent to fight the Golden Hippopotamus',
          {
            kind: 'boss',
            where: { grace: MAIN_GATE_PLAZA },
          },
        ),
      ],
    ),
    step(
      'survive-leda',
      'Keep Leda from getting him: at the Storehouse elevator, help Hornsent or ignore both signs',
      {
        kind: 'event',
        done: flag(7624, 'boss', 'helped Hornsent against Leda'),
        evidence: 'script',
        lockedBy: [lockedByDecision('leda', 'hunt-hornsent')],
        where: { grace: STOREHOUSE_FIRST_FLOOR },
        note: 'Siding with Leda here kills him and ends his questline.',
      },
    ),
    step(
      'messmer-summon',
      'Summon Hornsent from his sign outside Messmer’s chamber and defeat Messmer together',
      {
        kind: 'boss',
        done: flag(21019215, 'boss', 'Hornsent helped defeat Messmer'),
        evidence: 'script',
        lockedBy: [lockedByGate(GATES.messmer)],
        where: { grace: DARK_CHAMBER_ENTRANCE },
        note: 'Beating Messmer without him sends Hornsent to fight beside Leda in Enir-Ilim instead.',
      },
    ),
    step(
      'dark-chamber-talk',
      'Talk to him in Messmer’s chamber after the fight',
      {
        kind: 'talk',
        done: any(
          stage('rauh'),
          flag(
            21019216,
            'talk',
            'Dark Chamber talk (unlocks his Rauh invasion)',
          ),
        ),
        evidence: 'script',
        requires: [needsGate(GATES.messmer)],
        where: { grace: MESSMERS_DARK_CHAMBER },
      },
    ),
    step(
      'rauh-invasion',
      'Defeat him when he invades you in the Ancient Ruins of Rauh',
      {
        kind: 'boss',
        done: flag(2044460180, 'boss', 'Hornsent’s invasion defeated'),
        evidence: 'script',
        rewards: [
          'Falx',
          'Caterpillar Mask',
          'Braided Cord Robe',
          'Braided Arm Wraps',
          'Soiled Loincloth',
        ],
        where: { note: 'Ancient Ruins of Rauh, near the Church of the Bud' },
      },
    ),
  ],
);
