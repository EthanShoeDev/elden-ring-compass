import { all, any, boss, flag, has, not, pickup, reached } from '../cond';
import { defineGate } from '../gates';
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

const PILLAR_PATH_WAYPOINT = 76811;
const GRAND_ALTAR = 76840;
const FOOT_OF_THE_JAGGED_PEAK = 76850;
const JAGGED_PEAK_SUMMIT = 76852;

/** Bayle the Dread (`m61_54_39_00`). Beating him before Igon is ready fails both questlines. */
const BAYLE = defineGate(
  'bayle',
  'Defeat Bayle the Dread',
  boss(2054390800, 'Bayle the Dread'),
);

/** The Jagged Peak Drake pair (`m61_52_40_00`); their death moves Igon up the mountain. */
const JAGGED_PEAK_DRAKES = defineGate(
  'jagged-peak-drakes',
  'Defeat the Jagged Peak Drake pair',
  boss(2052400800, 'Jagged Peak Drakes'),
);

/** Set by Event_4279 when Bayle dies before 2052409209 (Igon ready). Lays out his second gear set. */
const BAYLE_TOO_EARLY = flag(
  2052409212,
  'world',
  'Bayle died before Igon was ready',
);

/**
 * Knight Igon (status block 4260) and the Dragon Communion Priestess (block 4300) of the Grand
 * Altar of Dragon Communion. One flowchart column, so one questline.
 *
 * Igon's stage machine (`common.evs.py` Event_4279): 4265 at the Pillar Path Waypoint → 4267 once
 * the Jagged Peak Drakes die (2052400800 → 2048429205) → 4268 once Bayle dies (2054390800 →
 * 2052409205). Both moves are world-driven, so they're requirements, not evidence. On Bayle's
 * death it sets 2052409211 if 2052409209 (Igon ready at the canyon, assumed set by his talk) was
 * on, else 2052409212; `m61_52_40_00` CommonFunc_90005750 then lays out lot 107110 (his Great
 * Hunt greatbow, armor, bell bearing; flag 400712) or lot 107120 (the plain set; flag 400714).
 * Igon's Furled Finger is lot 107100, flag 400710.
 *
 * Priestess (`common.evs.py` Event_4319 / 4841 / 4842 / 4858): 2049399728 starts a day/night
 * watch (assumed: the Concoction was given); Event_4858 awards Ancient Dragon Florissax (lot
 * 107010, flag 400700) on 2049399743. Dragonbolt of Florissax is lot 107020 (400702); the
 * Priestess Heart + Flowerstone Gavel lot 107030 (400704). All lot flags are ItemLotParam_map
 * `getItemFlagId`s read from regulation.bin.
 */
