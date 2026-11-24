import { any, flag, has, pickup, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByDecision,
  lockedByGate,
  needsGate,
  statusBlock,
  step,
} from '../model';

const MAIN_GATE_CROSS = 76803;
const CERULEAN_COAST_CROSS = 76835;
const STOREHOUSE_FIRST_FLOOR = 72111;
const STOREHOUSE_FOURTH_FLOOR = 72112;
const CLEANSING_CHAMBER_ANTEROOM = 72015;

/**
 * Sir Ansbach (status block 4400), Mohg's old retainer, scholar of Miquella's crosses.
 *
 * Stage machine (`common.evs.py` Event_4419): 4405 at Main Gate Cross → 4406 in the Specimen
 * Storehouse once 2045429225 is on (set when 4923, the player entering the Storehouse
 * (`m21_01_00_00` Event_21012699), meets 2045429227 — a Main Gate Cross talk flag, presumably the
 * post-charm conversation) → 4407 in Enir-Ilim (20019223, Event_4843) → 4408 after Promised
 * Consort Radahn (20019225 / 20019228). 21019325 or helping Leda kill him (7621, Event_21010726)
 * set his dead flag 4403.
 *
 * Item-lot pickup flags (regulation.bin `getItemFlagId`): Letter for Freyja 400620 (lot 106200),
 * his set + Longbow when Leda kills him 400622/400623 (lot 106210), his parting gifts after
 * Radahn — Wise Man's Mask, set, Obsidian Lamina, Furious Blade of Ansbach — 400624 (lot 106220,
 * on his body at stage 4408 in `m20_01_00_00`). Secret Rite Scroll pickup 21017340.
 */
