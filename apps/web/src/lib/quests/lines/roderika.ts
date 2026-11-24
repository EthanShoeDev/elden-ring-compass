import { all, any, pickup, talk } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByGate,
  needsGate,
  statusBlock,
  step,
} from '../model';

const STORMHILL_SHACK = 76102;
const TABLE_OF_LOST_GRACE = 71190;

/**
 * Roderika (talk block NPC320) and Hewg, the Roundtable smith.
 *
 * Stage machine (`common.evs.py` `Event_3719`): 3705 initial → 3707 at Roundtable Hold, on
 * (3705 ∧ talk 1041389413 "post-Memento talk played") ∨ 3062 "a Liurnia grace was lit" → 3708
 * Spirit Tuner, on Hewg's talk flag 11109213 → 3709 once the Erdtree burns (flag 110, from ANY
 * stage — so 3709 is never evidence that the earlier steps happened).
 *
 * Lighting a Liurnia grace before handing over the Memento moves her to the Hold anyway, so her
 * whole Stormhill Shack arc is a detour, locked by that gate.
 */
export const roderika = defineQuest(
  {
    id: 'roderika',
    npc: 'Roderika & Hewg',
    isDlc: false,
    blurb:
      'A grieving girl at the Stormhill Shack who becomes the Roundtable’s Spirit Tuner.',
    status: statusBlock(3700),
    stages: {
      initial: 3705,
      roundtable: 3707,
      spiritTuner: 3708,
      erdtreeBurned: 3709,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC320 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3719 (stage transitions)',
      'er-save-manager quest_flags_db.py "Roderika" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Roderika & Hewg column (ordering)',
    ],
  },
  ({ stage }) => [
    detour(
      'stormhill',
      'Help Roderika at the Stormhill Shack',
      {
        lockedBy: [lockedByGate(GATES.liurniaGrace)],
        reward:
          'Her Stormhill Shack dialogue about the Memento (dialogue only, no item)',
      },
      [
        step('meet-shack', 'Meet Roderika at the Stormhill Shack', {
          kind: 'talk',
          done: talk(1041389411, 'gave the Spirit Jellyfish Ashes'),
          evidence: 'script',
          rewards: ['Spirit Jellyfish Ashes', 'Sitting Sideways'],
          where: { grace: STORMHILL_SHACK },
        }),
        step(
          'find-memento',
          'Find the Chrysalids’ Memento in Stormveil Castle',
          {
            kind: 'item',
            done: pickup(10007450, 'Chrysalids’ Memento picked up'),
            evidence: 'observed',
            where: { note: 'Stormveil Castle' },
          },
        ),
        step(
          'give-memento',
          'Give Roderika the Memento at the Stormhill Shack',
          {
            kind: 'talk',
            done: talk(1041389412, 'gave her the Memento'),
            evidence: 'script',
            where: { grace: STORMHILL_SHACK },
            reload: true,
            note: 'Talk to her once more afterwards, then rest. She leaves for Roundtable Hold.',
          },
        ),
      ],
    ),
    step('roundtable', 'Talk to Roderika at Roundtable Hold', {
      kind: 'talk',
      done: talk(11109255, 'first Roundtable conversation played'),
      evidence: 'script',
      where: { grace: TABLE_OF_LOST_GRACE },
      requires: [
        {
          cond: any(
            stage('roundtable'),
            stage('spiritTuner'),
            stage('erdtreeBurned'),
          ),
          label:
            'Roderika has moved to Roundtable Hold (give her the Memento, or light a grace in Liurnia)',
        },
      ],
    }),
    step(
      'meet-hewg',
      'Meet Hewg in the Hold’s smithy and ask him about Roderika',
      {
        kind: 'talk',
        where: { grace: TABLE_OF_LOST_GRACE },
      },
    ),
    step(
      'tell-roderika',
      'Tell Roderika that Hewg sees a Spirit Tuner’s talent in her',
      {
        kind: 'talk',
        done: talk(11109256, 'told her about her talent'),
        evidence: 'script',
      },
    ),
    step('ask-hewg', 'Ask Hewg to watch over her', {
      kind: 'talk',
      done: talk(11109213, 'Hewg agreed'),
      evidence: 'script',
      reload: true,
    }),
    step(
      'spirit-tuner',
      'Talk to Roderika in the smithy: Spirit Tuning unlocked',
      {
        kind: 'talk',
        done: any(
          stage('spiritTuner'),
          talk(11109265, 'first Spirit Tuner talk'),
        ),
        evidence: 'script',
        unlocks: ['Spirit Tuning: Roderika upgrades your spirit ashes'],
      },
    ),
    detour(
      'crimson-hood',
      'Collect the Crimson Hood',
      { reward: 'Crimson Hood' },
      [
        step(
          'crimson-hood-pickup',
          'Pick up the Crimson Hood where the Memento lay',
          {
            kind: 'item',
            rewards: ['Crimson Hood'],
            // 10007452 is also switched on at her initial stage (Event_3719) to hide the hood, so
            // it only means "picked up" once she is a Spirit Tuner. Unverified against a save.
            done: all(
              any(
                talk(11109265, 'first Spirit Tuner talk'),
                stage('spiritTuner'),
              ),
              pickup(10007452, 'Crimson Hood picked up'),
            ),
            evidence: 'assumed',
            where: { note: 'Stormveil Castle' },
          },
        ),
      ],
    ),
    step(
      'hewg-prayer',
      'Talk to Hewg, overhear his prayer, then talk to him again',
      {
        kind: 'talk',
        requires: [needsGate(GATES.godrick)],
      },
    ),
    step('upgrade-ash', 'Have Roderika upgrade any spirit ash to +4', {
      kind: 'action',
      done: talk(11109266, 'upgraded a spirit ash'),
      evidence: 'script',
    }),
    step('curtsy', 'Talk to Roderika and Hewg to receive the Curtsy gesture', {
      kind: 'talk',
      done: talk(11109267, 'Spirit Tuning talk played'),
      evidence: 'script',
      rewards: ['Curtsy'],
    }),
    detour(
      'dung-eater',
      'Roderika and the Dung Eater',
      {
        lockedBy: [lockedByGate(GATES.erdtreeBurned)],
        reward: 'Roderika’s dialogue about the Dung Eater (dialogue only)',
      },
      [
        step(
          'dung-eater-talk',
          'Talk to Roderika each time the Dung Eater comes or goes',
          {
            kind: 'talk',
            done: any(talk(11109270), talk(11109271)),
            evidence: 'observed',
          },
        ),
      ],
    ),
    step('hewg-after-burning', 'Ask Hewg about the god-slaying weapon', {
      kind: 'talk',
      done: any(talk(11109238), talk(11109227), talk(11109230)),
      evidence: 'observed',
      requires: [needsGate(GATES.erdtreeBurned)],
    }),
    step(
      'both-after-burning',
      'Talk to Roderika about Hewg, then Hewg about her',
      {
        kind: 'talk',
        done: any(
          talk(11109275, 'post-burning talk'),
          talk(11109276, 'about Hewg ①'),
        ),
        evidence: 'script',
      },
    ),
    detour(
      'weapon-upgrade',
      'Hewg and your weapon',
      { reward: 'Hewg’s extra dialogue about your weapon (dialogue only)' },
      [
        step(
          'weapon-upgrade-talk',
          'Upgrade a weapon to +25 (somber +10), then talk to Hewg',
          {
            kind: 'action',
          },
        ),
      ],
    ),
    step('farewell', 'Talk to Roderika and Hewg one last time', {
      kind: 'talk',
      done: any(talk(11109277, 'about Hewg ②'), talk(11109232)),
      evidence: 'assumed',
      requires: [needsGate(GATES.maliketh)],
    }),
  ],
);
