import { any, boss, has, pickup } from '../cond';
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

const BELURAT = 72001;

const DANCING_LION = boss(20000800, 'Divine Beast Dancing Lion (Belurat)');

/**
 * Hornsent Grandam (status block 4480), hidden in a storeroom in Belurat.
 *
 * Her block (`common.evs.py` Event_4499) has no stage moves: 4485 throughout, 4483 once she's dead.
 * Her hostility helper (Event_4613) reads 4485/4483 with her Belurat talk flags 20009261 /
 * 20009262 / 20009283 and the first Scorpion Stew's pickup flag, 400720 — those talk flags'
 * dialogue isn't known yet. Every reward is an ItemLotParam_map pickup flag (regulation.bin
 * `getItemFlagId`): Storeroom Key 20007480, first Scorpion Stew 400720 + Watchful Spirit 400721
 * (lots 107210/107211), Gourmet Scorpion Stew 400722 (lot 107220), the stew left on her body
 * 400723 (lot 107230). Repeat Scorpion Stews come from lot 107200, which has no flag.
 *
 * She dies as part of her own ending (`diesAfter: 'gourmet-stew'`); only a death before she hands
 * over the Gourmet Stew is a lockout.
 */
export const grandam = defineQuest(
  {
    id: 'grandam',
    npc: 'Hornsent Grandam',
    isDlc: true,
    blurb:
      'An old hornsent woman hiding in Belurat, who mistakes you for a kinsman once you wear the Divine Beast’s head.',
    status: { ...statusBlock(4480), diesAfter: 'gourmet-stew' },
    stages: { belurat: 4485 },
    sources: [
      'soulstruct common.evs.py Event_4499 (status/stage block), Event_4613 (Belurat flags)',
      'regulation.bin ItemLotParam_map getItemFlagId (Storeroom Key, stews, Watchful Spirit)',
      'Paramdex WorldMapPointParam / ItemLotParam_map names',
      'NPC Quests & Endings Guide v5 SotE flowchart, Hornsent Grandam column (ordering)',
    ],
  },
  () => [
    step('storeroom-key', 'Find the Storeroom Key in Belurat', {
      kind: 'item',
      requires: [needsGate(GATES.landOfShadow)],
      done: any(
        pickup(20007480, 'Storeroom Key picked up'),
        has(2008013, 'Storeroom Key'),
      ),
      evidence: 'script',
      where: { grace: BELURAT },
      rewards: ['Storeroom Key'],
    }),
    detour(
      'first-meeting',
      'Meet her before the Dancing Lion',
      {
        lockedBy: [
          lockedWhen(
            DANCING_LION,
            'Defeat the Divine Beast Dancing Lion',
            'The Dancing Lion is already defeated',
          ),
        ],
        reward: 'Her first conversation',
      },
      [
        step(
          'meet',
          'Unlock the second-floor storeroom and talk to the Grandam',
          {
            kind: 'talk',
            where: { grace: BELURAT, note: 'Belurat, second-floor storeroom' },
            flagTodo:
              'first talk with the Hornsent Grandam (no Divine Beast Head on); the flag that flips',
          },
        ),
      ],
    ),
    step(
      'first-stew',
      'Wear the Divine Beast Head and talk to her, then rest and talk again',
      {
        kind: 'talk',
        done: any(
          pickup(400721, 'Watchful Spirit'),
          pickup(400720, 'first Scorpion Stew'),
          has(2007600, 'Watchful Spirit'),
        ),
        evidence: 'script',
        requires: [
          {
            cond: DANCING_LION,
            label:
              'Defeat the Divine Beast Dancing Lion in Belurat (it drops the Divine Beast Head)',
          },
        ],
        lockedBy: [lockedByGate(GATES.messmer)],
        where: { grace: BELURAT, note: 'Belurat, second-floor storeroom' },
        reload: true,
        note: 'She’ll hand out another stew whenever you have none.',
        rewards: ['Watchful Spirit', 'Scorpion Stew'],
        unlocks: ['A fresh Scorpion Stew from her whenever you have none'],
      },
    ),
    step(
      'gourmet-stew',
      'After Messmer falls, wear the head again and talk to her for a Gourmet Scorpion Stew',
      {
        kind: 'talk',
        done: pickup(400722, 'Gourmet Scorpion Stew'),
        evidence: 'script',
        rewards: ['Gourmet Scorpion Stew'],
        requires: [needsGate(GATES.messmer)],
        where: { grace: BELURAT, note: 'Belurat, second-floor storeroom' },
        reload: true,
      },
    ),
    step(
      'her-body',
      'Rest, return and take the last Gourmet Scorpion Stew from her body',
      {
        kind: 'item',
        done: pickup(400723, 'Gourmet Scorpion Stew on her body'),
        evidence: 'script',
        rewards: ['Gourmet Scorpion Stew'],
        where: { grace: BELURAT, note: 'Belurat, second-floor storeroom' },
      },
    ),
  ],
);
