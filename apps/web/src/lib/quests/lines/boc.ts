import { all, any, boss, flag, has, talk } from '../cond';
import { defineGate, GATES } from '../gates';
import {
  choice,
  defineQuest,
  detour,
  lockedByGate,
  needsGate,
  path,
  statusBlock,
  step,
} from '../model';

const COASTAL_CAVE = 73115;
const LAKE_FACING_CLIFFS = 76200;
const EAST_RAYA_LUCARIA_GATE = 76207;
const ALTUS_HIGHWAY_JUNCTION = 76303;
const EAST_CAPITAL_RAMPART = 71102;
const CHURCH_OF_VOWS = 76224;
const RAYA_LUCARIA_GRAND_LIBRARY = 71400;

/**
 * Resting at the East Capital Rampart grace while Boc serves you moves him straight to Leyndell
 * (`m11_00` Event: 3947 ∧ grace 71102 → 11109819), skipping his Liurnia and Altus stops.
 */
const eastCapitalRampart = defineGate(
  'east-capital-rampart',
  'Light the East Capital Rampart grace in Leyndell',
  flag(EAST_CAPITAL_RAMPART, 'grace', 'East Capital Rampart lit'),
);

/**
 * Boc the Seamster (talk block NPC223, status 3940 `亜人針子`).
 *
 * Stage machine (`common.evs.py` `Event_3959`): 3945 disguised in Limgrave → 3946 "collapsed in
 * the cave" on 1043379356 (his second Limgrave conversation) → 3947 "becomes your servant" on
 * 31159206 (`裁縫道具渡し済`, sewing kit handed over) → 3948 beside Rennala, on 11109808 ∧ Rennala
 * dead (9118) ∧ ¬1039409260; or 3949 + dead on 11109812 ∧ 9118. Approaching him beside Rennala
 * (`m14` Event_14000742 sets 11109306) marks him dead: the end of the rebirth path.
 *
 * While serving (3947) he wanders: Lake-Facing Cliffs (talk block 1039409250, map point when
 * 1039409255), East Raya Lucaria Gate (1036489213), Altus Highway Junction (1039519209), and
 * Leyndell's East Capital Rampart (11109819), per `common.evs.py` Event_4609. The meaning of those
 * three relocation flags is inferred from that event, not from flag names. His Roundtable/Leyndell
 * talk block (11109800) is unnamed, so the needle and pate hand-overs are still unknown.
 */
