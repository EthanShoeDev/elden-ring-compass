import { all, any, boss, pickup, reached, talk } from '../cond';
import { defineGate, GATES } from '../gates';
import {
  choice,
  defineQuest,
  detour,
  lockedByDecision,
  lockedByGate,
  lockedWhen,
  needsGate,
  path,
  statusBlock,
  step,
} from '../model';

const TABLE_OF_LOST_GRACE = 71190;
const VILLAGE_OF_THE_ALBINAURICS = 76220;
const THE_FOUR_BELFRIES = 76227;
const GODRICK_THE_GRAFTED = 71000;

/** The Omenkiller at the Village of the Albinaurics (`1035420800`), a quest-specific boss here. */
const omenkiller = defineGate(
  'omenkiller',
  'Defeat the Omenkiller at the Village of the Albinaurics',
  boss(1035420800, 'Omenkiller'),
);

/**
 * Nepheli Loux (status 4220 `百智卿の娘（ネフェリ）`). Her talk flags live in map-local blocks
 * (Stormveil 10009700, Roundtable 11109900, Albinaurics 1034429200) with no per-flag names in the
 * eventparam dump, so single talk flags come from the community flag log.
 *
 * Stage machine (`common.evs.py` `Event_4239`): 4225 Stormveil → 4226 Roundtable on Godrick's death
 * (9101) → 4227 Village of the Albinaurics on 11109909 (her third Roundtable talk) → 4228 back at the
 * Hold on Omenkiller (1035420800) ∧ 1034429205 (talked at the village) → 4229 lord of Stormveil on
 * 10009722, which `m10_00` Event_10003780 sets only once Godrick (9101) and Morgott (9104) are dead
 * and she holds the Stormhawk King (11109921), after three visits; or 4230 (Seluvis's puppet, on
 * 11109919: Seluvis's potion). She dies (4223) if the Erdtree burns while she is in 4225–4227, or if
 * Maliketh falls (9116) while she is in 4228 without the Stormhawk King.
 */
