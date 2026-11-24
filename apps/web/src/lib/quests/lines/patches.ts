import { all, any, boss, not, reached, talk } from '../cond';
import { defineGate, GATES } from '../gates';
import { defineQuest, detour, lockedWhen, needsGate, step } from '../model';

const MURKWATER_CAVE = 73100;
const SCENIC_ISLE = 76203;
const FIRST_MT_GELMIR_CAMPSITE = 76351;
const VOLCANO_MANOR = 71602;
const RUIN_STREWN_PRECIPICE_OVERLOOK = 73902;
const CASTELLANS_HALL = 76322;

/** Tanith's "chose to fight alongside the Manor" talk flag (NPC300). */
const JOINED_MANOR = talk(16009208, 'joined the Volcano Manor');

/** Patches only waits at the Shaded Castle once its boss is dead. */
const elemer = defineGate(
  'elemer',
  'Defeat Elemer of the Briar in the Shaded Castle',
  boss(1039540800, 'Elemer of the Briar'),
);

/**
 * Patches (talk block NPC309).
 *
 * Stage machine (`common.evs.py` `Event_3699`): 3685 initial (Murkwater Cave boss) → 3686 waiting
 * by his chest trap, on the post-surrender talk (31009206) → 3687 reunited at the lake, on his
 * "way to the Erdtree" talk (1038419254) ∧ ¬joined the Manor → 3688/3693 on Mt. Gelmir before /
 * after he kicks you off the cliff (1037549211, 1037549210) ∧ ¬joined → 3689 at the Volcano Manor,
 * on joining Tanith (16009208) → 3690 entrusting a gift for Tanith, on his post-Rykard talk
 * (16009359) → 3696 → 3691 bandit again at Murkwater, once he hands over the castanets
 * (1039549205) → 3692 last shop, on his second post-surrender talk there (31009256).
 *
 * Every Liurnia / Mt. Gelmir stage requires ¬joined, so that arc is a detour closed by joining
 * the Manor; without joining he never reaches the Manor and the rest of the line is gone.
 */
