import { any, boss, has, pickup, reached, talk } from '../cond';
import { defineGate, GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByGate,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const CHURCH_OF_ELLEH = 76100;
const RANNIS_RISE = 76228;
const RANNIS_CHAMBER = 76247;
const NIGHTS_SACRED_GROUND = 71226;
const DIVINE_TOWER_OF_LIURNIA = 73422;
const AINSEL_RIVER_MAIN = 71214;
const NOKSTELLA = 71215;
const NOKSTELLA_WATERFALL_BASIN = 71219;
const GRAND_LIBRARY = 71400;
const CATHEDRAL_OF_MANUS_CELES = 76251;

/** Caria Manor's boss guards the way up to the Three Sisters. */
export const LORETTA = defineGate(
  'loretta',
  'Defeat Royal Knight Loretta at Caria Manor',
  boss(1035500800, 'Royal Knight Loretta'),
);

/**
 * Ranni the Witch (status 3740, no `EFID_Talk_NPC106` block: her talk flags are named only by
 * range, `会話用フラグ_106_ラニ` 1034509400–449 at the Rise, 1042369400–449 as Renna, 12019050+ as
 * the doll, 1035429250+ at the Cathedral).
 *
 * Stage machine (`common.evs.py` `Event_3759`): 3745 initial → 3746 Renna waits at the Church of
 * Elleh (on 1042369411) → 3747 at Ranni's Rise, once Renna's talk ends (1042369410 / 1042369407)
 * or, skipping Renna, once you reach the Rise (1034509419) or light a Liurnia grace (3062) → 3748
 * asleep in her chamber, on 1034509416 ("all three retainers spoken to") → 3749 gone on her
 * journey, on 1034509421 (talk after handing over the Fingerslayer Blade) → 3750 at the Cathedral
 * of Manus Celes, on 1035420150 (ring cutscene; from ANY stage) → 3751 after the talk there
 * (1034509406). 3748 ∧ 1034509425 (she drank Seluvis's Amber Draught) turns her hostile-absolvable
 * (3741) and hides her.
 *
 * `m60_34_50_00.evs.py`: 1034509419 = came within 10 m of Ranni; 1034509410 = entered her service
 * (sets 1034509412 too while Radahn lives); 1034509417 = Seluvis (1034509306) ∧ Iji (1034509358)
 * ∧ (Blaidd 1034509205 ∨ joined after Radahn); she is hidden while the Radahn Festival is on
 * (1034502748: Blaidd fixed at the festival ∧ 9410 ∧ ¬9412). The rest of the Nokron/Ainsel and
 * Cathedral flags are from the community flag log.
 */
export const ranni = defineQuest(
  {
    id: 'ranni',
    npc: 'Ranni the Witch',
    isDlc: false,
    blurb:
      'A Carian witch who cast off her flesh and plots against the Greater Will, enlisting you to recover a god-slaying blade and her Dark Moon Ring.',
    status: statusBlock(3740),
    stages: {
      initial: 3745,
      renna: 3746,
      rise: 3747,
      slumber: 3748,
      departed: 3749,
      cathedral: 3750,
      ending: 3751,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_Common (status block 3740, talk flag ranges)',
      'soulstruct common.evs.py Event_3759 (stage transitions); m60_34_50_00.evs.py (Ranni’s Rise events)',
      'er-save-manager quest_flags_db.py "Ranni the Witch" (observed flags)',
      'NPC Quests & Endings Guide v5 flowchart, Ranni column (ordering, missables)',
    ],
  },
  ({ stage }) => [
    detour(
      'renna',
      'Meet “Renna” at the Church of Elleh',
      {
        lockedBy: [
          lockedByGate(GATES.liurniaGrace),
          lockedWhen(
            talk(1034509419, 'reached Ranni at her Rise'),
            'Reach Ranni at her Rise',
            'You reached Ranni at her Rise first',
          ),
        ],
        reward:
          'Spirit Calling Bell and Lone Wolf Ashes from Renna (the Twin Maiden Husks sell both later)',
      },
      [
        step(
          'meet-renna',
          'Rest at the Church of Elleh at night and accept Renna’s gifts',
          {
            kind: 'talk',
            done: any(
              talk(1042369410, 'Renna’s farewell played'),
              talk(1042369407, 'Renna’s first talk ended'),
            ),
            evidence: 'script',
            requires: [
              {
                cond: reached('melina', 'accept'),
                label: 'Get Torrent from Melina',
              },
            ],
            where: { grace: CHURCH_OF_ELLEH },
            rewards: ['Spirit Calling Bell', 'Lone Wolf Ashes'],
          },
        ),
      ],
    ),
    step('reach-rise', 'Climb Ranni’s Rise and approach the witch', {
      kind: 'talk',
      done: talk(1034509419, 'came within reach of Ranni'),
      evidence: 'script',
      requires: [needsGate(LORETTA)],
      where: { grace: RANNIS_RISE },
      note: 'She is away while the Radahn Festival is on, and returns once Radahn falls.',
    }),
    step('join', 'Agree to enter Ranni’s service', {
      kind: 'talk',
      done: talk(1034509410, 'entered her service'),
      evidence: 'script',
      where: { grace: RANNIS_RISE },
      note: 'Turning her down first is fine. Talk to Rogier and come back to accept.',
    }),
    step(
      'retainers',
      'Speak with her retainers in the tower: Blaidd, Iji and Seluvis',
      {
        kind: 'talk',
        done: talk(1034509417, 'all retainers spoken to'),
        evidence: 'script',
        where: { grace: RANNIS_RISE },
        note: 'Blaidd’s spirit only counts if you joined while Radahn still lived.',
      },
    ),
    step('slumber', 'Report back to Ranni; she withdraws to rest', {
      kind: 'talk',
      done: any(talk(1034509416, 'retainer round reported'), stage('slumber')),
      evidence: 'script',
      where: { grace: RANNIS_RISE },
    }),
    step(
      'fingerslayer',
      'Find the Fingerslayer Blade in Nokron, Eternal City',
      {
        kind: 'item',
        done: any(
          pickup(12027080, 'Fingerslayer Blade picked up'),
          has(8159, 'Fingerslayer Blade'),
        ),
        evidence: 'observed',
        requires: [needsGate(GATES.radahn)],
        where: { grace: NIGHTS_SACRED_GROUND },
        rewards: ['Fingerslayer Blade'],
      },
    ),
    step(
      'give-blade',
      'Give Ranni the Fingerslayer Blade and take the Carian Inverted Statue',
      {
        kind: 'talk',
        done: any(talk(1034509421, 'talk after the blade'), stage('departed')),
        evidence: 'script',
        where: { grace: RANNIS_RISE },
        note: 'Seluvis dies once she has the blade, and Rogier falls into his last sleep.',
        rewards: ['Carian Inverted Statue'],
        unlocks: ['The Ranni’s Chamber Site of Grace, in her empty room'],
      },
    ),
    step(
      'cursemark',
      'Use the statue in the Carian Study Hall and claim the Cursemark of Death atop the Divine Tower',
      {
        kind: 'item',
        done: any(
          pickup(34117500, 'Cursemark of Death picked up'),
          has(8191, 'Cursemark of Death'),
        ),
        evidence: 'observed',
        where: { grace: DIVINE_TOWER_OF_LIURNIA },
        rewards: ['Cursemark of Death'],
      },
    ),
    step(
      'miniature-ranni',
      'Climb Renna’s Rise, take its portal down to Ainsel River Main and pick up the doll',
      {
        kind: 'item',
        done: any(
          pickup(12015062, 'Miniature Ranni picked up'),
          has(8146, 'Miniature Ranni'),
          has(8187, 'Miniature Ranni'),
        ),
        evidence: 'observed',
        where: { grace: AINSEL_RIVER_MAIN },
        note: 'The chest at the top of Renna’s Rise holds the Snow Witch set.',
        rewards: [
          'Snow Witch Hat',
          'Snow Witch Robe',
          'Snow Witch Skirt',
          'Miniature Ranni',
        ],
      },
    ),
    step(
      'doll-speaks',
      'Rest and talk to the doll until Ranni answers through it',
      {
        kind: 'talk',
        done: any(
          talk(12019257, 'third doll talk'),
          talk(12019258, 'Ranni asks you to deal with the Baleful Shadow'),
        ),
        evidence: 'observed',
        where: { grace: AINSEL_RIVER_MAIN },
      },
    ),
    detour(
      'nokstella-talks',
      'Talk to the doll on the way through Nokstella',
      {
        lockedBy: [
          lockedWhen(
            reached('ranni', 'baleful-shadow'),
            'Defeat the Baleful Shadow',
            'The Baleful Shadow is dead and the doll has gone quiet',
          ),
        ],
        reward:
          'Ranni’s doll conversations in Nokstella (dialogue only, no item)',
      },
      [
        step(
          'doll-nokstella',
          'Talk to the doll at the Nokstella, Eternal City grace',
          {
            kind: 'talk',
            done: talk(12019260),
            evidence: 'observed',
            where: { grace: NOKSTELLA },
          },
        ),
        step(
          'doll-waterfall',
          'Talk to the doll at the Nokstella Waterfall Basin grace',
          {
            kind: 'talk',
            done: talk(12019265),
            evidence: 'observed',
            where: { grace: NOKSTELLA_WATERFALL_BASIN },
          },
        ),
      ],
    ),
    step(
      'baleful-shadow',
      'Defeat the Baleful Shadow; Ranni gives you the Discarded Palace Key',
      {
        kind: 'boss',
        done: any(
          pickup(400159, 'Discarded Palace Key received'),
          has(8199, 'Discarded Palace Key'),
        ),
        evidence: 'observed',
        where: {
          note: 'Ainsel River Main, past the Nokstella Waterfall Basin',
        },
        rewards: ['Discarded Palace Key'],
      },
    ),
    step(
      'dark-moon-ring',
      'Open the chest in the Raya Lucaria Grand Library: the Dark Moon Ring',
      {
        kind: 'item',
        done: any(
          pickup(14000676, 'Grand Library chest opened'),
          has(8121, 'Dark Moon Ring'),
        ),
        evidence: 'observed',
        requires: [needsGate(GATES.rennala)],
        where: { grace: GRAND_LIBRARY },
        rewards: ['Dark Moon Ring'],
      },
    ),
    step(
      'cathedral',
      'Reach the Moonlight Altar and give Ranni the ring beneath the Cathedral of Manus Celes',
      {
        kind: 'talk',
        done: any(
          talk(1035420150, 'ring cutscene played'),
          stage('cathedral'),
          stage('ending'),
        ),
        evidence: 'script',
        requires: [needsGate(GATES.astel)],
        where: { grace: CATHEDRAL_OF_MANUS_CELES },
      },
    ),
    step('farewell', 'Talk to Ranni once she awakens', {
      kind: 'talk',
      done: any(talk(1034509406, 'Cathedral talk played'), stage('ending')),
      evidence: 'script',
      where: { grace: CATHEDRAL_OF_MANUS_CELES },
    }),
    detour(
      'dark-moon-greatsword',
      'Collect the Dark Moon Greatsword',
      { reward: 'Dark Moon Greatsword' },
      [
        step(
          'greatsword-pickup',
          'Pick up the Dark Moon Greatsword where Ranni stood',
          {
            kind: 'item',
            done: pickup(1035425013, 'Dark Moon Greatsword picked up'),
            evidence: 'observed',
            where: { grace: CATHEDRAL_OF_MANUS_CELES },
            rewards: ['Dark Moon Greatsword'],
          },
        ),
      ],
    ),
    detour(
      'age-of-stars',
      'The Age of the Stars',
      { reward: 'The Age of the Stars ending, and Ranni’s plans for it' },
      [
        step('doll-chamber', 'Talk to the doll at the Ranni’s Chamber grace', {
          kind: 'talk',
          done: talk(12019275, 'doll talk back at the Rise'),
          evidence: 'observed',
          where: { grace: RANNIS_CHAMBER },
        }),
        step(
          'choose-age-of-stars',
          'After the Elden Beast, summon Ranni with her sign: the Age of the Stars',
          {
            kind: 'event',
            requires: [needsGate(GATES.eldenBeast)],
            unlocks: ['The Age of the Stars ending'],
            flagTodo:
              'Choose the Age of Stars after the Elden Beast; check that 21 ゲームクリアフラグ（ラニED） flips and whether it survives into NG+',
          },
        ),
      ],
    ),
  ],
);
