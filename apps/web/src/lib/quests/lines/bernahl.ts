import { any, boss, reached, talk } from '../cond';
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

const WARMASTERS_SHACK = 76118;
const VOLCANO_MANOR = 71602;
const BESIDE_THE_GREAT_BRIDGE = 71310;

/** His summon sign is offered only for the Godskin Duo fight. */
const godskinDuo = defineGate(
  'godskin-duo',
  'Defeat the Godskin Duo in Crumbling Farum Azula',
  boss(13000850, 'Godskin Duo'),
);

/**
 * Knight Bernahl (talk block NPC326).
 *
 * Stage machine (`common.evs.py` `Event_3899`): 3885 initial (Warmaster's Shack) → 3886 at the
 * Volcano Manor, on joining Tanith (16009208) → 3887 left the Manor, on his post-Rykard talk
 * (16009460) → 3888 nowhere *and dead* (3883), on Rykard (16000800) ∧ ¬joined.
 *
 * `diesAfter: 'manor'`: his Farum Azula invasion (`m13_00_00_00.evs.py` Event_13003720) is enabled
 * on 16009460 ∨ dead (3883), so once you have met him in the Manor his death ends nothing. Dead
 * before that means Rykard fell before you joined (the game kills him off, 3883): his arc is gone. Defeat flag 13000180 is the invader's
 * (CommonFunc_90005790 `flag`). Vargram & Wilhelm are 7605 `NPC疑似マルチクリア
 * 円卓の最初の褪せ人の生き残り_A`.
 */
export const bernahl = defineQuest(
  {
    id: 'bernahl',
    npc: 'Knight Bernahl',
    isDlc: false,
    blurb:
      'A sworn knight of the Volcano Manor who turns against the Greater Will — and you.',
    status: { ...statusBlock(3880), diesAfter: 'manor' },
    stages: {
      initial: 3885,
      atManor: 3886,
      leftManor: 3887,
      gone: 3888,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC326 (stage/talk flag names)',
      'soulsmods elden-ring-eventparam 7605 (Vargram & Wilhelm clear flag)',
      'soulstruct common.evs.py Event_3899 (stage transitions)',
      'soulstruct m13_00_00_00.evs.py (Farum Azula invasion and its defeat flag)',
      'er-save-manager quest_flags_db.py "Knight Bernahl" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Bernahl column (ordering, missables)',
    ],
  },
  () => [
    detour(
      'shack',
      'Bernahl at the Warmaster’s Shack',
      {
        lockedBy: [
          lockedWhen(
            talk(16009208, 'joined the Volcano Manor'),
            'Join the Volcano Manor through Tanith',
          ),
        ],
        reward: 'His Warmaster’s Shack conversation and Ash of War shop',
      },
      [
        step('meet-shack', 'Meet Bernahl at the Warmaster’s Shack', {
          kind: 'talk',
          done: any(
            talk(1042389255, 'answered “keep believing”'),
            talk(1042389256, 'answered “I don’t understand”'),
          ),
          evidence: 'script',
          where: { grace: WARMASTERS_SHACK },
          unlocks: ["Bernahl's Ash of War shop"],
        }),
      ],
    ),
    step('manor', 'Talk to Bernahl in the Volcano Manor drawing room', {
      kind: 'talk',
      done: any(
        talk(16009455, 'answered “I understand”'),
        talk(16009456, 'answered “I don’t understand”'),
      ),
      evidence: 'script',
      requires: [
        { cond: reached('tanith', 'join'), label: 'Join the Volcano Manor' },
      ],
      lockedBy: [lockedByGate(GATES.rykard)],
      where: { grace: VOLCANO_MANOR },
      unlocks: ["Ash of War: Eruption and Assassin's Gambit in his shop"],
    }),
    step('after-istvan', 'After your first contract, talk to him again', {
      kind: 'talk',
      done: talk(16009457, 'post-first-contract talk'),
      evidence: 'script',
      requires: [
        {
          cond: reached('tanith', 'istvan'),
          label: 'Complete Tanith’s first contract',
        },
      ],
      lockedBy: [lockedByGate(GATES.rykard)],
      where: { grace: VOLCANO_MANOR },
    }),
    step('letter', 'After your second contract, take the Letter to Bernahl', {
      kind: 'talk',
      done: talk(16009458, 'contract letter handed over'),
      rewards: ['Letter to Bernahl'],
      evidence: 'script',
      requires: [
        {
          cond: reached('tanith', 'rileigh'),
          label: 'Complete Tanith’s second contract',
        },
      ],
      lockedBy: [lockedByGate(GATES.rykard)],
      where: { grace: VOLCANO_MANOR },
    }),
    detour(
      'vargram',
      'Bernahl’s contract: Vargram and Wilhelm',
      {
        lockedBy: [lockedByGate(GATES.erdtreeBurned)],
        reward: 'Raging Wolf set and Gelmir’s Fury',
      },
      [
        step(
          'kill-vargram',
          'Invade and kill Vargram and Errant Sorcerer Wilhelm',
          {
            kind: 'boss',
            done: boss(7605, 'Vargram and Wilhelm slain'),
            rewards: [
              'Raging Wolf Helm',
              'Raging Wolf Armor',
              'Raging Wolf Gauntlets',
              'Raging Wolf Greaves',
            ],
            evidence: 'script',
            where: {
              note: 'Red invasion sign in Leyndell’s Fortified Manor, first floor',
            },
          },
        ),
        step('vargram-reward', 'Report back to Bernahl for Gelmir’s Fury', {
          kind: 'talk',
          done: talk(16009461, 'post-contract talk'),
          rewards: ["Gelmir's Fury"],
          evidence: 'script',
          lockedBy: [
            lockedWhen(
              talk(16009460, 'post-Rykard talk'),
              'Talk to Bernahl after Rykard’s defeat (he leaves the Manor)',
            ),
          ],
          where: { grace: VOLCANO_MANOR },
          note: 'If he has left the Manor first, the reward is left behind for you to find.',
        }),
      ],
    ),
    step('after-rykard', 'Talk to Bernahl after Rykard falls', {
      kind: 'talk',
      done: talk(16009460, 'post-Rykard talk'),
      evidence: 'script',
      requires: [needsGate(GATES.rykard)],
      where: { grace: VOLCANO_MANOR },
    }),
    detour(
      'godskin-duo',
      'Bernahl as an ally',
      {
        lockedBy: [lockedByGate(godskinDuo)],
        reward: 'His help against the Godskin Duo',
      },
      [
        step('summon', 'Summon Bernahl against the Godskin Duo', {
          kind: 'action',
          requires: [needsGate(GATES.erdtreeBurned)],
          flagTodo:
            'Summon Bernahl from his sign before the Godskin Duo in Crumbling Farum Azula; the flag that flips when the summon joins',
          where: { note: 'Crumbling Farum Azula, before the Godskin Duo' },
          unlocks: ['Bernahl as a summon against the Godskin Duo'],
        }),
      ],
    ),
    step(
      'farum-azula',
      'Survive Bernahl’s invasion in Crumbling Farum Azula and defeat him',
      {
        kind: 'boss',
        done: boss(13000180, 'Recusant Bernahl defeated'),
        evidence: 'script',
        requires: [needsGate(GATES.erdtreeBurned)],
        where: { grace: BESIDE_THE_GREAT_BRIDGE },
        rewards: [
          'Blasphemous Claw',
          "Devourer's Scepter",
          'Beast Champion Helm',
          'Beast Champion Armor (Altered)',
          'Beast Champion Gauntlets',
          'Beast Champion Greaves',
        ],
      },
    ),
  ],
);
