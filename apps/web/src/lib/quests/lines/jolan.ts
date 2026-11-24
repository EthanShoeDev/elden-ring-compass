import { Array as Arr } from 'effect';

import { any, boss, type Cond, flag, has, pickup, reached } from '../cond';
import { defineGate, GATES } from '../gates';
import {
  choice,
  defineQuest,
  detour,
  lockedByGate,
  lockedWhen,
  path,
  statusBlock,
  step,
} from '../model';

const CATHEDRAL_OF_MANUS_METYR = 76906;
const CERULEAN_COAST = 76831;
const HINTERLAND = 76935;

const IRIS_OF_GRACE = 2002120;
const IRIS_OF_OCCULTATION = 2002130;

/** A spirit ash at any upgrade level: each level is its own good (base id + level). */
const hasAsh = (baseId: number, name: string): Cond =>
  any(...Arr.makeBy(11, (level) => has(baseId + level, `${name} +${level}`)));

/** The Ghostflame Dragon on the Cerulean Coast (`m61_48_39_00`). */
const CERULEAN_GHOSTFLAME = defineGate(
  'cerulean-coast-ghostflame-dragon',
  'Defeat the Ghostflame Dragon on the Cerulean Coast',
  boss(2048380850, 'Ghostflame Dragon (Cerulean Coast)'),
);

/** The Tree Sentinel pair in the Hinterland (`m61_50_48_00`). */
const HINTERLAND_SENTINELS = defineGate(
  'hinterland-tree-sentinels',
  'Defeat the Tree Sentinels in the Hinterland',
  boss(2050480800, 'Tree Sentinels (Hinterland)'),
);

/**
 * Swordhand of Night Jolán (event-state block 4500), Ymir's guard at the Cathedral of Manus Metyr.
 *
 * Stage machine (`common.evs.py` Event_4519): 4505 leaning on her pillar → 4506 once Metyr is
 * dead and both sacred bells rang (25000800 ∧ 9440), which also sets her status to 4502
 * (permanently hostile): she invades before Ymir's boss fight. Because that hostility is part of
 * the story, there is no status-based lockout here.
 *
 * Iris choice (`m61_51_45_00` Event_2051450707 / 2051450708 hand-over, `common.evs.py`
 * Event_4932 / Event_4930): 2051459743 → 2051459747 awards lot 106700 (her spirit ash, pickup
 * flag 400670); 2051459744 → 2051459748 + 2051459742 lays the Sword of Night out for pickup (lot
 * 106710, flag 400671, CommonFunc_90005750). So 2051459743 is the Iris of Grace and 2051459744 the
 * Iris of Occultation. Jolán and Anna (goods 2220000+) are swapped in by talk, with no pickup
 * flag, so that step checks the inventory. Summon help (Cerulean Coast, Messmer, Hinterland)
 * leaves no flag; each closes with its boss.
 */