export const boc = defineQuest(
  {
    id: 'boc',
    npc: 'Boc the Seamster',
    isDlc: false,
    blurb:
      'A demi-human seamster hiding as a bush in Limgrave who tailors your armor and longs to be beautiful.',
    status: { ...statusBlock(3940), diesAfter: 'beside-rennala' },
    stages: {
      disguised: 3945,
      inCave: 3946,
      servant: 3947,
      besideRennala: 3948,
      gone: 3949,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC223 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3959 (stages), Event_4609 (wandering); m11_00, m14_00, m31_15, m60_39_40',
      'Grand Archives CT "NPCs/Boc" (locations)',
      'NPC Quests & Endings Guide v5 flowchart, Boc column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet-bush', 'Strike the talking bush in Limgrave and hear Boc out', {
      kind: 'talk',
      done: any(
        talk(1043379355, 'first conversation'),
        talk(1043379356, 'second conversation'),
        talk(1043379357, 'disguise dropped'),
      ),
      evidence: 'script',
      where: {
        grace: COASTAL_CAVE,
        note: 'A bush on the coast near the Coastal Cave',
      },
      rewards: ['Mushroom'],
    }),
    step('in-cave', 'Find Boc collapsed inside the Coastal Cave', {
      kind: 'talk',
      done: talk(31159205, 'first conversation in the cave'),
      evidence: 'script',
      where: { grace: COASTAL_CAVE },
    }),
    step('chiefs', 'Defeat the Demi-Human Chiefs in the Coastal Cave', {
      kind: 'boss',
      // The chiefs can die without Boc, so only count them once he has been met.
      done: all(
        boss(31150800, 'Demi-Human Chief'),
        any(talk(1043379355), talk(1043379357), talk(31159205)),
      ),
      evidence: 'script',
      where: { grace: COASTAL_CAVE },
      rewards: ['Sewing Needle', 'Tailoring Tools'],
    }),
    step(
      'needle',
      'Give Boc back his sewing needle: he starts altering armor',
      {
        kind: 'talk',
        done: any(
          talk(31159206, 'sewing kit handed over'),
          stage('servant'),
          stage('besideRennala'),
        ),
        evidence: 'script',
        where: { grace: COASTAL_CAVE },
        unlocks: ['Boc’s free armor alterations at Sites of Grace'],
      },
    ),
    detour(
      'wandering',
      'Visit Boc on his travels through Liurnia and Altus',
      {
        lockedBy: [lockedByGate(eastCapitalRampart)],
        reward:
          'His conversations at Lake-Facing Cliffs, East Raya Lucaria Gate and Altus',
      },
      [
        step('lake-facing', 'Talk to Boc at the Lake-Facing Cliffs grace', {
          kind: 'talk',
          done: talk(1039409255, 'talked at Lake-Facing Cliffs'),
          evidence: 'assumed',
          where: { grace: LAKE_FACING_CLIFFS },
        }),
        step(
          'east-raya-lucaria',
          'Talk to Boc at the East Raya Lucaria Gate grace',
          {
            kind: 'talk',
            done: talk(1036489213, 'moved to East Raya Lucaria Gate'),
            evidence: 'assumed',
            where: { grace: EAST_RAYA_LUCARIA_GATE },
          },
        ),
        step('altus', 'Talk to Boc at the Altus Highway Junction grace', {
          kind: 'talk',
          done: talk(1039519209, 'moved to the Altus Highway Junction'),
          evidence: 'assumed',
          where: { grace: ALTUS_HIGHWAY_JUNCTION },
        }),
      ],
    ),
    step('leyndell', 'Talk to Boc at the East Capital Rampart in Leyndell', {
      kind: 'talk',
      done: talk(11109819, 'Boc has moved to Leyndell'),
      evidence: 'script',
      where: { grace: EAST_CAPITAL_RAMPART },
      requires: [needsGate(eastCapitalRampart)],
    }),
    step(
      'gold-needle',
      'Give Boc the Gold Sewing Needle from the Church of Vows',
      {
        kind: 'talk',
        where: { grace: CHURCH_OF_VOWS },
        rewards: ['My Lord'],
        unlocks: ['Boc can alter the demigods’ legendary armor'],
        flagTodo:
          'Give Boc the Gold Sewing Needle (wherever he is); the 111098xx talk flag that flips',
        note: 'He can take it at any of his stops. Let him call you his lord for the gesture.',
      },
    ),
    choice('beauty', 'Ease Boc’s worry about his looks', [
      path(
        'pate',
        'Tell him he’s beautiful with the Prattling Pate',
        [
          step('use-pate', 'Use the pate in front of Boc', {
            kind: 'action',
            requires: [
              {
                cond: has(2207, 'Prattling Pate “You’re beautiful”'),
                label:
                  'Find the “You’re beautiful” Prattling Pate in the Hermit Village on Mt. Gelmir',
              },
            ],
            flagTodo:
              'Use the “You’re beautiful” pate next to Boc; the talk flag that flips',
          }),
        ],
        { ending: 'Boc keeps his own face' },
      ),
      path(
        'larval-tear',
        'Give him a Larval Tear to be reborn',
        [
          step('give-tear', 'Give Boc a Larval Tear', {
            kind: 'talk',
            done: talk(11109808, 'asked for rebirth'),
            evidence: 'assumed',
          }),
          step(
            'beside-rennala',
            'Find Boc beside Rennala in the Grand Library',
            {
              kind: 'talk',
              done: any(
                stage('besideRennala'),
                talk(11109306, 'approached him beside Rennala'),
              ),
              evidence: 'script',
              where: { grace: RAYA_LUCARIA_GRAND_LIBRARY },
              requires: [needsGate(GATES.rennala)],
              reload: true,
            },
          ),
        ],
        { ending: 'Boc seeks rebirth from Rennala' },
      ),
    ]),
  ],
);