export const ansbach = defineQuest(
  {
    id: 'ansbach',
    npc: 'Sir Ansbach',
    isDlc: true,
    blurb:
      'Mohg’s former retainer, a scholar of Miquella’s golden crosses who distrusts Leda’s crusade.',
    status: { ...statusBlock(4400), diesAfter: 'parting-gifts' },
    stages: {
      mainGate: 4405,
      storehouse: 4406,
      enirIlim: 4407,
      afterRadahn: 4408,
    },
    sources: [
      'soulstruct common.evs.py Event_4419 (stage machine), Event_4622 (map flags), Event_4843 (Enir-Ilim)',
      'soulstruct m21_01_00_00 (Storehouse: Ansbach, Letter for Freyja, Leda invasion 7621/7622)',
      'soulstruct m20_01_00_00 (Enir-Ilim: his body and parting gifts)',
      'regulation.bin ItemLotParam_map getItemFlagId (Letter for Freyja, Secret Rite Scroll, gifts)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Sir Ansbach column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Sir Ansbach at Main Gate Cross', {
      kind: 'talk',
      requires: [needsGate(GATES.landOfShadow)],
      where: { grace: MAIN_GATE_CROSS },
      flagTodo:
        'first talk with Ansbach at Main Gate Cross; the flag that flips',
    }),
    detour(
      'crosses',
      'Tell him about Miquella’s crosses',
      {
        lockedBy: [lockedByGate(GATES.miquellaCharmBroken)],
        reward: 'His thoughts on the crosses',
      },
      [
        step(
          'belurat-cross',
          'Find the cross at Belurat, Tower Settlement, then talk to him',
          {
            kind: 'talk',
            where: { grace: MAIN_GATE_CROSS },
            flagTodo:
              'talk to Ansbach after seeing the Belurat Tower Settlement cross; the flag that flips',
          },
        ),
        step(
          'cerulean-cross',
          'Find the cross at the Cerulean Coast, then talk to him',
          {
            kind: 'talk',
            where: {
              grace: CERULEAN_COAST_CROSS,
              note: 'See the cross here, then talk to him at Main Gate Cross',
            },
            flagTodo:
              'talk to Ansbach after seeing the Cerulean Coast Cross; the flag that flips',
          },
        ),
      ],
    ),
    step(
      'after-charm',
      'Once Miquella’s charm breaks, talk to him at Main Gate Cross',
      {
        kind: 'talk',
        done: any(
          talk(
            2045429227,
            'post-charm talk (gates his move to the Storehouse)',
          ),
          stage('storehouse'),
          stage('enirIlim'),
          stage('afterRadahn'),
        ),
        evidence: 'script',
        requires: [needsGate(GATES.miquellaCharmBroken)],
        where: { grace: MAIN_GATE_CROSS },
      },
    ),
    step(
      'storehouse',
      'Talk to him in the Shadow Keep’s Specimen Storehouse, first floor',
      {
        kind: 'talk',
        requires: [
          {
            cond: any(
              stage('storehouse'),
              stage('enirIlim'),
              stage('afterRadahn'),
            ),
            label:
              'Ansbach has moved to the Storehouse (enter the Specimen Storehouse)',
          },
        ],
        where: { grace: STOREHOUSE_FIRST_FLOOR },
        flagTodo:
          'first talk with Ansbach in the Specimen Storehouse; the flag that flips',
      },
    ),
    step('freyja-request', 'Ask him for help on Freyja’s behalf', {
      kind: 'talk',
      requires: [
        {
          cond: reached('freyja', 'storehouse-talk'),
          label: 'Hear Freyja out on the Storehouse’s seventh floor',
        },
      ],
      where: { grace: STOREHOUSE_FIRST_FLOOR },
      flagTodo:
        'ask Ansbach for help with Freyja’s question; the flag that flips',
    }),
    step(
      'secret-rite-scroll',
      'Find the Secret Rite Scroll on the Storehouse’s fourth floor',
      {
        kind: 'item',
        done: any(
          pickup(21017340, 'Secret Rite Scroll picked up'),
          has(2008014, 'Secret Rite Scroll'),
        ),
        evidence: 'script',
        where: { grace: STOREHOUSE_FOURTH_FLOOR },
        rewards: ['Secret Rite Scroll'],
      },
    ),
    step('give-scroll', 'Give him the Secret Rite Scroll: Letter for Freyja', {
      kind: 'talk',
      done: any(
        pickup(400620, 'Letter for Freyja received'),
        has(2008015, 'Letter for Freyja'),
      ),
      evidence: 'script',
      lockedBy: [lockedByGate(GATES.sealingTreeBurned)],
      where: { grace: STOREHOUSE_FIRST_FLOOR },
      rewards: ['Letter for Freyja'],
    }),
    // A detour, not a step: if Freyja's questline has failed, her answer never comes, and that
    // mustn't stall the rest of his.
    detour(
      'freyja-reply',
      'Freyja’s answer',
      { reward: 'His reaction to Freyja’s answer' },
      [
        step('freyja-reply-talk', 'Pass on Freyja’s answer to him', {
          kind: 'talk',
          requires: [
            {
              cond: reached('freyja', 'give-letter'),
              label: 'Deliver the Letter for Freyja',
            },
          ],
          where: { grace: STOREHOUSE_FIRST_FLOOR },
          flagTodo:
            'talk to Ansbach after giving Freyja his letter; the flag that flips',
        }),
      ],
    ),
    step(
      'survive-leda',
      'Keep Leda from getting him: in the Storehouse, help Ansbach or ignore both signs',
      {
        kind: 'event',
        done: any(
          flag(7622, 'boss', 'helped Ansbach against Leda'),
          stage('enirIlim'),
          stage('afterRadahn'),
        ),
        evidence: 'script',
        requires: [needsGate(GATES.messmer)],
        lockedBy: [lockedByDecision('leda', 'hunt-ansbach')],
        where: { grace: STOREHOUSE_FIRST_FLOOR },
        note: 'Siding with Leda here kills him and ends his questline.',
      },
    ),
    detour(
      'enir-ilim-summon',
      'Fight alongside Ansbach in Enir-Ilim',
      {
        lockedBy: [lockedByGate(GATES.consortRadahn)],
        reward: 'Ansbach’s help against Miquella’s Faithful and Radahn',
      },
      [
        step(
          'summon',
          'Summon Ansbach against Miquella’s Faithful and Promised Consort Radahn',
          {
            kind: 'boss',
            requires: [needsGate(GATES.sealingTreeBurned)],
            where: { note: 'Enir-Ilim' },
          },
        ),
        step(
          'last-talk',
          'Talk to him at the top of the lift past the Cleansing Chamber Anteroom',
          {
            kind: 'talk',
            where: { grace: CLEANSING_CHAMBER_ANTEROOM },
            flagTodo:
              'talk to Ansbach above the Cleansing Chamber Anteroom lift; the flag that flips',
          },
        ),
      ],
    ),
    step(
      'parting-gifts',
      'After Promised Consort Radahn falls, claim Ansbach’s parting gifts',
      {
        kind: 'item',
        done: any(
          stage('afterRadahn'),
          pickup(400624, 'Ansbach’s parting gifts'),
          has(2006300, 'Furious Blade of Ansbach'),
        ),
        evidence: 'script',
        requires: [needsGate(GATES.consortRadahn)],
        where: { note: 'Enir-Ilim' },
        note: 'He dies after the fight; his gifts lie with his body.',
        rewards: [
          "Wise Man's Mask",
          "Ansbach's Attire",
          "Ansbach's Manchettes",
          "Ansbach's Boots",
          'Obsidian Lamina',
          'Furious Blade of Ansbach',
        ],
      },
    ),
  ],
);
