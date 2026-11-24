import { all, any, flag, has, not, pickup, talk } from '../cond';
import { defineQuest, lockedWhen, type QuestNode, step } from '../model';

const BESTIAL_SANCTUM = 76454;

const CARRY_DEATHROOT = {
  cond: has(2090, 'Deathroot'),
  label: 'Carry a Deathroot (Beast Eye shudders when one is near)',
};

/**
 * One Deathroot handed over, proven by the reward's item-lot flag (er-save-manager log).
 * `rewards` are exact catalog names; the first one names the step.
 */
const deathroot = (
  n: number,
  rewards: readonly [string, ...Array<string>],
  lotFlag: number,
  evidence: 'observed' | 'assumed' = 'observed',
): QuestNode =>
  step(`deathroot-${n}`, `Give Gurranq Deathroot #${n}`, {
    kind: 'item',
    done: pickup(lotFlag, `${rewards[0]} received`),
    evidence,
    requires: [CARRY_DEATHROOT],
    rewards,
    where: { grace: BESTIAL_SANCTUM },
  });

/**
 * Gurranq, Beast Clergyman (talk block NPC202, the Maliketh character; status 3640–3643).
 *
 * Stage machine (`common.evs.py` `Event_3659`): 3645 initial → 3646 "lost his mind", once the
 * reward counter (event value at 1051439235, 5 bits) reaches 4; this also sets his status to
 * 3642 (permanently hostile) for the fight → `m60_51_43` `Event_1051430702` restores 3640 once
 * his HP is worn down → 3647 "came to his senses" (talk 1051439211) → 3648 "nowhere", once the
 * counter reaches 9 (every Deathroot delivered).
 *
 * Because the frenzy borrows the permanently-hostile flag, `status` is not used: dead (3643), or
 * 3642 outside the frenzy stage, lock the questline instead. The 3641 absolvable flag clears on
 * the next load (`Event_1051433705`), so it needs no handling.
 *
 * Reward lot flags 400238–400230 come from the community flag log; #6 (400233, Stone of Gurranq)
 * is interpolated from the run.
 */
export const gurranq = defineQuest(
  {
    id: 'gurranq',
    npc: 'Gurranq, Beast Clergyman',
    isDlc: false,
    blurb:
      'A bestial clergyman in Dragonbarrow who devours Deathroot, paying for each with a beast-sacred gift.',
    stages: {
      initial: 3645,
      frenzied: 3646,
      calmed: 3647,
      gone: 3648,
    },
    lockedBy: [
      lockedWhen(flag(3643, 'status', 'dead'), 'Gurranq is dead'),
      lockedWhen(
        all(
          flag(3642, 'status', 'permanently hostile'),
          not(flag(3646, 'stage', 'frenzied')),
        ),
        'Gurranq is permanently hostile',
      ),
    ],
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC202 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3659 (stage transitions), m60_51_43_00.evs.py (frenzy fight)',
      'er-save-manager quest_flags_db.py "Gurranq" (observed reward item-lot flags)',
      'NPC Quests & Endings Guide v5 flowchart, Gurranq column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Find Gurranq in the Bestial Sanctum', {
      kind: 'talk',
      done: any(
        talk(1051439203, 'met Gurranq'),
        talk(1051439205, 'spoke to Gurranq'),
      ),
      evidence: 'script',
      where: { grace: BESTIAL_SANCTUM },
    }),
    deathroot(1, ['Clawmark Seal', 'Beast Eye'], 400238),
    deathroot(2, ['Bestial Sling'], 400237),
    deathroot(3, ['Bestial Vitality'], 400236),
    deathroot(4, ["Ash of War: Beast's Roar"], 400235),
    step('frenzy', 'Rest, return, and fight Gurranq until he calms down', {
      kind: 'boss',
      done: any(
        talk(1051439211, 'spoke to him once sane again'),
        stage('calmed'),
        stage('gone'),
      ),
      evidence: 'script',
      where: { grace: BESTIAL_SANCTUM },
      note: 'He doesn’t die: wear his HP down and he stops attacking.',
    }),
    deathroot(5, ['Beast Claw'], 400234),
    deathroot(6, ['Stone of Gurranq'], 400233, 'assumed'),
    deathroot(7, ['Beastclaw Greathammer'], 400232),
    deathroot(8, ["Gurranq's Beast Claw"], 400231),
    step('deathroot-9', 'Give Gurranq the ninth and last Deathroot', {
      kind: 'item',
      done: any(
        pickup(400230, 'Ancient Dragon Smithing Stone received'),
        stage('gone'),
      ),
      evidence: 'observed',
      requires: [CARRY_DEATHROOT],
      rewards: ['Ancient Dragon Smithing Stone'],
      where: { grace: BESTIAL_SANCTUM },
      note: 'He howls and leaves the Sanctum for good.',
    }),
  ],
);
