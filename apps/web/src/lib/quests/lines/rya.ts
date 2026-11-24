import { all, any, boss, flag, has, not, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  choice,
  defineQuest,
  detour,
  lockedByGate,
  lockedWhen,
  needsGate,
  path,
  statusBlock,
  step,
} from '../model';

const BOILPRAWN_SHACK = 76216;
const GRAND_LIFT_OF_DECTUS = 76209;
const VOLCANO_MANOR = 71602;
const PRISON_TOWN_CHURCH = 71603;

/** Tanith's "chose to fight alongside the Manor" talk flag (NPC300). */
const JOINED_MANOR = talk(16009208, 'joined the Volcano Manor');

/**
 * Rya, the Volcano Manor's recruiter (talk block NPC313).
 *
 * Stage machine (`common.evs.py` `Event_3439`): 3425 initial → 3426 invited, on the necklace
 * handed back (1037429210) ∧ not yet at the Manor → 3427 reunited at the Manor, on taking her
 * hand (1038519205) ∨ joining Tanith (16009208) → 3428 "saw a suspicious shadow", on her first
 * serpent-form talk (16009306) ∧ two contracts done (counter 16009260 ≥ 2) → 3429 in the prison,
 * on the Serpent's Amnion handed over (16009319) → 3430 memory lost, on the tonic given (16009327)
 * ∧ Rykard dead ∧ Tanith gone ∧ Patches (3689), Diallos (3448/3449) and Bernahl (3886) no longer
 * at the Manor → 3431 nowhere, on (stages 3425–3428 ∧ no Amnion ∧ Rykard dead) ∨ (post-Rykard
 * talk 16009328 without the tonic) ∨ her drawing-room farewell (16009335).
 *
 * So Rykard's death before she has the Amnion ends her questline, and joining Tanith first moves
 * her to the Manor without the Liurnia part: that part is a detour. Her prison fork is a choice:
 * kill her, give her the tonic, or leave her be.
 */
