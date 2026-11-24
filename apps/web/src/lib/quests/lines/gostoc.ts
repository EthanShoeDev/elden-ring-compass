import { all, any, flag, reached, talk } from '../cond';
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

const STORMVEIL_MAIN_GATE = 71008;
const STORMVEIL_CLIFFSIDE = 71004;
const GODRICK_THE_GRAFTED = 71000;

/**
 * Gatekeeper Gostoc (talk block NPC302, status 3260 `門衛`).
 *
 * Stage machine (`common.evs.py` `Event_3279`): 3265 "stalker talk: progress 0" → 3266 on
 * 10009360 (first stalker talk) → 3268 "stalker talk complete" on 10009362 → 3270 throne room on
 * Nepheli's lord stage 4229, else 3269 "after Godrick" once Godrick (10000800) dies. Shop unlock is
 * `会話用フラグ_ショップ化` 10009356; the gate opening 10009355 / 10009505, the side path
 * 10009502–10009503. His Stormveil talk block repeats at 10009500–10009549 for the second gate
 * scenario; the community log shows 10009516/10009517 flipping for the throne-room talk, though
 * those names (`開門合図準備` / `初回命乞い会話再生済`) don't describe it.
 */
export const gostoc = defineQuest(
  {
    id: 'gostoc',
    npc: 'Gatekeeper Gostoc',
    isDlc: false,
    blurb:
      'Stormveil’s shifty gatekeeper, who opens the castle, robs the dead and serves whoever sits the throne.',
    status: statusBlock(3260),
    stages: {
      stalker0: 3265,
      stalker1: 3266,
      stalker2: 3267,
      stalkerDone: 3268,
      afterGodrick: 3269,
      throneRoom: 3270,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC302 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3279 (stage transitions)',
      'er-save-manager quest_flags_db.py "Gatekeeper Gostoc" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Gostoc column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Gostoc beside the entrance to Stormveil Castle', {
      kind: 'talk',
      done: talk(10009351, 'first conversation'),
      evidence: 'script',
      where: { grace: STORMVEIL_MAIN_GATE },
    }),
    step(
      'enter',
      'Enter the castle: have him open the main gate, or take his side path',
      {
        kind: 'action',
        done: any(
          talk(10009355, 'gate opened'),
          talk(10009505, 'gate opened'),
          talk(10009502, 'side path used'),
          talk(10009503, 'chose the side path'),
        ),
        evidence: 'script',
        where: { grace: STORMVEIL_MAIN_GATE },
        note: 'Either way leads on; the main gate means a fight in the courtyard.',
      },
    ),
    detour(
      'early-shop',
      'Open Gostoc’s shop before Godrick falls',
      {
        lockedBy: [lockedByGate(GATES.godrick)],
        reward: 'His shop before Godrick',
      },
      [
        step(
          'early-shop-open',
          'Catch him following you on the cliff past Stormveil Cliffside, or bring him the Rusty Key by the main gate: he starts selling',
          {
            kind: 'talk',
            // 10009356 is also set when the shop opens after Godrick, so this can read done late.
            done: talk(10009356, 'shop unlocked'),
            evidence: 'script',
            where: { grace: STORMVEIL_CLIFFSIDE },
            rewards: ['Grace Mimic'],
            unlocks: ['Gostoc’s shop'],
            note: 'Catching him on the cliff also earns the Grace Mimic.',
          },
        ),
      ],
    ),
    step('after-godrick', 'After Godrick falls, talk to Gostoc by his grace', {
      kind: 'talk',
      done: any(
        talk(10009399, 'first talk in front of Godrick'),
        talk(10009506, 'caught him gloating'),
      ),
      evidence: 'script',
      where: { grace: GODRICK_THE_GRAFTED },
      requires: [needsGate(GATES.godrick)],
      reload: true,
      unlocks: ['Gostoc’s shop, if it wasn’t open already'],
    }),
    step(
      'throne-room',
      'Once Nepheli rules Stormveil, talk to Gostoc in the throne room',
      {
        kind: 'talk',
        // Stage 3270 only says he moved; the talk flag is from the community log.
        done: all(stage('throneRoom'), talk(10009517)),
        evidence: 'observed',
        where: { grace: GODRICK_THE_GRAFTED },
        unlocks: ['Ancient Dragon Smithing Stone in Gostoc’s shop'],
        requires: [
          {
            cond: reached('nepheli', 'lord'),
            label: 'Nepheli takes Stormveil’s throne',
          },
        ],
        lockedBy: [
          lockedByDecision('nepheli', 'puppet'),
          lockedWhen(
            flag(4223, 'status', 'Nepheli is dead'),
            'Let Nepheli Loux die',
            'Nepheli Loux died',
          ),
        ],
      },
    ),
  ],
);