export const patches = defineQuest(
  {
    id: 'patches',
    npc: 'Patches',
    isDlc: false,
    blurb:
      'A treacherous merchant who keeps turning up, always with a trap and an apology.',
    // Not `statusBlock(3680)`: both Murkwater Cave fights switch on 3682 "hostile (not absolvable)"
    // while he is a boss (the fixture has it on with him still in stage 3685), and a surrender
    // resets it, so 3682 is not a lockout. Only death (3683) is.
    status: { alive: 3680, hostile: 3681, hostilePermanent: 3683, dead: 3683 },
    stages: {
      initial: 3685,
      chestTrap: 3686,
      lake: 3687,
      gelmir: 3688,
      atManor: 3689,
      giftForTanith: 3690,
      bandit: 3691,
      lastShop: 3692,
      kicked: 3693,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC309 (status/stage/talk flag names)',
      'soulsmods elden-ring-eventparam 7606 (Tragoth clear flag)',
      'soulstruct common.evs.py Event_3699 (stage transitions)',
      'er-save-manager quest_flags_db.py "Patches" (observed talk / gesture flags)',
      'NPC Quests & Endings Guide v5 flowchart, Patches column (ordering, missables)',
    ],
  },
  () => [
    step(
      'spare',
      'Beat Patches in Murkwater Cave until he begs, and spare him',
      {
        kind: 'boss',
        done: talk(31009206, 'forgave him'),
        evidence: 'script',
        where: { grace: MURKWATER_CAVE },
        note: 'Killing him here ends his questline.',
        rewards: ['Grovel For Mercy', 'Golden Rune [1]'],
        unlocks: ['Patches’ shop'],
      },
    ),
    detour(
      'chest-trap',
      'Fall for his chest trap',
      {
        lockedBy: [
          lockedWhen(
            any(
              talk(1038419250, 'met him on the Scenic Isle'),
              talk(1038419255, 'first Scenic Isle menu'),
              talk(1037549205, 'met him on Mt. Gelmir'),
              talk(16009355, 'met him in the Manor'),
            ),
            'Patches moves on from Murkwater Cave',
          ),
        ],
        reward: 'Calm Down! gesture',
      },
      [
        step('chest', 'Open the chest he points you to, then talk to him', {
          kind: 'action',
          // Not the Calm Down! gesture flag (60816): gestures carry over into NG+.
          done: talk(31009234, 'first talk after the trap sprung'),
          evidence: 'script',
          where: { grace: MURKWATER_CAVE },
          rewards: ['Calm Down!'],
        }),
      ],
    ),
    detour(
      'lake-and-gelmir',
      'Meet him again in Liurnia and on Mt. Gelmir',
      {
        lockedBy: [
          lockedWhen(JOINED_MANOR, 'Join the Volcano Manor through Tanith'),
        ],
        reward: 'His Scenic Isle shop and Mt. Gelmir scenes',
      },
      [
        step('scenic-isle', 'Find Patches by the Scenic Isle', {
          kind: 'talk',
          done: any(
            talk(1038419250, 'first lake talk'),
            talk(1038419255, 'first Scenic Isle menu'),
          ),
          evidence: 'observed',
          requires: [needsGate(GATES.liurniaGrace)],
          where: { grace: SCENIC_ISLE },
        }),
        step(
          'erdtree-way',
          'Once on the Altus Plateau, ask him the way to the Erdtree',
          {
            kind: 'talk',
            done: talk(1038419254, 'talked about the way to the Erdtree'),
            evidence: 'script',
            requires: [needsGate(GATES.altusGrace)],
            where: { grace: SCENIC_ISLE },
            reload: true,
          },
        ),
        step(
          'gelmir',
          'Follow the glowing stones up Mt. Gelmir and talk to him',
          {
            kind: 'talk',
            done: talk(1037549205, 'first Mt. Gelmir talk'),
            evidence: 'script',
            where: { grace: FIRST_MT_GELMIR_CAMPSITE },
          },
        ),
        step('kicked', 'Reach the last stone: he kicks you off the cliff', {
          kind: 'event',
          done: talk(1037549210, 'kick cutscene played'),
          evidence: 'script',
        }),
        step('after-kick', 'Go back and confront him', {
          kind: 'talk',
          done: talk(1037549207, 'post-kick talk'),
          evidence: 'script',
          where: { grace: FIRST_MT_GELMIR_CAMPSITE },
        }),
      ],
    ),
    step('manor', 'Find Patches in the Volcano Manor', {
      kind: 'talk',
      done: talk(16009355, 'first Manor talk'),
      evidence: 'script',
      requires: [
        { cond: reached('tanith', 'join'), label: 'Join the Volcano Manor' },
      ],
      lockedBy: [
        lockedWhen(
          all(GATES.rykard.cond, not(JOINED_MANOR)),
          'Defeat Rykard without joining the Volcano Manor',
        ),
      ],
      where: { grace: VOLCANO_MANOR },
    }),
    step(
      'letter',
      'After your first contract, get the Letter to Patches from him',
      {
        kind: 'talk',
        done: talk(16009357, 'contract letter handed over'),
        rewards: ['Letter to Patches'],
        evidence: 'script',
        requires: [
          {
            cond: reached('tanith', 'istvan'),
            label: 'Complete Tanith’s first contract',
          },
        ],
        where: { grace: VOLCANO_MANOR },
      },
    ),
    detour(
      'tragoth',
      'Patches’ contract: Great Horned Tragoth',
      {
        lockedBy: [
          lockedWhen(
            talk(16009359, 'post-Rykard talk'),
            'Talk to Patches after Rykard’s defeat (he leaves the Manor)',
          ),
        ],
        reward: 'Bull-Goat set and Magma Whip Candlestick',
      },
      [
        step('kill-tragoth', 'Invade and kill Great Horned Tragoth', {
          kind: 'boss',
          done: boss(7606, 'Tragoth slain'),
          rewards: [
            'Bull-Goat Helm',
            'Bull-Goat Armor',
            'Bull-Goat Gauntlets',
            'Bull-Goat Greaves',
          ],
          evidence: 'script',
          where: { grace: RUIN_STREWN_PRECIPICE_OVERLOOK },
        }),
        step('report', 'Tell Patches the job is done', {
          kind: 'talk',
          done: talk(16009358, 'reported Tragoth'),
          evidence: 'script',
          where: { grace: VOLCANO_MANOR },
          reload: true,
        }),
        step('reward', 'Rest, then ask him for your reward', {
          kind: 'talk',
          done: talk(16009367, 'reward collected'),
          rewards: ['Magma Whip Candlestick'],
          evidence: 'script',
          where: { grace: VOLCANO_MANOR },
        }),
      ],
    ),
    step('after-rykard', 'Talk to Patches after Rykard falls', {
      kind: 'talk',
      done: talk(16009359, 'post-Rykard talk'),
      evidence: 'script',
      requires: [needsGate(GATES.rykard)],
      where: { grace: VOLCANO_MANOR },
      reload: true,
    }),
    step(
      'castanets',
      'Find him at the Shaded Castle and take the Dancer’s Castanets',
      {
        kind: 'talk',
        done: talk(1039549205, 'gift for Tanith received'),
        rewards: ["Dancer's Castanets"],
        evidence: 'script',
        requires: [needsGate(elemer)],
        where: { grace: CASTELLANS_HALL },
        reload: true,
        note: 'Talk to him again: he dozes off and leaves after you rest. The castanets are for Tanith.',
      },
    ),
    step(
      'murkwater-again',
      'Fight him again in Murkwater Cave and accept his surrender',
      {
        kind: 'boss',
        done: talk(31009255, 'post-surrender talk as a bandit'),
        evidence: 'script',
        rewards: ["Patches' Crouch"],
        where: { grace: MURKWATER_CAVE },
        reload: true,
      },
    ),
    step('last-shop', 'Rest, then talk to him by the campfire', {
      kind: 'talk',
      done: talk(31009275, 'last shop talk'),
      evidence: 'script',
      unlocks: ['Patches’ shop, for good'],
      where: { grace: MURKWATER_CAVE },
    }),
  ],
);