export const rya = defineQuest(
  {
    id: 'rya',
    npc: 'Rya',
    isDlc: false,
    blurb:
      'A girl in Liurnia who lures Tarnished to the Volcano Manor and hides what she is.',
    status: statusBlock(3420),
    stages: {
      initial: 3425,
      invited: 3426,
      atManor: 3427,
      sawShadow: 3428,
      inPrison: 3429,
      forgotten: 3430,
      gone: 3431,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC313 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3439 (stage transitions)',
      'er-save-manager quest_flags_db.py "Rya" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Rya column (ordering, forks)',
    ],
  },
  ({ stage }) => [
    detour(
      'invitation',
      'Rya’s invitation in Liurnia',
      {
        lockedBy: [
          lockedByGate(GATES.rykard),
          lockedWhen(JOINED_MANOR, 'Join the Volcano Manor through Tanith'),
        ],
        reward: 'Volcano Manor Invitation and her ride to the Manor',
      },
      [
        step('meet', 'Meet Rya in Liurnia and agree to find her necklace', {
          kind: 'talk',
          done: talk(1037429209, 'agreed to help'),
          evidence: 'script',
          where: {
            grace: BOILPRAWN_SHACK,
            note: 'Under the pavilion near the Boilprawn Shack',
          },
        }),
        step('necklace', 'Get Rya’s Necklace from Boggart', {
          kind: 'item',
          done: has(8136, 'Rya’s Necklace'),
          evidence: 'assumed',
          requires: [
            {
              cond: any(
                reached('boggart', 'buy-necklace'),
                flag(4143, 'status', 'Boggart is dead'),
              ),
              label: 'Buy it from Boggart, or take it from his body',
            },
          ],
        }),
        step('return-necklace', 'Give Rya her necklace back', {
          kind: 'talk',
          done: any(
            talk(1037429210, 'necklace returned'),
            has(8137, 'Volcano Manor Invitation'),
          ),
          evidence: 'script',
          where: { grace: BOILPRAWN_SHACK },
          rewards: ['Volcano Manor Invitation'],
        }),
        step('directions', 'Talk to her again to hear where she will wait', {
          kind: 'talk',
          done: talk(1037429211, 'shortcut talk played'),
          evidence: 'script',
          reload: true,
        }),
        step(
          'take-hand',
          'Find her near the Grand Lift of Dectus and take her hand',
          {
            kind: 'talk',
            done: talk(1038519205, 'chose to go to the Manor'),
            evidence: 'script',
            unlocks: ['A ride straight to the Volcano Manor'],
            where: {
              grace: GRAND_LIFT_OF_DECTUS,
              note: 'Or at the lower Lux Ruins once you are on the Altus Plateau',
            },
          },
        ),
      ],
    ),
    step('reunion', 'Talk to Rya in the Volcano Manor drawing room', {
      kind: 'talk',
      done: talk(16009305, 'first Manor talk'),
      evidence: 'script',
      requires: [
        {
          cond: any(talk(1038519205, 'took her hand'), JOINED_MANOR),
          label: 'Reach the Manor: take Rya’s hand, or join Tanith',
        },
      ],
      lockedBy: [lockedByGate(GATES.rykard)],
      where: { grace: VOLCANO_MANOR },
    }),
    step(
      'noises',
      'After your first contract, hear her worry about strange noises',
      {
        kind: 'talk',
        done: talk(16009308, 'noises talk played'),
        evidence: 'script',
        requires: [
          {
            cond: reached('tanith', 'istvan'),
            label: 'Complete Tanith’s first contract',
          },
        ],
        lockedBy: [lockedByGate(GATES.rykard)],
        reload: true,
      },
    ),
    step('serpent', 'Find Rya in her serpent form and talk to her twice', {
      kind: 'talk',
      done: any(
        talk(16009306, 'first serpent-form talk'),
        talk(16009307, 'learned Tanith is her mother'),
      ),
      evidence: 'script',
      lockedBy: [lockedByGate(GATES.rykard)],
      where: { grace: VOLCANO_MANOR },
    }),
    step(
      'human-again',
      'After your second contract, talk to her in human form',
      {
        kind: 'talk',
        done: any(stage('sawShadow'), talk(16009315, 'chose not to tell her')),
        evidence: 'script',
        requires: [
          {
            cond: reached('tanith', 'rileigh'),
            label: 'Complete Tanith’s second contract',
          },
        ],
        lockedBy: [lockedByGate(GATES.rykard)],
        where: { grace: VOLCANO_MANOR },
      },
    ),
    step(
      'prison-town',
      'Go through the hidden wall beside her room and reach the prison town',
      {
        kind: 'action',
        done: talk(16009316, 'learned the prison’s secret'),
        evidence: 'assumed',
        lockedBy: [lockedByGate(GATES.rykard)],
        where: { grace: PRISON_TOWN_CHURCH },
      },
    ),
    step('tell-secret', 'Tell Rya what you found', {
      kind: 'talk',
      done: talk(16009318, 'told her about the prison'),
      evidence: 'script',
      lockedBy: [lockedByGate(GATES.rykard)],
    }),
    step('amnion', 'Get the Serpent’s Amnion past the Godskin Noble', {
      kind: 'item',
      done: has(8129, 'Serpent’s Amnion'),
      evidence: 'assumed',
      requires: [
        {
          cond: boss(16000850, 'Godskin Noble'),
          label: 'Defeat the Godskin Noble in the Temple of Eiglay',
        },
      ],
      lockedBy: [lockedByGate(GATES.rykard)],
      where: { note: 'Temple of Eiglay, Volcano Manor' },
      rewards: ["Serpent's Amnion"],
    }),
    step('give-amnion', 'Give Rya the Serpent’s Amnion', {
      kind: 'talk',
      done: talk(16009319, 'gave her the Amnion'),
      evidence: 'script',
      lockedBy: [lockedByGate(GATES.rykard)],
      reload: true,
    }),
    step('prison', 'Find Rya in the Manor’s dungeon and hear her out', {
      kind: 'talk',
      done: talk(16009325, 'first prison talk'),
      evidence: 'script',
      where: { note: 'A side room deeper in the Volcano Manor dungeon' },
    }),
    choice('fate', 'What becomes of Rya', [
      path(
        'kill',
        'Grant her wish and kill her',
        [
          step('kill-her', 'Kill Rya in her cell', {
            kind: 'action',
            done: all(
              flag(3423, 'status', 'Rya is dead'),
              talk(16009325, 'first prison talk'),
            ),
            evidence: 'script',
            rewards: ["Daedicar's Woe"],
          }),
        ],
        { ending: 'Rya dies by your hand' },
      ),
      path(
        'tonic',
        'Give her Tanith’s Tonic of Forgetfulness',
        [
          step(
            'get-tonic',
            'Tell Tanith about Rya and get the Tonic of Forgetfulness',
            {
              kind: 'talk',
              // Not has(8128): a fixture character holds the tonic with Rya long gone (no Amnion given),
              // so Tanith hands it over earlier than this step.
              flagTodo:
                'Talk to Tanith with Rya in the dungeon until she hands over the Tonic of Forgetfulness; the Tanith talk flag that flips',
              where: { grace: VOLCANO_MANOR },
              rewards: ['Tonic of Forgetfulness'],
            },
          ),
          step('give-tonic', 'Give Rya the tonic: she falls asleep', {
            kind: 'talk',
            done: talk(16009327, 'gave her the tonic'),
            evidence: 'script',
            lockedBy: [
              lockedWhen(
                talk(16009328, 'post-Rykard talk without the tonic'),
                'Talk to Rya after Rykard’s defeat without giving her the tonic',
              ),
            ],
            note: 'Give it before defeating Rykard to be safe.',
          }),
          step(
            'drawing-room',
            'Once Rykard is dead and the Manor has emptied, talk to her in the drawing room',
            {
              kind: 'talk',
              done: talk(16009335, 'forgetful farewell'),
              evidence: 'script',
              requires: [
                needsGate(GATES.rykard),
                {
                  cond: any(
                    talk(16009246, 'Tanith said she is staying'),
                    not(JOINED_MANOR),
                  ),
                  label: 'Talk to Tanith twice after Rykard’s defeat',
                },
                {
                  cond: all(
                    not(flag(3689, 'stage', 'Patches at the Manor')),
                    not(flag(3448, 'stage', 'Diallos at the Manor')),
                    not(flag(3449, 'stage', 'Diallos about to leave')),
                    not(flag(3886, 'stage', 'Bernahl at the Manor')),
                  ),
                  label: 'Patches, Diallos and Bernahl have all left the Manor',
                },
              ],
              where: { grace: VOLCANO_MANOR },
              reload: true,
            },
          ),
          step('keepsake', 'Rest, then collect what she left behind', {
            kind: 'item',
            // 16009338 `どこにもいない_アイテム出現_書き置き無し`: the keepsake without her letter.
            done: talk(16009338, 'her keepsake appeared'),
            evidence: 'script',
            where: { grace: VOLCANO_MANOR },
            rewards: ["Daedicar's Woe"],
          }),
        ],
        { ending: 'Rya forgets and leaves the Manor' },
      ),
      path(
        'leave',
        'Leave her be',
        [
          step('decline', 'Refuse her request and walk away', {
            kind: 'talk',
            done: talk(16009326, 'chose to leave'),
            evidence: 'script',
          }),
          step('vanished', 'After Rykard falls, talk to her one last time', {
            kind: 'talk',
            done: talk(16009328, 'post-Rykard talk'),
            evidence: 'script',
            requires: [needsGate(GATES.rykard)],
            reload: true,
          }),
          step('letter', 'Rest: she is gone, leaving a letter behind', {
            kind: 'item',
            // 16009337 `どこにもいない_アイテム出現_書き置きあり`: the keepsake with her letter.
            done: talk(16009337, 'her keepsake and letter appeared'),
            evidence: 'script',
            rewards: ["Daedicar's Woe", "Zorayas's Letter"],
          }),
        ],
        { ending: 'Rya vanishes from the Manor' },
      ),
    ]),
  ],
);
