import { any, has, pickup, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  type Lock,
  lockedByGate,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const RANNIS_RISE = 76228;
const SELUVIS_RISE = 'Seluvis’s Rise, at the Three Sisters';

/** Handing Ranni the Fingerslayer Blade sets 1034509433, and Seluvis dies (stage 3569). */
const BLADE_GIVEN: Lock = lockedWhen(
  reached('ranni', 'give-blade'),
  'Give Ranni the Fingerslayer Blade (she does away with Seluvis)',
  'Ranni has the Fingerslayer Blade, and Seluvis is dead',
);

/**
 * Preceptor Seluvis (status 3560 `傀儡師`; his talk flags are labeled NPC307, 1034509300–349 and
 * 1035509200+, without per-flag names).
 *
 * Stage machine (`common.evs.py` `Event_3579`): 3565 initial → 3566 on joining Ranni (1034509410)
 * → 3567 when she withdraws to rest (1034509416) → 3568 after the talk that follows the Amber
 * Starlight (1034509315) → 3569 dead, from any earlier stage, once Ranni drinks his Amber Draught
 * (1034509424) or has the Fingerslayer Blade (1034509433, set by Ranni's `Event_3759`). The spirit
 * talks (1034509305/306) are read by `m60_34_50` Event_1034500734; the rest of the steps are from
 * the community flag log.
 */
export const seluvis = defineQuest(
  {
    id: 'seluvis',
    npc: 'Preceptor Seluvis',
    isDlc: false,
    blurb:
      'Ranni’s scheming preceptor, a puppeteer with a potion for everyone and a plot of his own.',
    status: statusBlock(3560),
    stages: {
      initial: 3565,
      joinedRanni: 3566,
      ranniAsleep: 3567,
      rewarded: 3568,
      dead: 3569,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_Common (status block 3560, talk flag ranges)',
      'soulstruct common.evs.py Event_3579 (stage transitions); m60_34_50_00.evs.py Event_1034500734',
      'er-save-manager quest_flags_db.py "Seluvis" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Seluvis column (ordering, missables)',
    ],
  },
  ({ stage }) => [
    step('spirit', 'Talk to Seluvis’s spirit at Ranni’s Rise', {
      kind: 'talk',
      done: any(
        talk(1034509305, 'spirit’s first talk'),
        talk(1034509306, 'spirit’s second talk'),
      ),
      evidence: 'script',
      requires: [
        { cond: reached('ranni', 'join'), label: 'Enter Ranni’s service' },
      ],
      where: { grace: RANNIS_RISE },
    }),
    detour(
      'remains',
      'Loot Seluvis’s body once he is dead',
      {
        reward:
          "Seluvis's Bell Bearing and the Preceptor's set (his body at his Rise)",
      },
      [
        step('loot', 'After Seluvis dies, take his gear from his Rise', {
          kind: 'item',
          done: pickup(400148, 'Seluvis’s Bell Bearing picked up'),
          evidence: 'observed',
          requires: [
            {
              cond: stage('dead'),
              label:
                'Seluvis has died (Ranni has the Fingerslayer Blade or drank his draught)',
            },
          ],
          where: { note: SELUVIS_RISE },
          rewards: [
            "Seluvis's Bell Bearing",
            "Preceptor's Big Hat",
            "Preceptor's Long Gown",
            "Preceptor's Gloves",
            "Preceptor's Trousers",
          ],
        }),
      ],
    ),
    detour(
      'introduction',
      'Seluvis’s letter of introduction',
      {
        lockedBy: [lockedByGate(GATES.radahn), BLADE_GIVEN],
        reward: "Seluvis's Introduction",
      },
      [
        step(
          'ask-nokron',
          'Ask Seluvis about Nokron and take his Introduction',
          {
            kind: 'talk',
            done: any(
              pickup(400143, 'Seluvis’s Introduction received'),
              has(8143, 'Seluvis’s Introduction'),
            ),
            evidence: 'observed',
            requires: [
              {
                cond: reached('blaidd', 'siofra-talk'),
                label: 'Hear from Blaidd at the Siofra River',
              },
            ],
            where: { note: SELUVIS_RISE },
            rewards: ["Seluvis's Introduction"],
          },
        ),
      ],
    ),
    step('rise', 'Visit Seluvis at his Rise', {
      kind: 'talk',
      done: any(
        talk(1034509310, 'first Rise talk, declined'),
        talk(1034509312, 'took the potion'),
      ),
      evidence: 'observed',
      lockedBy: [BLADE_GIVEN],
      where: { note: SELUVIS_RISE },
      unlocks: ['Seluvis’s shop: Carian and glintstone sorceries'],
    }),
    step('potion', 'Accept Seluvis’s Potion', {
      kind: 'talk',
      done: any(
        talk(1034509312, 'took the potion'),
        pickup(400140, 'Seluvis’s Potion received'),
      ),
      evidence: 'observed',
      lockedBy: [BLADE_GIVEN],
      where: { note: SELUVIS_RISE },
      note: 'He wants Nepheli to drink it. Delivering it isn’t needed for the rest of his questline.',
      rewards: ["Seluvis's Potion"],
    }),
    detour(
      'potion-delivered',
      'Deliver the potion and report back',
      {
        lockedBy: [BLADE_GIVEN],
        reward:
          'A new puppet in Seluvis’s shop (Dolores the Sleeping Arrow Puppet or Dung Eater Puppet)',
      },
      [
        step(
          'report-potion',
          'Give the potion to Nepheli or the Dung Eater (or hand it to Gideon), then return to Seluvis',
          {
            kind: 'talk',
            done: talk(1034509313, 'returned after the potion'),
            evidence: 'observed',
            requires: [
              {
                cond: any(
                  reached('nepheli', 'puppet'),
                  reached('dung-eater', 'seluvis-potion'),
                  reached('gideon', 'give-potion'),
                ),
                label:
                  'Give the potion to Nepheli or the Dung Eater, or let Gideon dispose of it',
              },
            ],
            where: { note: SELUVIS_RISE },
            unlocks: [
              'Dolores the Sleeping Arrow Puppet in his shop (potion to Nepheli) or the Dung Eater Puppet (potion to the Dung Eater)',
            ],
          },
        ),
      ],
    ),
    step(
      'puppet-room',
      'Find the hidden puppet room beneath the Three Sisters',
      {
        kind: 'action',
        lockedBy: [BLADE_GIVEN],
        where: { note: SELUVIS_RISE },
        flagTodo:
          'Walk through the illusory wall into Seluvis’s secret puppet room; record the flag that flips',
      },
    ),
    step('ask-chambers', 'Ask Seluvis about his chambers and pick a puppet', {
      kind: 'talk',
      done: talk(1034509328, 'asked about his chambers'),
      evidence: 'observed',
      lockedBy: [BLADE_GIVEN],
      where: { note: SELUVIS_RISE },
      unlocks: [
        'A free puppet: Finger Maiden Therolina Puppet or Jarwight Puppet',
      ],
    }),
    step(
      'starlight-shards',
      'Collect Starlight Shards until he sells puppets',
      {
        kind: 'item',
        lockedBy: [BLADE_GIVEN],
        unlocks: ['Seluvis’s puppet stock, paid in Starlight Shards'],
        flagTodo:
          'Pick up a third Starlight Shard after asking about his chambers, rest, and record what flips when his puppet stock appears',
      },
    ),
    step('buy-puppets', 'Buy both puppets he offers', {
      kind: 'action',
      done: talk(1034509345, 'second puppet bought'),
      evidence: 'observed',
      lockedBy: [BLADE_GIVEN],
      where: { note: SELUVIS_RISE },
      rewards: ['Finger Maiden Therolina Puppet', 'Jarwight Puppet'],
    }),
    step('scheme', 'Hear Seluvis’s scheme and agree to help', {
      kind: 'talk',
      done: talk(1034509333, 'agreed to his scheme'),
      evidence: 'observed',
      lockedBy: [BLADE_GIVEN],
      where: { note: SELUVIS_RISE },
    }),
    step('amber-starlight', 'Find the Amber Starlight', {
      kind: 'item',
      done: any(
        pickup(1040527000, 'Amber Starlight picked up'),
        has(8142, 'Amber Starlight'),
      ),
      evidence: 'observed',
      requires: [needsGate(GATES.altusGrace)],
      lockedBy: [BLADE_GIVEN],
      where: { note: 'Altus Plateau' },
    }),
    step('give-amber', 'Give Seluvis the Amber Starlight', {
      kind: 'talk',
      done: any(
        talk(1034509335, 'gave the Amber Starlight'),
        talk(1034509315, 'talk after the Amber Starlight'),
        stage('rewarded'),
      ),
      evidence: 'observed',
      lockedBy: [BLADE_GIVEN],
      where: { note: SELUVIS_RISE },
      rewards: ['Magic Scorpion Charm'],
    }),
    detour(
      'amber-draught',
      'Take the Amber Draught',
      {
        lockedBy: [BLADE_GIVEN],
        reward: 'Amber Draught (only good for betraying Ranni)',
      },
      [
        step(
          'receive-draught',
          'Rest, then take the Amber Draught from Seluvis',
          {
            kind: 'talk',
            done: pickup(400145, 'Amber Draught received'),
            evidence: 'observed',
            where: { note: SELUVIS_RISE },
            note: 'Giving it to Ranni turns her hostile (absolvable at the Church of Vows) and gets Seluvis killed.',
            rewards: ['Amber Draught'],
          },
        ),
      ],
    ),
  ],
);