export const nepheli = defineQuest(
  {
    id: 'nepheli',
    npc: 'Nepheli Loux',
    isDlc: false,
    blurb:
      'Gideon’s warrior foster-daughter, who can become the rightful lord of Stormveil Castle.',
    status: statusBlock(4220),
    stages: {
      stormveil: 4225,
      roundtable: 4226,
      albinaurics: 4227,
      backAtHold: 4228,
      lord: 4229,
      puppet: 4230,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_Common (status block, talk flag ranges)',
      'soulstruct common.evs.py Event_4239 (stage transitions, deaths); m10_00 Event_10003780 (lordship)',
      'er-save-manager quest_flags_db.py "Nepheli Loux" (observed talk / pickup flags)',
      'NPC Quests & Endings Guide v5 flowchart, Nepheli Loux column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Nepheli inside Stormveil Castle', {
      kind: 'talk',
      done: talk(10009705, 'first conversation'),
      evidence: 'observed',
      where: { note: 'Stormveil Castle, before Godrick' },
    }),
    detour(
      'godrick-summon',
      'Fight Godrick alongside Nepheli',
      {
        lockedBy: [lockedByGate(GATES.godrick)],
        reward: 'Her help against Godrick',
      },
      [
        step('godrick-summon-sign', 'Summon her sign outside Godrick’s arena', {
          kind: 'boss',
          unlocks: ['Nepheli as a summon against Godrick'],
        }),
      ],
    ),
    step('arsenal-charm', 'Talk to Nepheli at Roundtable Hold: Arsenal Charm', {
      kind: 'talk',
      done: any(
        pickup(400420, 'Arsenal Charm'),
        talk(11109905, 'first Roundtable talk'),
      ),
      evidence: 'observed',
      where: { grace: TABLE_OF_LOST_GRACE },
      requires: [needsGate(GATES.godrick)],
      lockedBy: [lockedByGate(GATES.erdtreeBurned)],
      rewards: ['Arsenal Charm'],
    }),
    step(
      'leaves-hold',
      'Keep talking until she sets out after her foster father’s errand',
      {
        kind: 'talk',
        done: talk(11109909, 'third Roundtable talk'),
        evidence: 'script',
        where: { grace: TABLE_OF_LOST_GRACE },
        lockedBy: [lockedByGate(GATES.erdtreeBurned)],
        reload: true,
      },
    ),
    step('albinaurics', 'Talk to her at the Village of the Albinaurics', {
      kind: 'talk',
      done: talk(1034429205, 'first talk at the village'),
      evidence: 'script',
      where: { grace: VILLAGE_OF_THE_ALBINAURICS },
      lockedBy: [lockedByGate(GATES.erdtreeBurned)],
    }),
    detour(
      'omenkiller-summon',
      'Fight the Omenkiller alongside Nepheli',
      {
        lockedBy: [lockedByGate(omenkiller)],
        reward: 'Her help against the Omenkiller',
      },
      [
        step('omenkiller-summon-sign', 'Summon her sign at the village', {
          kind: 'boss',
          unlocks: ['Nepheli as a summon against the Omenkiller'],
        }),
      ],
    ),
    step('omenkiller', 'Defeat the Omenkiller', {
      kind: 'boss',
      // Only counts after meeting her at the village: the boss can die without her.
      done: all(omenkiller.cond, talk(1034429205)),
      evidence: 'script',
      where: { grace: VILLAGE_OF_THE_ALBINAURICS },
      lockedBy: [lockedByGate(GATES.erdtreeBurned)],
      reload: true,
    }),
    step('back-at-hold', 'Find her at the foot of the Roundtable stairs', {
      kind: 'talk',
      done: any(talk(11109923, 'asked to be left alone'), stage('backAtHold')),
      evidence: 'observed',
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    step('gideon-news', 'Tell her what you heard from Gideon', {
      kind: 'talk',
      done: any(
        talk(11109916, '“I heard about Gideon” offered'),
        talk(11109917, 'talk about Gideon played'),
      ),
      evidence: 'observed',
      where: { grace: TABLE_OF_LOST_GRACE },
      requires: [
        {
          cond: reached('gideon', 'about-nepheli'),
          label: 'Ask Gideon about Nepheli',
        },
      ],
    }),
    step(
      'stormhawk-king',
      'Reach the Chapel of Anticipation through the Four Belfries, beat the Grafted Scion and take the Stormhawk King ash',
      {
        kind: 'item',
        // The ash can be taken without her questline, so only count it once she is back at the Hold.
        done: all(
          pickup(10017010, 'Stormhawk King picked up'),
          any(talk(11109923), talk(11109916), talk(11109917)),
        ),
        evidence: 'observed',
        where: { grace: THE_FOUR_BELFRIES },
        rewards: ['The Stormhawk King'],
      },
    ),
    choice('fate', 'What to give Nepheli', [
      path(
        'stormhawk',
        'Give her the Stormhawk King',
        [
          step('give-stormhawk', 'Give Nepheli the Stormhawk King', {
            kind: 'talk',
            done: talk(11109921, 'Stormhawk King given'),
            evidence: 'script',
            where: { grace: TABLE_OF_LOST_GRACE },
            // Maliketh's death kills her if she never got the ash (`Event_4239`).
            lockedBy: [lockedByGate(GATES.maliketh)],
          }),
          step(
            'lord',
            'After Morgott falls, rest a few times and find her on Stormveil’s throne',
            {
              kind: 'talk',
              done: any(
                stage('lord'),
                talk(10009715, 'first throne-room talk'),
              ),
              evidence: 'script',
              where: { grace: GODRICK_THE_GRAFTED },
              requires: [needsGate(GATES.morgott)],
              reload: true,
              unlocks: ['Nepheli as lord of Stormveil Castle'],
            },
          ),
          step(
            'smithing-stone',
            'Talk to her again: Ancient Dragon Smithing Stone',
            {
              kind: 'talk',
              done: any(
                pickup(400422, 'Ancient Dragon Smithing Stone'),
                talk(10009716, 'second throne-room talk'),
              ),
              evidence: 'observed',
              where: { grace: GODRICK_THE_GRAFTED },
              rewards: ['Ancient Dragon Smithing Stone'],
            },
          ),
          detour(
            'godfrey-summon',
            'Fight Godfrey alongside Nepheli',
            { reward: 'Her help against Godfrey in the Ashen Capital' },
            [
              step(
                'godfrey-summon-sign',
                'Summon her sign before Godfrey, First Elden Lord',
                {
                  kind: 'boss',
                  requires: [needsGate(GATES.maliketh)],
                  unlocks: ['Nepheli as a summon against Godfrey'],
                },
              ),
            ],
          ),
        ],
        { ending: 'Lord of Stormveil' },
      ),
      path(
        'puppet',
        'Give her Seluvis’s potion',
        [
          step('potion', 'Give Nepheli Seluvis’s potion', {
            kind: 'talk',
            done: any(stage('puppet'), talk(11109919, 'potion given')),
            evidence: 'assumed',
            where: { grace: TABLE_OF_LOST_GRACE },
            requires: [
              {
                cond: reached('seluvis', 'potion'),
                label: 'Get Seluvis’s Potion (Seluvis’s questline)',
              },
            ],
            // Seluvis hands out a single potion: Nepheli, Gideon or the Dung Eater gets it.
            lockedBy: [
              lockedByDecision('dung-eater', 'seluvis-potion'),
              lockedWhen(
                reached('gideon', 'give-potion'),
                'Give Seluvis’s Potion to Gideon',
                'Seluvis’s Potion went to Gideon',
              ),
            ],
            unlocks: ['Nepheli Loux Puppet among Seluvis’s puppets'],
          }),
        ],
        { ending: 'Seluvis’s puppet (questline failed)', failure: true },
      ),
    ]),
  ],
);
