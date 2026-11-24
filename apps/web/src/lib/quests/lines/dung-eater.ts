import { any, boss, flag, has, pickup, reached, talk } from '../cond';
import {
  choice,
  defineQuest,
  detour,
  lockedByDecision,
  path,
  statusBlock,
  step,
} from '../model';

const TABLE_OF_LOST_GRACE = 71190;
const UNDERGROUND_ROADSIDE = 73501;
const CAPITAL_RAMPART = 76314;

/**
 * The Dung Eater (status block 4240, "323_糞喰い"; his talk flags sit in the unnamed 11109950,
 * 35009300 and 1045529200 blocks, so their meanings come from the scripts and the flag log).
 *
 * Stage machine (`common.evs.py` `Event_4259`): 4245 at Roundtable Hold → 4246 on talk 11109957
 * "handed over the Sewer-Gaol Key" → 4247 on 35009306 "told him to leave his gaol" → 4248 once
 * his invasion at the Leyndell outer moat is beaten (1045520180; `m60_45_52`) → 4249, back in
 * his cell (`m35_00_00_00`), on talk 11109959 → 4251 on 35009326, Seluvis's Potion (he then
 * stands as a puppet; `m60_34_50`). Instead of the potion, the second Seedbed Curse cutscene
 * (`m35` `Event_35003722`) sets 35009323 + 35009333 and kills him (4243).
 */
export const dungEater = defineQuest(
  {
    id: 'dung-eater',
    npc: 'Dung Eater',
    isDlc: false,
    blurb:
      'A loathsome Roundtable guest who defiles the dead with his curse, and asks you to free his body from its cell.',
    // The second curse cutscene kills him (4243): expected once the curses are planted.
    status: { ...statusBlock(4240), diesAfter: 'feed-curses' },
    stages: {
      roundtable: 4245,
      hasKey: 4246,
      released: 4247,
      invaderBeaten: 4248,
      backInCell: 4249,
      puppet: 4251,
    },
    sources: [
      'soulsmods elden-ring-eventparam status block 4240 (323_糞喰い)',
      'soulstruct common.evs.py Event_4259 (stage transitions); m11_10, m35_00, m60_45_52 map events',
      'er-save-manager quest_flags_db.py "Dung Eater" (observed talk, pickup and item-lot flags)',
      'NPC Quests & Endings Guide v5 flowchart, Dung Eater column (ordering, Seluvis fork)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Talk to the Dung Eater at Roundtable Hold', {
      kind: 'talk',
      done: talk(11109955, 'first talk'),
      evidence: 'observed',
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    step('seedbed-curse', 'Find a Seedbed Curse', {
      kind: 'item',
      done: any(
        has(8193, 'Seedbed Curse'),
        pickup(16007700, 'Seedbed Curse (Volcano Manor)'),
        pickup(11007340, 'Seedbed Curse (Leyndell)'),
        pickup(11007850, 'Seedbed Curse (Leyndell)'),
        pickup(15007840, 'Seedbed Curse (Elphael)'),
        pickup(15007750, 'Seedbed Curse (Elphael)'),
      ),
      evidence: 'observed',
      where: {
        note: 'Volcano Manor, Leyndell (two), Elphael (two), or Boggart’s body',
      },
    }),
    step('sewer-key', 'Talk to him again to receive the Sewer-Gaol Key', {
      kind: 'talk',
      done: any(
        talk(11109957, 'handed over the key'),
        pickup(400380, 'Sewer-Gaol Key received'),
      ),
      evidence: 'script',
      rewards: ['Sewer-Gaol Key'],
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    step('release', 'Open his cell beneath Leyndell and tell him to leave', {
      kind: 'talk',
      done: talk(35009306, 'told him to leave his gaol'),
      evidence: 'script',
      where: {
        grace: UNDERGROUND_ROADSIDE,
        note: 'His cell is in the Subterranean Shunning-Grounds.',
      },
    }),
    step('invader', 'Defeat the Dung Eater when he invades at the outer moat', {
      kind: 'boss',
      done: boss(1045520180, 'Dung Eater invasion beaten'),
      evidence: 'script',
      rewards: ['Sword of Milos'],
      where: { grace: CAPITAL_RAMPART },
      note: 'If Boggart is at the moat, the invasion follows his dying words.',
    }),
    step('message', 'Find what he left in his Roundtable Hold room', {
      kind: 'talk',
      done: any(
        talk(11109959, 'Hold follow-up after the invasion'),
        stage('backInCell'),
      ),
      evidence: 'script',
      where: { grace: TABLE_OF_LOST_GRACE },
      note: 'His body is now back in its cell.',
    }),
    choice('fate', 'Decide what to do with his body in the cell', [
      path(
        'seluvis-potion',
        'Feed him Seluvis’s Potion',
        [
          step('give-potion', 'Give his body Seluvis’s Potion', {
            kind: 'action',
            done: any(talk(35009326, 'fed Seluvis’s Potion'), stage('puppet')),
            evidence: 'script',
            requires: [
              {
                cond: reached('seluvis', 'potion'),
                label: 'Accept Seluvis’s Potion from Seluvis',
              },
            ],
            // Seluvis hands out only one potion.
            lockedBy: [lockedByDecision('nepheli', 'puppet')],
            unlocks: ['The Dung Eater Puppet in Seluvis’s shop'],
            where: { grace: UNDERGROUND_ROADSIDE },
          }),
        ],
        {
          ending:
            'He becomes one of Seluvis’s puppets; the Blessing of Despair ending is lost',
          failure: true,
        },
      ),
      path(
        'seedbed-curses',
        'Plant Seedbed Curses in his body',
        [
          step('gather-curses', 'Collect five Seedbed Curses', {
            kind: 'item',
            requires: [
              {
                cond: has(8193, 'Seedbed Curse', 5),
                label:
                  'Carry five Seedbed Curses (fewer if some are already planted)',
              },
            ],
            note: 'Six exist: Volcano Manor, Leyndell (two), Elphael (two), and Boggart’s body.',
          }),
          step('feed-curses', 'Use the curses on his body in the cell', {
            kind: 'action',
            done: any(
              talk(35009323, 'final curse cutscene'),
              talk(35009333, 'he has died of the curses'),
            ),
            evidence: 'script',
            where: { grace: UNDERGROUND_ROADSIDE },
            note: 'Two cutscenes play; after the second he dies.',
          }),
          step('rune-pickup', 'Take the Mending Rune of the Fell Curse', {
            kind: 'item',
            done: any(
              flag(
                9504,
                'pickup',
                'holding the Mending Rune of the Fell Curse',
              ),
              has(8184, 'Mending Rune of the Fell Curse'),
            ),
            evidence: 'observed',
            rewards: ['Mending Rune of the Fell Curse'],
            unlocks: ['The Blessing of Despair ending'],
            where: { grace: UNDERGROUND_ROADSIDE },
          }),
          detour(
            'armor',
            'Loot his body',
            { reward: 'The Omen set (helm, armor, gauntlets, greaves)' },
            [
              step('armor-pickup', 'Rest, then take his armor from the cell', {
                kind: 'item',
                done: pickup(400382, 'Omen set taken'),
                evidence: 'observed',
                rewards: [
                  'Omen Helm',
                  'Omen Armor',
                  'Omen Gauntlets',
                  'Omen Greaves',
                ],
                where: { grace: UNDERGROUND_ROADSIDE },
              }),
            ],
          ),
        ],
        {
          ending:
            'The curses kill him; his Mending Rune opens the Blessing of Despair ending',
        },
      ),
    ]),
  ],
);
