import { all, any, flag, pickup, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const CASTLE_MORNE_LIFT = 76158;
const BRIDGE_OF_SACRIFICE = 76157;
const REVENGERS_SHACK = 76218;

/**
 * Edgar, castellan of Castle Morne (talk block NPC311). Irina's father.
 *
 * Stage machine (`common.evs.py` `Event_3419`): 3405 initial → 3406 "summon sign out for the boss"
 * on his talk 1043319206 "received Irina's letter" → 3407 "boss beaten" once the Leonine
 * Misbegotten (1043300800) dies → 3408 "found his daughter's body" on (3407 ∧ Irina past her
 * initial stage ∧ (talk 1043319207 "thanked you on the walls" ∨ 1045342719, set by
 * `m60_45_34_00` Event_1045340706 once the boss is dead and the letter delivered)) → 3409
 * "phantom" (he invades at Revenger's Shack) on his talk 1045349255 at Irina's body.
 *
 * The shortcut that makes the Castle Morne arc missable: from ANY of 3405–3408, giving Hyetta her
 * first Shabriri Grape (1039409206) jumps him straight to 3409. Killing Irina yourself after the
 * boss makes him permanently hostile (3402).
 */
export const edgar = defineQuest(
  {
    id: 'edgar',
    npc: 'Edgar',
    isDlc: false,
    blurb:
      'The castellan holding Castle Morne, who turns to vengeance after his daughter Irina dies.',
    status: statusBlock(3400),
    stages: {
      initial: 3405,
      summonSign: 3406,
      bossBeaten: 3407,
      foundIrina: 3408,
      invader: 3409,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC311 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3419 (stage transitions), m60_45_34_00 Event_1045340706',
      'er-save-manager quest_flags_db.py "Irina" (Edgar’s observed flags are logged there)',
      'NPC Quests & Endings Guide v5 flowchart, Edgar column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Edgar on the walls of Castle Morne', {
      kind: 'talk',
      done: any(
        talk(1043319205, 'first conversation'),
        pickup(400060, 'Sacrificial Twig received'),
      ),
      evidence: 'script',
      where: { grace: CASTLE_MORNE_LIFT },
      rewards: ['Sacrificial Twig'],
    }),
    detour(
      'castle-morne',
      'Help Edgar at Castle Morne and bring him to Irina',
      {
        lockedBy: [
          lockedWhen(
            reached('hyetta', 'grape-1'),
            'Give Hyetta her first Shabriri Grape',
            'Hyetta got her first grape, so Edgar skipped straight to vengeance',
          ),
        ],
        reward:
          'Edgar as a summon against the Leonine Misbegotten, and his farewell at Irina’s body',
      },
      [
        step('deliver-letter', 'Give him Irina’s letter', {
          kind: 'talk',
          done: talk(1043319206, 'received the letter'),
          evidence: 'script',
          requires: [
            {
              cond: reached('irina', 'take-letter'),
              label: 'Agree to carry Irina’s letter',
            },
          ],
          where: { grace: CASTLE_MORNE_LIFT },
        }),
        step(
          'misbegotten',
          'Defeat the Leonine Misbegotten (his summon sign is outside the arena)',
          {
            kind: 'boss',
            done: any(stage('bossBeaten'), stage('foundIrina')),
            evidence: 'script',
            where: { note: 'Castle Morne, the plaza before the Grafted Blade' },
            unlocks: ['Edgar as a summon against the Leonine Misbegotten'],
          },
        ),
        step('thanks', 'Talk to him on the walls again', {
          kind: 'talk',
          done: talk(1043319207, 'thanked you after the boss'),
          evidence: 'script',
          where: { grace: CASTLE_MORNE_LIFT },
        }),
        step('at-irina', 'Find him kneeling by Irina’s body and talk to him', {
          kind: 'talk',
          done: talk(1045349255, 'talked at Irina’s body'),
          evidence: 'script',
          where: { grace: BRIDGE_OF_SACRIFICE },
          requires: [
            {
              cond: reached('irina', 'slain'),
              label: 'Irina has been killed',
            },
          ],
        }),
      ],
    ),
    step(
      'revenger',
      'Defeat Edgar the Revenger when he invades at Revenger’s Shack',
      {
        kind: 'boss',
        // Not his halberd drop (lot flag 400061): he drops it wherever he is killed, so it would
        // also mark an early kill at Castle Morne as the finale.
        done: all(stage('invader'), flag(3403, 'status', 'Edgar dead')),
        evidence: 'script',
        requires: [
          needsGate(GATES.liurniaGrace),
          {
            cond: stage('invader'),
            label:
              'Edgar has turned to vengeance (talk to him at Irina’s body, or give Hyetta a grape)',
          },
        ],
        where: { grace: REVENGERS_SHACK },
        rewards: ["Banished Knight's Halberd", 'Shabriri Grape'],
        note: 'He drops a Shabriri Grape for Hyetta. Reload the area if it isn’t on the ground.',
      },
    ),
  ],
);