export const jolan = defineQuest(
  {
    id: 'jolan',
    npc: 'Swordhand of Night Jolán',
    isDlc: true,
    blurb:
      'Ymir’s silent swordhand, who fights at your side until she has to fight against you.',
    // Event_4519 makes her permanently hostile (4502) the moment Metyr dies: her invasion.
    status: { ...statusBlock(4500), diesAfter: 'metyr-dead' },
    stages: {
      pillar: 4505,
      metyrDead: 4506,
    },
    sources: [
      'soulstruct common.evs.py Event_4519 (stage machine), Event_4930 / Event_4932 (iris rewards)',
      'soulstruct m61_51_45_00 (Jolán at the cathedral, iris hand-over, Sword of Night pickup)',
      'regulation.bin ItemLotParam_map getItemFlagId (reward pickup flags)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Swordhand of Night Jolán column (ordering)',
      'Fextralife Swordhand of Night Jolán page (iris outcomes, reworded)',
    ],
  },
  () => [
    step(
      'meet',
      'Find Jolán leaning on a pillar in the Cathedral of Manus Metyr',
      {
        kind: 'talk',
        requires: [
          {
            cond: reached('ymir', 'first-bell'),
            label: 'Ring the first sacred bell for Count Ymir',
          },
        ],
        where: { grace: CATHEDRAL_OF_MANUS_METYR },
        reload: true,
        flagTodo:
          'after ringing Ymir’s first bell, reload the cathedral and talk to Jolán; the flag that flips',
      },
    ),
    detour(
      'help-ghostflame',
      'Jolán against the Cerulean Coast’s Ghostflame Dragon',
      {
        lockedBy: [lockedByGate(CERULEAN_GHOSTFLAME)],
        reward: 'Jolán’s help against the Ghostflame Dragon',
      },
      [
        step(
          'summon-ghostflame',
          'Summon Jolán for the Ghostflame Dragon on the Cerulean Coast',
          { kind: 'boss', where: { grace: CERULEAN_COAST } },
        ),
      ],
    ),
    detour(
      'help-messmer',
      'Jolán against Messmer',
      {
        lockedBy: [lockedByGate(GATES.messmer)],
        reward: 'Jolán’s help against Messmer',
      },
      [
        step('summon-messmer', 'Summon Jolán for Messmer the Impaler', {
          kind: 'boss',
          where: { note: 'Messmer’s Dark Chamber, Shadow Keep' },
          note: 'Summoning her there keeps you from summoning Hornsent for the same fight.',
        }),
      ],
    ),
    detour(
      'help-sentinels',
      'Jolán against the Hinterland’s Tree Sentinels',
      {
        lockedBy: [lockedByGate(HINTERLAND_SENTINELS)],
        reward: 'Jolán’s help against the Tree Sentinels',
      },
      [
        step(
          'summon-sentinels',
          'Summon Jolán for the two Tree Sentinels in the Hinterland',
          { kind: 'boss', where: { grace: HINTERLAND } },
        ),
      ],
    ),
    detour(
      'anna-talk',
      'Tell Jolán about Anna',
      {
        lockedBy: [
          lockedWhen(
            reached('ymir', 'metyr'),
            'Defeat Metyr, Mother of Fingers',
            'Metyr, Mother of Fingers is dead',
          ),
        ],
        reward: 'Jolán’s dialogue about her sister',
      },
      [
        step(
          'tell-anna',
          'After beating Anna’s invasion, speak to Jolán in the cathedral',
          {
            kind: 'talk',
            requires: [
              {
                cond: reached('ymir', 'anna'),
                label: 'Defeat Swordhand of Night Anna’s invasion',
              },
            ],
            where: { grace: CATHEDRAL_OF_MANUS_METYR },
            flagTodo:
              'talk to Jolán right after Anna’s invasion is beaten; the flag that flips',
          },
        ),
      ],
    ),
    step(
      'metyr-dead',
      'Defeat Metyr, Mother of Fingers for Ymir: Jolán turns on you',
      {
        kind: 'event',
        done: boss(25000800, 'Metyr, Mother of Fingers'),
        evidence: 'script',
        where: { note: 'Finger Birthing Grounds (Count Ymir’s questline)' },
      },
    ),
    step(
      'fight',
      'Defeat Jolán’s invasion at Ymir’s throne, then Count Ymir himself',
      {
        kind: 'boss',
        done: boss(2051450800, 'Count Ymir, Mother of Fingers (after Jolán)'),
        evidence: 'script',
        where: { grace: CATHEDRAL_OF_MANUS_METYR },
      },
    ),
    step('slumped', 'Rest, then speak to Jolán slumped against her pillar', {
      kind: 'talk',
      where: { grace: CATHEDRAL_OF_MANUS_METYR },
      reload: true,
      flagTodo:
        'after Ymir’s boss, rest and talk to the slumped Jolán before giving an iris; the flag that flips',
    }),
    choice('iris', 'Which iris do you give Jolán?', [
      path(
        'grace',
        'Give her the Iris of Grace',
        [
          step('give-grace', 'Give Jolán the Iris of Grace: her spirit ash', {
            kind: 'talk',
            done: any(
              flag(2051459743, 'talk', 'gave the Iris of Grace'),
              pickup(400670, 'Swordhand of Night Jolán ashes received'),
            ),
            evidence: 'script',
            rewards: ['Swordhand of Night Jolán'],
            requires: [
              {
                cond: has(IRIS_OF_GRACE, 'Iris of Grace'),
                label: 'Have an Iris of Grace (two in the Shadow Keep)',
              },
            ],
            where: { grace: CATHEDRAL_OF_MANUS_METYR },
          }),
          step(
            'jolan-and-anna',
            'Bring her ash to Anna’s puppet atop Rabbath’s Rise: Jolán and Anna',
            {
              kind: 'item',
              done: hasAsh(2220000, 'Jolán and Anna'),
              evidence: 'script',
              rewards: ['Jolán and Anna'],
              where: { note: 'Top of Rabbath’s Rise' },
            },
          ),
        ],
        { ending: 'Reunited with Anna' },
      ),
      path(
        'occultation',
        'Give her the Iris of Occultation',
        [
          step(
            'give-occultation',
            'Give Jolán the Iris of Occultation and take the Sword of Night',
            {
              kind: 'talk',
              done: any(
                flag(2051459744, 'talk', 'gave the Iris of Occultation'),
                pickup(400671, 'Sword of Night picked up'),
              ),
              evidence: 'script',
              rewards: ['Sword of Night'],
              requires: [
                {
                  cond: has(IRIS_OF_OCCULTATION, 'Iris of Occultation'),
                  label:
                    'Have an Iris of Occultation (Shadow Keep, Fort of Reprimand)',
                },
              ],
              where: { grace: CATHEDRAL_OF_MANUS_METYR },
            },
          ),
        ],
        { ending: 'The Sword of Night' },
      ),
    ]),
  ],
);
