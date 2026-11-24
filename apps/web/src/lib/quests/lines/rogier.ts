import { all, any, flag, has, not, pickup, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  type Lock,
  lockedByGate,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const TABLE_OF_LOST_GRACE = 71190;
const BLACK_KNIFE_CATACOMBS = 73005;
const RANNIS_RISE = 76228;

/** Either of these sends Rogier into his final sleep before his investigation is done. */
const SLUMBER_LOCKS: ReadonlyArray<Lock> = [
  lockedByGate(GATES.erdtreeBurned),
  lockedWhen(
    reached('ranni', 'give-blade'),
    'Give Ranni the Fingerslayer Blade (Rogier falls into his last sleep)',
    'Ranni has the Fingerslayer Blade, and Rogier has fallen into his last sleep',
  ),
];

/**
 * Sorcerer Rogier (talk block NPC325, status 3900).
 *
 * Stage machine (`common.evs.py` `Event_3919`): 3905 in Stormveil → 3906 away, once Godrick dies
 * (9101) or on 10009610 → 3907 at Roundtable Hold (3906 ∧ 9101) → 3908 asleep, on his last talk
 * (11109532), on Ranni getting the Fingerslayer Blade (1034509421), or when the Erdtree burns
 * unless the Black Knifeprint findings (11109506) are in and you haven't met Ranni yet → 3909
 * after a few more loads (counter 11109545 ≥ 2), which also sets his death flag 3903.
 *
 * His death is the scripted end of the questline (`diesAfter: 'roundtable'`): from then on 3903
 * is expected, and killing him yourself is told apart by the quest lock (dead without 3909).
 *
 * Talk flags are named in `EFID_Talk_NPC325` (10009617 met, 10009604 learned his Ash of War,
 * 11109505 first Hold talk, 11109520 told him of Godrick, 11109521/22 corpse / D, 11109527 handed
 * over the knifeprint, 11109506 findings, 11109507 Ranni's whereabouts, 11109518 Ranni's doings,
 * 11109528 saw the corpse under Stormveil); his last talk and the loot are from the flag log.
 */
export const rogier = defineQuest(
  {
    id: 'rogier',
    npc: 'Sorcerer Rogier',
    isDlc: false,
    blurb:
      'A Tarnished sorcerer investigating the Night of the Black Knives, who points you to the witch Ranni.',
    status: { ...statusBlock(3900), diesAfter: 'roundtable' },
    stages: {
      stormveil: 3905,
      away: 3906,
      roundtable: 3907,
      asleep: 3908,
      dead: 3909,
    },
    lockedBy: [
      lockedWhen(
        all(flag(3903, 'status', 'Rogier is dead'), not(flag(3909, 'stage'))),
        'Kill Rogier',
        'Rogier was killed',
      ),
    ],
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC325 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3919 (stage transitions)',
      'er-save-manager quest_flags_db.py "Sorcerer Rogier" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Rogier column (ordering, missables)',
    ],
  },
  ({ stage }) => [
    detour(
      'stormveil',
      'Meet Rogier in Stormveil Castle',
      {
        lockedBy: [lockedByGate(GATES.godrick)],
        reward:
          'Meeting Rogier early (dialogue only; his shop reopens at Roundtable Hold)',
      },
      [
        step('meet-stormveil', 'Meet Rogier inside Stormveil Castle', {
          kind: 'talk',
          done: talk(10009617, 'met Rogier'),
          evidence: 'script',
          where: { note: 'Stormveil Castle, past the main gate' },
          unlocks: ['Rogier’s shop: Ashes of War'],
        }),
        step('learn-skill', 'Buy an Ash of War from him', {
          kind: 'action',
          done: talk(10009604, 'learned his Ash of War'),
          evidence: 'script',
          where: { note: 'Stormveil Castle' },
        }),
      ],
    ),
    step('roundtable', 'Find Rogier at Roundtable Hold', {
      kind: 'talk',
      done: any(talk(11109505, 'first Hold talk'), stage('roundtable')),
      evidence: 'script',
      requires: [needsGate(GATES.godrick)],
      where: { grace: TABLE_OF_LOST_GRACE },
      unlocks: ['Rogier’s shop: Ashes of War'],
    }),
    step('report-godrick', 'Tell him Godrick is dead: Rogier’s Rapier', {
      kind: 'talk',
      done: talk(11109520, 'told him of Godrick'),
      evidence: 'script',
      where: { grace: TABLE_OF_LOST_GRACE },
      rewards: ["Rogier's Rapier"],
    }),
    detour(
      'stormveil-letter',
      'Find Rogier’s Letter in Stormveil Castle',
      { reward: "Rogier's Letter, early (a copy is also on his body)" },
      [
        step('letter-pickup', 'Pick up Rogier’s Letter in Stormveil Castle', {
          kind: 'item',
          where: { note: 'Stormveil Castle, near the Secluded Cell' },
          rewards: ["Rogier's Letter"],
          flagTodo:
            'Pick up Rogier’s Letter in Stormveil Castle (Secluded Cell area); record the pickup flag that flips',
        }),
      ],
    ),
    step(
      'stormveil-corpse',
      'Find the misshapen corpse beneath Stormveil Castle',
      {
        kind: 'action',
        done: talk(11109528, 'saw the corpse under Stormveil'),
        evidence: 'script',
        lockedBy: SLUMBER_LOCKS,
        where: { note: 'Stormveil Castle, below the Liftside Chamber' },
      },
    ),
    step(
      'ask-black-knives',
      'Ask Rogier about the corpse, the Night of the Black Knives and D',
      {
        kind: 'talk',
        done: any(
          talk(11109521, 'about the corpse'),
          talk(11109522, 'about D'),
        ),
        evidence: 'script',
        lockedBy: SLUMBER_LOCKS,
        where: { grace: TABLE_OF_LOST_GRACE },
      },
    ),
    step(
      'find-knifeprint',
      'Find the Black Knifeprint in the Black Knife Catacombs',
      {
        kind: 'item',
        done: has(8172, 'Black Knifeprint'),
        evidence: 'script',
        lockedBy: SLUMBER_LOCKS,
        where: { grace: BLACK_KNIFE_CATACOMBS },
      },
    ),
    step('give-knifeprint', 'Lend Rogier the Black Knifeprint', {
      kind: 'talk',
      done: talk(11109527, 'handed over the knifeprint'),
      evidence: 'script',
      lockedBy: SLUMBER_LOCKS,
      where: { grace: TABLE_OF_LOST_GRACE },
      reload: true,
    }),
    step('findings', 'Get the knifeprint back with his findings', {
      kind: 'talk',
      done: talk(11109506, 'heard his findings'),
      evidence: 'script',
      lockedBy: SLUMBER_LOCKS,
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    step('ranni-whereabouts', 'Ask Rogier where to find the witch Ranni', {
      kind: 'talk',
      done: talk(11109507, 'about Ranni’s whereabouts'),
      evidence: 'script',
      lockedBy: [
        ...SLUMBER_LOCKS,
        lockedWhen(
          any(
            talk(1034509410, 'entered Ranni’s service'),
            talk(1034509431, 'turned Ranni down'),
          ),
          'Talk to Ranni at the Three Sisters before Rogier sends you',
          'You met Ranni before Rogier sent you to her',
        ),
      ],
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    step('meet-ranni', 'Speak to Ranni at her Rise about the cursemark', {
      kind: 'talk',
      done: talk(1034509432, 'Ranni’s cursemark talk'),
      evidence: 'observed',
      lockedBy: SLUMBER_LOCKS,
      where: { grace: RANNIS_RISE },
      note: 'Rogier’s word opens a different way into her service.',
    }),
    step('report-ranni', 'Tell Rogier what Ranni did with her cursemark', {
      kind: 'talk',
      done: talk(11109518, 'about Ranni’s doings'),
      evidence: 'script',
      lockedBy: SLUMBER_LOCKS,
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    detour(
      'last-words',
      'Rogier’s last words',
      {
        lockedBy: SLUMBER_LOCKS,
        reward: 'Rogier’s last conversation (dialogue only, no item)',
      },
      [
        step('last-talk', 'Talk to Rogier once more before he sleeps', {
          kind: 'talk',
          done: talk(11109532, 'last talk played'),
          evidence: 'observed',
          where: { grace: TABLE_OF_LOST_GRACE },
          reload: true,
        }),
      ],
    ),
    step(
      'farewell',
      'After a few rests, take Rogier’s gear and letter from his body',
      {
        kind: 'item',
        done: any(
          pickup(400359, 'Rogier’s Bell Bearing and armor'),
          has(8941, 'Rogier’s Bell Bearing'),
        ),
        evidence: 'observed',
        requires: [
          { cond: stage('dead'), label: 'Rogier has passed away in his sleep' },
        ],
        where: { grace: TABLE_OF_LOST_GRACE },
        rewards: [
          "Rogier's Bell Bearing",
          "Spellblade's Pointed Hat",
          "Spellblade's Traveling Attire",
          "Spellblade's Gloves",
          "Spellblade's Trousers",
          "Rogier's Letter",
        ],
      },
    ),
  ],
);
