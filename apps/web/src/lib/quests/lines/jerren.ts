import { any, flag, talk } from '../cond';
import { GATES } from '../gates';
import {
  choice,
  defineQuest,
  lockedByDecision,
  needsGate,
  path,
  statusBlock,
  step,
} from '../model';

const REDMANE_CASTLE_PLAZA = 76419;
const GRAND_LIBRARY = 71400;

/**
 * Witch-Hunter Jerren (status 3360 `平原砦の領主`, stages 3365–3372; his EFID_Talk_NPC312 block
 * is an unnamed template, so stage names here are ours).
 *
 * Stage machine (`common.evs.py` `Event_3379`): 3365 initial → 3366 on the festival (9410) →
 * 3367 on Radahn's defeat (9130) → 3368 on his post-Radahn talk (1051369235 ∨ 1051369204) →
 * 3369 at the Witchbane Ruins once you hold Sellen's Primal Glintstone (1044369231) → 3370 at the
 * Academy once it is in the puppet (1034509256) ∧ Rennala is dead (9118) → 3371 on 7608 (you beat
 * Sellen as his summon) → 3372 on his reward talk (14009356), or straight away if Sellen died.
 * 7609 (`NPC疑似マルチクリア 平原砦の領主`) marks him beaten as Sellen's summon.
 *
 * Talk flags are from the Redmane (1051369200+), Witchbane (1041339250+) and Academy (14009350+)
 * `会話用フラグ` blocks, all unnamed; the ids come from the community flag log.
 */
export const jerren = defineQuest(
  {
    id: 'jerren',
    npc: 'Witch-Hunter Jerren',
    isDlc: false,
    blurb:
      'The Redmane herald who calls the Radahn Festival, then turns to hunting the sorceress Sellen.',
    status: statusBlock(3360),
    stages: {
      initial: 3365,
      festival: 3366,
      radahnDefeated: 3367,
      afterRadahn: 3368,
      witchbane: 3369,
      academy: 3370,
      sellenSlain: 3371,
      finished: 3372,
    },
    sources: [
      'soulsmods elden-ring-eventparam Talk_Common (status block 3360), 7608/7609 pseudo-multiplayer flags',
      'soulstruct common.evs.py Event_3379 (stage transitions), festival trigger (9410)',
      'er-save-manager quest_flags_db.py "Jerren" (observed talk/gesture flags)',
      'NPC Quests & Endings Guide v5 flowchart, Jerren column (ordering, fork)',
    ],
  },
  ({ stage }) => [
    step('festival', 'Meet Jerren at the Radahn Festival in Redmane Castle', {
      kind: 'talk',
      done: talk(1051369222, 'festival welcome played'),
      evidence: 'observed',
      requires: [needsGate(GATES.radahnFestival)],
      where: { grace: REDMANE_CASTLE_PLAZA },
    }),
    step(
      'festival-speech',
      'Hear him out about Radahn and take the Heartening Cry',
      {
        kind: 'talk',
        // The Heartening Cry gesture can't prove it: gestures carry over into NG+.
        flagTodo:
          'Hear Jerren’s festival speech and take the Heartening Cry; record the talk flag that flips (1051369227 is a candidate: on in every fixture save that reached the festival)',
        rewards: ['Heartening Cry'],
        where: { grace: REDMANE_CASTLE_PLAZA },
      },
    ),
    step('after-radahn', 'Talk to Jerren after Radahn falls', {
      kind: 'talk',
      done: any(
        talk(1051369235, 'post-Radahn talk'),
        talk(1051369204),
        stage('afterRadahn'),
      ),
      evidence: 'script',
      requires: [needsGate(GATES.radahn)],
      where: { grace: REDMANE_CASTLE_PLAZA },
      reload: true,
    }),
    step('witchbane', 'Find Jerren at the Witchbane Ruins', {
      kind: 'talk',
      done: talk(1041339256, 'Witchbane talk'),
      evidence: 'observed',
      requires: [
        {
          cond: any(
            talk(1044369231, 'Sellen’s primal glintstone obtained'),
            stage('witchbane'),
            stage('academy'),
          ),
          label: 'Take Sellen’s Primal Glintstone from her real body',
        },
      ],
      where: { note: 'Witchbane Ruins, Weeping Peninsula' },
    }),
    choice(
      'witch-hunt',
      'At the Grand Library doors: whose summon sign do you take?',
      [
        path(
          'hunt-sellen',
          'Join Jerren’s hunt and defeat Sellen',
          [
            step('defeat-sellen', 'Help Jerren defeat Sellen', {
              kind: 'boss',
              done: any(
                flag(7608, 'boss', 'Sellen defeated as his summon'),
                stage('sellenSlain'),
              ),
              evidence: 'script',
              requires: [
                needsGate(GATES.rennala),
                {
                  cond: any(
                    talk(1034509256, 'Sellen moved into her puppet'),
                    stage('academy'),
                  ),
                  label: 'Give Sellen her new body (Sellen’s questline)',
                },
              ],
              lockedBy: [lockedByDecision('sellen', 'with-sellen')],
              rewards: ["Sellen's Bell Bearing", "Witch's Glintstone Crown"],
              where: {
                grace: GRAND_LIBRARY,
                note: 'Summon sign outside Rennala’s library',
              },
              note: 'Sellen drops her bell bearing and crown.',
            }),
            step(
              'reward',
              'Talk to Jerren outside the library for his reward',
              {
                kind: 'talk',
                done: talk(
                  14009355,
                  'reward talk (Ancient Dragon Smithing Stone)',
                ),
                evidence: 'observed',
                lockedBy: [lockedByDecision('sellen', 'with-sellen')],
                rewards: ['Ancient Dragon Smithing Stone'],
                where: { grace: GRAND_LIBRARY },
              },
            ),
          ],
          { ending: 'The witch is slain and Jerren rewards you' },
        ),
        path(
          'protect-sellen',
          'Defend Sellen and defeat Jerren',
          [
            step('defeat-jerren', 'Defeat Jerren as Sellen’s summon', {
              kind: 'boss',
              done: flag(7609, 'boss', 'Jerren defeated as Sellen’s summon'),
              evidence: 'script',
              requires: [needsGate(GATES.rennala)],
              lockedBy: [lockedByDecision('sellen', 'with-jerren')],
              rewards: [
                "Eccentric's Hood",
                "Eccentric's Armor",
                "Eccentric's Manchettes",
                "Eccentric's Breeches",
              ],
              where: {
                grace: GRAND_LIBRARY,
                note: 'Summon sign outside Rennala’s library',
              },
            }),
          ],
          { ending: 'Jerren falls defending his hunt' },
        ),
      ],
    ),
  ],
);
