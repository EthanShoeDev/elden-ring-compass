import { all, any, boss, flag, has, not, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByGate,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const VOLCANO_MANOR = 71602;
const RYKARD_GRACE = 71600;

/**
 * Tanith, lady of the Volcano Manor (talk block NPC300).
 *
 * Stage machine (`common.evs.py` `Event_3119`): 3105 initial → 3106 contracts under way, on the
 * first contract letter (400073) → 3107 audience granted, once the contract counter
 * (16009260, 4 bits) reaches 3 → 3108 after Rykard, on Rykard (16000800) ∧ joined (16009208) →
 * 3109 devouring Rykard, on Rykard ∧ ¬joined, or on her second post-Rykard talk (16009246) →
 * 3110 gone once she is killed (16009265) → 3111 once her guard is killed (16009264).
 *
 * Killing Rykard before joining sends her straight to 3109, so the whole Manor arc (and Patches'
 * gift for her, which needs him to have met you in the Manor) is gone: joining is locked by the
 * Rykard gate. The contracts are side content once joined: skipping them still leads to the same
 * ending, but each is lost when Rykard dies.
 *
 * Contract targets are quest-only invaders: 7602/7603/7604 `NPC疑似マルチクリア 火山館の依頼
 * ターゲット1/2/3`. The Dancer's Castanets step has no flag of its own: we read it as "Patches gave
 * them to you (his talk flag 1039549205) and you no longer hold them".
 */
export const tanith = defineQuest(
  {
    id: 'tanith',
    npc: 'Tanith',
    isDlc: false,
    blurb:
      'The Volcano Manor’s lady, who recruits you to hunt Tarnished for Lord Rykard.',
    status: statusBlock(3100),
    stages: {
      initial: 3105,
      contracts: 3106,
      audience: 3107,
      rykardDefeated: 3108,
      devouring: 3109,
      gone: 3110,
      guardSlain: 3111,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC300 (status/stage/talk flag names)',
      'soulsmods elden-ring-eventparam 7602–7604 (contract target clear flags)',
      'soulstruct common.evs.py Event_3119 (stage transitions)',
      'er-save-manager quest_flags_db.py "Tanith" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Tanith column (ordering)',
    ],
  },
  () => [
    step('meet', 'Meet Tanith in the Volcano Manor', {
      kind: 'talk',
      where: { grace: VOLCANO_MANOR },
      note: 'Reach the Manor through Rya, or on foot from Mt. Gelmir.',
    }),
    step('join', 'Accept her offer and join the Volcano Manor', {
      kind: 'talk',
      done: talk(16009208, 'chose to fight alongside the Manor'),
      evidence: 'script',
      where: { grace: VOLCANO_MANOR },
      lockedBy: [lockedByGate(GATES.rykard)],
      note: 'Refusing the first time is fine: talk to her again.',
      rewards: ['Drawing-Room Key', 'Recusant Finger'],
    }),
    detour(
      'contracts',
      'Carry out the Volcano Manor contracts',
      {
        lockedBy: [lockedByGate(GATES.rykard)],
        reward:
          'Magma Shot, Serpentbone Blade, Taker’s Cameo and an audience with Rykard',
      },
      [
        step(
          'letter',
          'Take the first contract letter from the drawing-room table',
          {
            kind: 'item',
            done: has(8127, 'Letter from Volcano Manor'),
            evidence: 'assumed',
            where: { grace: VOLCANO_MANOR },
            note: 'Picking up the letter is what moves her story on.',
            rewards: ['Letter from Volcano Manor'],
          },
        ),
        step('istvan', 'Invade and kill Old Knight Istvan in Limgrave', {
          kind: 'boss',
          done: boss(7602, 'first contract target slain'),
          evidence: 'script',
          where: {
            note: 'Red invasion sign near the Divine Tower of Limgrave bridge',
          },
        }),
        step('istvan-reward', 'Report to Tanith for the Magma Shot', {
          kind: 'talk',
          done: talk(16009216, 'first contract reported'),
          evidence: 'script',
          where: { grace: VOLCANO_MANOR },
          rewards: ['Magma Shot', 'Letter from Volcano Manor'],
        }),
        step(
          'rileigh',
          'Invade and kill Rileigh the Idle on the Altus Plateau',
          {
            kind: 'boss',
            done: boss(7603, 'second contract target slain'),
            evidence: 'script',
            requires: [needsGate(GATES.altusGrace)],
            where: { note: 'Red invasion sign on the Altus Plateau' },
          },
        ),
        step('rileigh-reward', 'Report to Tanith for the Serpentbone Blade', {
          kind: 'talk',
          done: talk(16009217, 'second contract reported'),
          evidence: 'script',
          where: { grace: VOLCANO_MANOR },
          rewards: ['Serpentbone Blade', 'Red Letter'],
        }),
        step(
          'juno',
          'Invade and kill Juno Hoslow in the Mountaintops of the Giants',
          {
            kind: 'boss',
            done: boss(7604, 'third contract target slain'),
            evidence: 'script',
            requires: [needsGate(GATES.mountaintopsGrace)],
            where: {
              note: 'Red invasion sign in the Mountaintops of the Giants',
            },
          },
        ),
        step(
          'juno-reward',
          'Report to Tanith for the Taker’s Cameo and her offer to meet Rykard',
          {
            kind: 'talk',
            done: talk(16009237, 'third contract reward received'),
            evidence: 'script',
            where: { grace: VOLCANO_MANOR },
            rewards: ["Taker's Cameo"],
          },
        ),
        step('audience', 'Answer her offer of an audience with Lord Rykard', {
          kind: 'talk',
          done: any(
            talk(16009235, 'accepted the audience'),
            talk(16009236, 'declined the audience'),
          ),
          evidence: 'script',
          note: 'Accepting takes you straight to his chamber. Declining is fine: walk there instead.',
          unlocks: ['A direct route to Rykard’s chamber (if you accept)'],
        }),
      ],
    ),
    step('after-rykard', 'Talk to Tanith after Rykard falls', {
      kind: 'talk',
      done: talk(16009245, 'first post-Rykard talk'),
      evidence: 'script',
      requires: [needsGate(GATES.rykard)],
      where: { grace: VOLCANO_MANOR },
    }),
    step('leaving', 'Talk to her again: she means to stay with her lord', {
      kind: 'talk',
      done: talk(16009246, 'second post-Rykard talk'),
      evidence: 'script',
      reload: true,
    }),
    step('devouring', 'Find Tanith in Rykard’s chamber and talk to her', {
      kind: 'talk',
      done: talk(16009255, 'first talk while devouring Rykard'),
      evidence: 'script',
      where: { grace: RYKARD_GRACE },
    }),
    detour(
      'consort',
      'Fight Tanith and her guard',
      { reward: 'Consort set and Aspects of the Crucible: Breath' },
      [
        step('kill-tanith', 'Strike Tanith down in Rykard’s chamber', {
          kind: 'action',
          done: talk(16009265, 'fight with her guard started'),
          evidence: 'script',
          where: { grace: RYKARD_GRACE },
          note: 'Give her the castanets first: this ends her questline. Rest to find her set where she sat.',
          rewards: ["Consort's Mask", "Consort's Robe", "Consort's Trousers"],
        }),
        step('kill-guard', 'Defeat the knight who avenges her', {
          kind: 'boss',
          done: talk(16009264, 'her guard is defeated'),
          evidence: 'script',
          where: { grace: RYKARD_GRACE },
          rewards: ['Aspects of the Crucible: Breath'],
        }),
      ],
    ),
    step('castanets', 'Give her the Dancer’s Castanets from Patches', {
      kind: 'item',
      done: all(
        talk(1039549205, 'Patches handed over the castanets'),
        not(has(8168, 'Dancer’s Castanets')),
      ),
      evidence: 'assumed',
      requires: [
        {
          cond: reached('patches', 'castanets'),
          label: 'Get the Dancer’s Castanets from Patches at the Shaded Castle',
        },
      ],
      lockedBy: [
        lockedWhen(
          all(
            flag(3683, 'status', 'Patches is dead'),
            not(talk(1039549205, 'Patches handed over the castanets')),
          ),
          'Patches dies before giving you the Dancer’s Castanets',
        ),
        lockedWhen(talk(16009265, 'Tanith was attacked'), 'Strike Tanith down'),
      ],
      where: { grace: RYKARD_GRACE },
    }),
  ],
);