export const igon = defineQuest(
  {
    id: 'igon',
    npc: 'Knight Igon & the Dragon Priestess',
    isDlc: true,
    blurb:
      'A dragon-hunting knight sworn to kill Bayle, and the priestess of the Grand Altar who blesses the dragon-communing.',
    status: statusBlock(4260),
    stages: {
      waypoint: 4265,
      jaggedPeak: 4267,
      bayleDead: 4268,
    },
    sources: [
      'soulstruct common.evs.py Event_4279 (Igon stages), Event_4319 / 4841 / 4842 / 4858 (Priestess)',
      'soulstruct m61_48_42_00 / m61_52_40_00 / m61_54_39_00 (Igon, his gear, Bayle)',
      'regulation.bin ItemLotParam_map getItemFlagId (reward pickup flags)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Knight Igon & Dragon Priestess column (ordering)',
    ],
  },
  () => [
    step('meet-igon', 'Meet Igon near the Pillar Path Waypoint', {
      kind: 'talk',
      lockedBy: [lockedByGate(BAYLE)],
      where: { grace: PILLAR_PATH_WAYPOINT },
      flagTodo:
        'talk to Igon by the Pillar Path Waypoint for the first time; the flag that flips',
    }),
    step(
      'meet-priestess',
      'Reach the Jagged Peak and meet the Priestess at the Grand Altar of Dragon Communion',
      {
        kind: 'talk',
        requires: [
          {
            cond: flag(
              FOOT_OF_THE_JAGGED_PEAK,
              'grace',
              'Foot of the Jagged Peak',
            ),
            label: 'Reach the Jagged Peak',
          },
        ],
        lockedBy: [lockedByGate(BAYLE)],
        where: { grace: GRAND_ALTAR },
        flagTodo:
          'talk to the Dragon Communion Priestess for the first time; the flag that flips',
      },
    ),
    step('blessing', 'Accept the Ancient Dragon’s Blessing from her', {
      kind: 'talk',
      done: has(2002100, 'Ancient Dragon’s Blessing'),
      evidence: 'assumed',
      rewards: ["Ancient Dragon's Blessing"],
      lockedBy: [lockedByGate(BAYLE)],
      where: { grace: GRAND_ALTAR },
      note: 'Checked by owning the blessing; it may not count once it’s been used.',
    }),
    detour(
      'concoction',
      'Put the Priestess to sleep',
      {
        lockedBy: [lockedByGate(BAYLE)],
        reward:
          'The Priestess’s other ending: Dragonbolt of Florissax and Ancient Dragon Florissax',
      },
      [
        step('give-concoction', 'Give her Thiollier’s Concoction at night', {
          kind: 'talk',
          done: flag(2049399728, 'talk', 'gave her the Concoction'),
          evidence: 'assumed',
          requires: [
            {
              cond: any(
                has(2002140, 'Thiollier’s Concoction'),
                reached('thiollier', 'get-concoction'),
              ),
              label: 'Get Thiollier’s Concoction from Thiollier',
            },
          ],
          where: { grace: GRAND_ALTAR },
        }),
      ],
    ),
    step(
      'igon-yells',
      'Defeat the Jagged Peak Drake pair; Igon calls out to you',
      {
        kind: 'event',
        requires: [needsGate(JAGGED_PEAK_DRAKES)],
        lockedBy: [lockedByGate(BAYLE)],
        where: { grace: FOOT_OF_THE_JAGGED_PEAK },
        note: 'Leaves no saved trace. Confirmed by the next steps.',
      },
    ),
    step(
      'furled-finger',
      'Speak to Igon at the nearby canyon mouth: Igon’s Furled Finger',
      {
        kind: 'talk',
        done: pickup(400710, 'Igon’s Furled Finger received'),
        evidence: 'script',
        rewards: ["Igon's Furled Finger"],
        unlocks: ['Igon’s summon sign for Bayle the Dread'],
        lockedBy: [lockedByGate(BAYLE)],
        where: { grace: FOOT_OF_THE_JAGGED_PEAK },
      },
    ),
    step('summon-igon', 'Summon Igon to help you defeat Bayle the Dread', {
      kind: 'boss',
      where: { grace: JAGGED_PEAK_SUMMIT },
      note: 'Leaves no saved trace. Confirmed by the next steps.',
    }),
    step('igon-gear', 'Collect Igon’s gear where he stood on the Jagged Peak', {
      kind: 'item',
      done: pickup(400712, 'Igon’s Great Hunt gear picked up'),
      evidence: 'script',
      rewards: [
        "Igon's Greatbow",
        "Igon's Helm",
        "Igon's Armor",
        "Igon's Gauntlets",
        "Igon's Loincloth",
        "Igon's Bell Bearing",
      ],
      requires: [needsGate(BAYLE)],
      lockedBy: [
        lockedWhen(
          BAYLE_TOO_EARLY,
          'Defeat Bayle before Igon is ready at the canyon',
          'Bayle died before Igon was ready',
        ),
      ],
      where: { grace: FOOT_OF_THE_JAGGED_PEAK },
      note: 'Igon’s questline ends here.',
    }),
    step('return-altar', 'Return to the Grand Altar of Dragon Communion', {
      kind: 'event',
      lockedBy: [
        lockedWhen(
          BAYLE_TOO_EARLY,
          'Defeat Bayle before Igon is ready at the canyon',
          'Bayle died before Igon was ready',
        ),
      ],
      where: { grace: GRAND_ALTAR },
      note: 'Leaves no saved trace. Confirmed by the next steps.',
    }),
    choice('priestess', 'How does the Priestess end?', [
      path(
        'left-alone',
        'You left her be',
        [
          step(
            'priestess-heart',
            'Collect the Priestess Heart and Flowerstone Gavel at the altar',
            {
              kind: 'item',
              done: pickup(
                400704,
                'Priestess Heart and Flowerstone Gavel picked up',
              ),
              evidence: 'script',
              rewards: ['Priestess Heart', 'Flowerstone Gavel'],
              lockedBy: [
                lockedWhen(
                  reached('igon', 'give-concoction'),
                  'Give her Thiollier’s Concoction',
                  'You gave her Thiollier’s Concoction',
                ),
              ],
              where: { grace: GRAND_ALTAR },
            },
          ),
        ],
        { ending: 'The Priestess Heart' },
      ),
      path(
        'asleep',
        'You gave her Thiollier’s Concoction',
        [
          step('dragonbolt', 'Speak to her: the Dragonbolt of Florissax', {
            kind: 'talk',
            done: pickup(400702, 'Dragonbolt of Florissax received'),
            evidence: 'script',
            rewards: ['Dragonbolt of Florissax'],
            requires: [
              {
                cond: reached('igon', 'give-concoction'),
                label: 'Give her Thiollier’s Concoction before Bayle dies',
              },
            ],
            lockedBy: [
              lockedWhen(
                all(BAYLE.cond, not(reached('igon', 'give-concoction'))),
                'Defeat Bayle without giving her the Concoction',
                'Bayle died before she was given the Concoction',
              ),
            ],
            where: { grace: GRAND_ALTAR },
          }),
          step(
            'florissax',
            'Admit you put her to sleep: Ancient Dragon Florissax',
            {
              kind: 'talk',
              done: pickup(400700, 'Ancient Dragon Florissax ashes received'),
              evidence: 'script',
              rewards: ['Ancient Dragon Florissax'],
              where: { grace: GRAND_ALTAR },
            },
          ),
        ],
        { ending: 'Ancient Dragon Florissax' },
      ),
    ]),
  ],
);
