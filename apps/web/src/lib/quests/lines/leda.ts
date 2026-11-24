import { any, boss, flag, has, pickup, talk } from '../cond';
import { GATES } from '../gates';
import {
  choice,
  defineQuest,
  detour,
  lockedByDecision,
  lockedByGate,
  lockedWhen,
  needsGate,
  path,
  statusBlock,
  step,
} from '../model';

const COCOON_OF_THE_EMPYREAN = 71250;
const BELURAT = 72001;
const CASTLE_ENSIS_CHECKPOINT = 76821;
const HIGHROAD_CROSS = 76900;
const STOREHOUSE_FIRST_FLOOR = 72111;

// ── Shadow of the Erdtree world gates shared by this batch (dane, ansbach, freyja, hornsent) ──
// Candidates for `GATES` once another questline needs them.

/**
 * Needle Knight Leda (status block 4440). The Land of Shadow's central questline: her hunt for
 * "traitors" among Miquella's followers is what decides who you fight in Enir-Ilim.
 *
 * Stage machine (`common.evs.py` Event_4459): 4445 at the cocoon in Mohgwyn Palace → 4446 at
 * Highroad Cross, once 12059260 is on (set from 4926, which `m61_48_45_00` / `m61_46_40_00` turn
 * on when those map tiles load) → 4447 once she leaves Highroad Cross (2048459297: Ansbach dead,
 * her leaving talk, or Enir-Ilim) → 4448 in Enir-Ilim (20019256, set by Event_4843 after the
 * Miquella's Faithful fight). The stage moves come from exploration, so they're requirements,
 * not evidence.
 *
 * The Shadow Keep invasions (`m21_00_00_00` / `m21_01_00_00` constructors, CommonFunc_90005795
 * summon signs + CommonFunc_90005776 rewards): 7623 helped Leda kill Hornsent (Event_21000711
 * sets Hornsent's dead flag 4363; reward lot 116100, flag 400614), 7624 helped Hornsent repel
 * Leda (lot 105920, flag 400594), 7621 helped Leda kill Ansbach (Event_21010726 sets 4403; lot
 * 106210, flag 400622), 7622 helped Ansbach repel Leda (lot 105930, flag 400595). The Crossed-Tree
 * talismans (lots 105900 / 105910, flags 400590 / 400592) are gated on 7623 / 7621 in
 * `m61_48_45_00` Event_2048450708. Item-lot pickup flags are the lots' `getItemFlagId`
 * (ItemLotParam_map, read from regulation.bin). Miquella's Faithful = boss 20010850.
 */
export const leda = defineQuest(
  {
    id: 'leda',
    npc: 'Needle Knight Leda',
    isDlc: true,
    blurb:
      'Miquella’s knight, who leads his followers through the Land of Shadow and hunts the ones she calls traitors.',
    status: { ...statusBlock(4440), diesAfter: 'miquellas-faithful' },
    stages: {
      cocoon: 4445,
      highroad: 4446,
      departed: 4447,
      enirIlim: 4448,
    },
    sources: [
      'soulstruct common.evs.py Event_4459 (Leda stage machine), Event_4843 (Enir-Ilim roster)',
      'soulstruct m21_00_00_00 / m21_01_00_00 constructors (Shadow Keep invasion signs 7621–7624)',
      'soulstruct m61_48_45_00 (Highroad Cross: Leda, talismans, Message from Leda)',
      'regulation.bin ItemLotParam_map getItemFlagId (reward pickup flags)',
      'Paramdex NpcParam / ItemLotParam_map names (who is where, which lot is what)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Needle Knight Leda column (ordering)',
    ],
  },
  ({ stage }) => [
    step(
      'meet-cocoon',
      'Talk to Leda by the giant cocoon in Mohg’s palace, then touch the cocoon',
      {
        kind: 'talk',
        requires: [needsGate(GATES.mohg), needsGate(GATES.radahn)],
        where: { grace: COCOON_OF_THE_EMPYREAN },
        unlocks: ['The Land of Shadow (Shadow of the Erdtree)'],
        flagTodo:
          'talk to Leda at the Cocoon of the Empyrean (Mohg and Radahn dead); the flag that flips',
      },
    ),
    step('belurat-message', 'Read the message Leda left atop Belurat', {
      kind: 'action',
      requires: [needsGate(GATES.landOfShadow)],
      where: { grace: BELURAT },
      flagTodo:
        'read Leda’s message at the top of Belurat; the flag that flips, if any',
    }),
    step(
      'ensis-message',
      'Read her next message by Miquella’s Cross in Castle Ensis',
      {
        kind: 'action',
        where: { grace: CASTLE_ENSIS_CHECKPOINT },
        flagTodo:
          'read Leda’s message at Castle Ensis; the flag that flips, if any',
      },
    ),
    detour(
      'rellana-summon',
      'Fight Rellana alongside Leda',
      {
        lockedBy: [
          lockedWhen(
            boss(2048440800, 'Rellana, Twin Moon Knight'),
            'Defeat Rellana, Twin Moon Knight',
            'Rellana is already defeated',
          ),
        ],
        reward: 'Leda’s help against Rellana',
      },
      [
        step('rellana-summon-sign', 'Summon Leda to fight Rellana', {
          kind: 'boss',
          where: { note: 'Castle Ensis, before Rellana’s fog gate' },
        }),
      ],
    ),
    step('highroad', 'Talk to Leda at Highroad Cross', {
      kind: 'talk',
      where: { grace: HIGHROAD_CROSS },
      requires: [
        {
          cond: any(stage('highroad'), stage('departed'), stage('enirIlim')),
          label:
            'Leda has moved to Highroad Cross (reach the Highroad Cross area)',
        },
      ],
      flagTodo:
        'first conversation with Leda at Highroad Cross; the flag that flips',
    }),
    detour(
      'dane-lead',
      'Ask Leda about Dryleaf Dane',
      {
        lockedBy: [lockedByGate(GATES.miquellaCharmBroken)],
        reward: 'Leda’s lead on Dryleaf Dane',
      },
      [
        step(
          'dane-lead-talk',
          'Talk to Leda again to hear about Dryleaf Dane',
          {
            kind: 'talk',
            where: { grace: HIGHROAD_CROSS },
            flagTodo:
              'Leda’s Dryleaf Dane conversation at Highroad Cross; the flag that flips',
          },
        ),
      ],
    ),
    step(
      'name-suspect',
      'Once the charm breaks, talk to Leda again and name a suspect (Thiollier or Hornsent)',
      {
        kind: 'talk',
        requires: [needsGate(GATES.miquellaCharmBroken)],
        where: { grace: HIGHROAD_CROSS },
        note: 'Either answer ends the same way: she decides Hornsent is the threat.',
        flagTodo:
          'talk to Leda at Highroad Cross after the charm breaks and pick a suspect; the flag that flips',
      },
    ),
    detour(
      'hornsent-hunt',
      'Leda and Hornsent at the Storehouse elevator',
      {
        // The signs go once Messmer dies (`m21_00_00_00` Event_21000725 clears 2048459220).
        lockedBy: [lockedByGate(GATES.messmer)],
        reward:
          'Hornsent’s Falx and set (plus the Lacerating Crossed-Tree), or Ash of War: Swift Slash and Leda’s Rune',
      },
      [
        choice(
          'hornsent-side',
          'Two summon signs before the Storehouse elevator: whose side do you take?',
          [
            path('hunt-hornsent', 'Help Leda hunt Hornsent', [
              step(
                'hunt-hornsent-invasion',
                'Use Leda’s sign and defeat Hornsent with her',
                {
                  kind: 'boss',
                  done: flag(7623, 'boss', 'helped Leda defeat Hornsent'),
                  evidence: 'script',
                  where: { grace: STOREHOUSE_FIRST_FLOOR },
                  note: 'Hornsent dies for good.',
                  rewards: [
                    'Falx',
                    'Caterpillar Mask',
                    'Braided Cord Robe',
                    'Braided Arm Wraps',
                    'Soiled Loincloth',
                  ],
                },
              ),
              detour(
                'lacerating',
                'Leda’s thanks for Hornsent',
                { reward: 'Lacerating Crossed-Tree' },
                [
                  step(
                    'lacerating-talisman',
                    'Talk to Leda at Highroad Cross for the Lacerating Crossed-Tree',
                    {
                      kind: 'item',
                      done: pickup(400590, 'Lacerating Crossed-Tree'),
                      evidence: 'script',
                      rewards: ['Lacerating Crossed-Tree'],
                      where: { grace: HIGHROAD_CROSS },
                    },
                  ),
                ],
              ),
            ]),
            path('defend-hornsent', 'Help Hornsent fend off Leda', [
              step(
                'defend-hornsent-invasion',
                'Use Hornsent’s sign and drive Leda off',
                {
                  kind: 'boss',
                  done: any(
                    flag(7624, 'boss', 'helped Hornsent against Leda'),
                    pickup(400594, 'Swift Slash and Leda’s Rune'),
                  ),
                  evidence: 'script',
                  where: { grace: STOREHOUSE_FIRST_FLOOR },
                  note: 'Leda won’t ask for help against Ansbach afterwards.',
                  rewards: ['Ash of War: Swift Slash', "Leda's Rune"],
                },
              ),
            ]),
          ],
        ),
      ],
    ),
    detour(
      'ansbach-hunt',
      'Leda and Ansbach in the Specimen Storehouse',
      {
        lockedBy: [
          lockedByGate(GATES.sealingTreeBurned),
          lockedByDecision('leda', 'defend-hornsent'),
        ],
        reward:
          'Ansbach’s set and Longbow (plus the Retaliatory Crossed-Tree), or Ansbach’s Longbow and Leda’s Rune',
      },
      [
        step(
          'after-messmer-talk',
          'After Messmer falls, talk to Leda at Highroad Cross, rest, and talk again',
          {
            kind: 'talk',
            // 2048459266 starts her post-Messmer departure logic (Event_4459: → 2048459291, and
            // 2048459293 if Ansbach is still alive). Its exact dialogue is a guess.
            done: talk(2048459266, 'post-Messmer talk'),
            evidence: 'assumed',
            requires: [needsGate(GATES.messmer)],
            where: { grace: HIGHROAD_CROSS },
            reload: true,
          },
        ),
        choice(
          'ansbach-side',
          'Two summon signs near Ansbach in the Storehouse: whose side do you take?',
          [
            path('hunt-ansbach', 'Help Leda hunt Ansbach', [
              step(
                'hunt-ansbach-invasion',
                'Use Leda’s sign and defeat Ansbach with her',
                {
                  kind: 'boss',
                  done: any(
                    flag(7621, 'boss', 'helped Leda defeat Ansbach'),
                    pickup(400622, 'Ansbach’s set'),
                  ),
                  evidence: 'script',
                  where: { grace: STOREHOUSE_FIRST_FLOOR },
                  note: 'Ansbach dies for good.',
                  rewards: [
                    "Wise Man's Mask",
                    "Ansbach's Attire",
                    "Ansbach's Manchettes",
                    "Ansbach's Boots",
                    "Ansbach's Longbow",
                  ],
                },
              ),
              detour(
                'retaliatory',
                'Leda’s thanks for Ansbach',
                { reward: 'Retaliatory Crossed-Tree' },
                [
                  step(
                    'retaliatory-talisman',
                    'Talk to Leda at Highroad Cross for the Retaliatory Crossed-Tree',
                    {
                      kind: 'item',
                      done: pickup(400592, 'Retaliatory Crossed-Tree'),
                      evidence: 'script',
                      rewards: ['Retaliatory Crossed-Tree'],
                      where: { grace: HIGHROAD_CROSS },
                    },
                  ),
                ],
              ),
            ]),
            path('defend-ansbach', 'Help Ansbach fend off Leda', [
              step(
                'defend-ansbach-invasion',
                'Use Ansbach’s sign and drive Leda off',
                {
                  kind: 'boss',
                  done: any(
                    flag(7622, 'boss', 'helped Ansbach against Leda'),
                    pickup(400595, 'Ansbach’s Longbow and Leda’s Rune'),
                  ),
                  evidence: 'script',
                  where: { grace: STOREHOUSE_FIRST_FLOOR },
                  rewards: ["Ansbach's Longbow", "Leda's Rune"],
                },
              ),
            ]),
          ],
        ),
      ],
    ),
    step(
      'joined-an-invasion',
      'Have answered at least one of those summon signs (for Leda, Hornsent or Ansbach)',
      {
        kind: 'event',
        done: any(
          flag(7621, 'boss', 'helped Leda defeat Ansbach'),
          flag(7622, 'boss', 'helped Ansbach against Leda'),
          flag(7623, 'boss', 'helped Leda defeat Hornsent'),
          flag(7624, 'boss', 'helped Hornsent against Leda'),
        ),
        evidence: 'script',
        lockedBy: [lockedByGate(GATES.sealingTreeBurned)],
        note: 'Entering Enir-Ilim without taking any side fails Leda’s questline.',
      },
    ),
    detour(
      'leda-message',
      'The note Leda leaves behind',
      { reward: 'Message from Leda' },
      [
        step(
          'leda-message-pickup',
          'Once Messmer is dead and Leda has moved on, pick up her message',
          {
            kind: 'item',
            done: any(
              pickup(580600, 'Message from Leda picked up'),
              has(2008034, 'Message from Leda'),
            ),
            evidence: 'script',
            rewards: ['Message from Leda'],
            requires: [needsGate(GATES.messmer)],
            where: {
              grace: HIGHROAD_CROSS,
              note: 'At Highroad Cross (another copy lies at the Moorth Ruins)',
            },
          },
        ),
      ],
    ),
    step(
      'miquellas-faithful',
      'Defeat Leda and her allies, Miquella’s Faithful, in Enir-Ilim',
      {
        kind: 'boss',
        // Her own stage 4448 (Event_4843, after the fight), not the shared boss gate 20010850.
        done: stage('enirIlim'),
        evidence: 'script',
        requires: [needsGate(GATES.sealingTreeBurned)],
        where: { note: 'Enir-Ilim, on the climb to the Divine Gate' },
        rewards: ["Leda's Sword"],
        note: 'Whoever you didn’t side with (Dane, Freyja, Hornsent, Moore…) fights beside her.',
      },
    ),
    detour('leda-armor', 'Leda’s armor', { reward: 'Leda’s Armor' }, [
      step('leda-armor-pickup', 'Take Leda’s armor from where she fell', {
        kind: 'item',
        done: pickup(400598, 'Leda’s Armor'),
        evidence: 'script',
        rewards: ["Leda's Armor"],
        where: { note: 'Enir-Ilim, the Miquella’s Faithful arena' },
      }),
    ]),
  ],
);
