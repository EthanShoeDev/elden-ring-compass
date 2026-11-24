import { all, any, boss, has, pickup, reached, talk } from '../cond';
import { defineGate, GATES } from '../gates';
import {
  choice,
  defineQuest,
  detour,
  lockedByGate,
  needsGate,
  path,
  statusBlock,
  step,
} from '../model';

const CHURCH_OF_THE_PLAGUE = 76418;
const ERDTREE_GAZING_HILL = 76302;
const WINDMILL_HEIGHTS = 76313;
const ANCIENT_SNOW_VALLEY_RUINS = 76503;
const PRAYER_ROOM = 71501;
const DRAINAGE_CHANNEL = 71503;

// Optional bosses on her route. Each can be fought with her summon sign only while she is at that
// stage, so beating one without her closes that side fight for good.
const windmillApostle = defineGate(
  'windmill-godskin-apostle',
  'Defeat the Godskin Apostle at Windmill Village',
  boss(1042550800, 'Godskin Apostle (Windmill Village)'),
);
const treeSentinel = defineGate(
  'draconic-tree-sentinel',
  'Defeat the Draconic Tree Sentinel in the Capital Outskirts',
  boss(1045520800, 'Draconic Tree Sentinel'),
);
const forbiddenKindred = defineGate(
  'black-blade-kindred-forbidden-lands',
  'Defeat the Black Blade Kindred in the Forbidden Lands',
  boss(1049520800, 'Black Blade Kindred (Forbidden Lands)'),
);
/** The Ulcerated Tree Spirit in Elphael (enemy kill flag, `m15_00_00_00` CommonFunc_90005300). */
const haligtreeSpirit = defineGate(
  'haligtree-tree-spirit',
  'Slay the Ulcerated Tree Spirit near the Drainage Channel',
  boss(15000398, 'Ulcerated Tree Spirit (Elphael)'),
);

/**
 * Millicent (status block 4180–4183, stage machine 4185–4197; no eventparam talk block, so the
 * names come from the script and the community log). Shares Gowry's `m60_50_38` talk block.
 *
 * Stage machine (`common.evs.py` `Event_4199`): 4185 initial → 4186 on 1050389255 "took the
 * needle" → 4187 on 1050389257 (she leaves the church) → 4188 on (1042550800 Windmill Godskin
 * Apostle dead ∧ 1038519257 "gave her the prosthesis") → 4189 on 1042559205 "talked at Windmill
 * Heights" → 4190 on 1051569256 "talked at Ancient Snow Valley Ruins" → 4193 "both summon signs
 * out" on (15009206 "talked at the Prayer Room" ∧ 15000398 tree spirit dead ∧ (Gowry's 1050389227
 * ∨ 15009213 "walked near the Drainage Channel")) → 4191 on 7610 "beat her sisters with her" →
 * 4192 on 15009211 "her farewell"; or → 4194 on 7611 "defeated her for her sisters".
 *
 * The side fights (Makar, the Godskin Apostle, the Draconic Tree Sentinel, the Black Blade
 * Kindred) leave no flag we know of: they're detours with `flagTodo`, closed by the boss dying.
 */
export const millicent = defineQuest(
  {
    id: 'millicent',
    npc: 'Millicent',
    isDlc: false,
    blurb:
      'A girl rotting from scarlet rot in a Caelid church who, once healed, follows Malenia’s footsteps to the Haligtree.',
    status: statusBlock(4180),
    stages: {
      initial: 4185,
      healed: 4186,
      leftChurch: 4187,
      windmill: 4188,
      snowValley: 4189,
      haligtree: 4190,
      signs: 4193,
      aided: 4191,
      farewell: 4192,
      defeated: 4194,
    },
    sources: [
      'soulstruct common.evs.py Event_4199 (stage transitions), Event_4179 (Gowry reacting)',
      'soulstruct m15_00_00_00.evs.py Event_15000715 (15009213), CommonFunc_90005300 (15000398)',
      'er-save-manager quest_flags_db.py "Millicent" (observed talk/pickup flags)',
      'NPC Quests & Endings Guide v5 flowchart, Millicent column (ordering, missable fights)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Find Millicent at the Church of the Plague', {
      kind: 'talk',
      done: any(
        talk(1050389256, 'offered her the needle'),
        talk(1050389252, 'heard her in pain'),
      ),
      evidence: 'observed',
      where: { grace: CHURCH_OF_THE_PLAGUE },
    }),
    step('give-needle', 'Give her the mended Unalloyed Gold Needle', {
      kind: 'item',
      done: any(talk(1050389255, 'took the needle'), stage('healed')),
      evidence: 'script',
      requires: [
        {
          cond: reached('gowry', 'repaired'),
          label: 'Get the mended needle from Gowry',
        },
      ],
      where: { grace: CHURCH_OF_THE_PLAGUE },
      reload: true,
      rewards: ['Prosthesis-Wearer Heirloom'],
      note: 'Keep talking to her after she recovers to receive her gift.',
    }),
    step('shack', 'Rest, then find her at Gowry’s Shack', {
      kind: 'talk',
      done: talk(1050389266, 'talked at the shack'),
      evidence: 'observed',
      where: { grace: CHURCH_OF_THE_PLAGUE, note: 'Gowry’s Shack' },
      reload: true,
    }),
    detour(
      'makar',
      'Fight Magma Wyrm Makar with her',
      {
        lockedBy: [lockedByGate(GATES.magmaWyrmMakar)],
        reward: 'Millicent as a summon against Magma Wyrm Makar',
      },
      [
        step('makar-summon', 'Summon her at Magma Wyrm Makar', {
          kind: 'boss',
          unlocks: ['Millicent as a summon against Magma Wyrm Makar'],
          flagTodo:
            'Summon Millicent at the Ruin-Strewn Precipice fog gate and beat Makar with her; record what flips',
          where: { note: 'Ruin-Strewn Precipice' },
        }),
      ],
    ),
    step('erdtree-gazing', 'Talk to her at Erdtree-Gazing Hill', {
      kind: 'talk',
      done: talk(1038519256, 'talked at Erdtree-Gazing Hill'),
      evidence: 'observed',
      requires: [needsGate(GATES.altusGrace)],
      where: { grace: ERDTREE_GAZING_HILL },
    }),
    step('prosthesis', 'Find the Valkyrie’s Prosthesis in the Shaded Castle', {
      kind: 'item',
      // The prosthesis can be looted before ever meeting her: only count it once she has asked.
      done: all(
        any(
          pickup(1039547300, 'Valkyrie’s Prosthesis picked up'),
          has(8977, 'Valkyrie’s Prosthesis'),
        ),
        talk(1038519256, 'talked at Erdtree-Gazing Hill'),
      ),
      evidence: 'observed',
      where: { note: 'The Shaded Castle, Altus Plateau' },
    }),
    step('give-prosthesis', 'Give her the Valkyrie’s Prosthesis', {
      kind: 'item',
      done: talk(1038519257, 'gave her the prosthesis'),
      evidence: 'script',
      where: { grace: ERDTREE_GAZING_HILL },
    }),
    detour(
      'windmill-apostle',
      'Fight the Godskin Apostle with her',
      {
        lockedBy: [lockedByGate(windmillApostle)],
        reward: 'Millicent as a summon against the Godskin Apostle',
      },
      [
        step('apostle-summon', 'Summon her against the Godskin Apostle', {
          kind: 'boss',
          unlocks: ['Millicent as a summon against the Godskin Apostle'],
          flagTodo:
            'Summon Millicent at Dominula, Windmill Village (log candidate 1042552160 "her sign used"; check it survives a reload)',
          where: { note: 'Dominula, Windmill Village' },
        }),
      ],
    ),
    step(
      'windmill',
      'After the Godskin Apostle falls, talk to her at Windmill Heights',
      {
        kind: 'talk',
        done: talk(1042559205, 'talked at Windmill Heights'),
        evidence: 'script',
        requires: [needsGate(windmillApostle)],
        where: { grace: WINDMILL_HEIGHTS },
        reload: true,
      },
    ),
    detour(
      'tree-sentinel',
      'Fight the Draconic Tree Sentinel with her',
      {
        lockedBy: [lockedByGate(treeSentinel)],
        reward: 'Millicent as a summon against the Draconic Tree Sentinel',
      },
      [
        step(
          'sentinel-summon',
          'Summon her against the Draconic Tree Sentinel',
          {
            kind: 'boss',
            unlocks: [
              'Millicent as a summon against the Draconic Tree Sentinel',
            ],
            flagTodo:
              'Summon Millicent at the Draconic Tree Sentinel in the Capital Outskirts; record what flips and survives a reload',
            where: { note: 'Capital Outskirts' },
          },
        ),
      ],
    ),
    detour(
      'black-blade-kindred',
      'Fight the Black Blade Kindred with her',
      {
        lockedBy: [lockedByGate(forbiddenKindred)],
        reward: 'Millicent as a summon against the Black Blade Kindred',
      },
      [
        step('kindred-summon', 'Summon her against the Black Blade Kindred', {
          kind: 'boss',
          unlocks: ['Millicent as a summon against the Black Blade Kindred'],
          flagTodo:
            'Summon Millicent before the Grand Lift of Rold (log candidate 1049522160 "her sign used"; check it survives a reload)',
          where: { note: 'Forbidden Lands, before the Grand Lift of Rold' },
        }),
      ],
    ),
    step('snow-valley', 'Talk to her at the Ancient Snow Valley Ruins', {
      kind: 'talk',
      done: any(
        talk(1051569256, 'talked again at the Snow Valley'),
        talk(1051569255, 'first talk at the Snow Valley'),
      ),
      evidence: 'script',
      requires: [needsGate(GATES.mountaintopsGrace)],
      where: { grace: ANCIENT_SNOW_VALLEY_RUINS },
      reload: true,
    }),
    step('prayer-room', 'Talk to her by the Prayer Room in Elphael', {
      kind: 'talk',
      done: any(
        talk(15009206, 'talked again at the Prayer Room'),
        talk(15009205, 'first talk at the Prayer Room'),
      ),
      evidence: 'script',
      where: { grace: PRAYER_ROOM },
      note: 'The Haligtree is reached with both halves of the Haligtree Secret Medallion.',
    }),
    step(
      'signs',
      'Clear the way to the Drainage Channel: her two summon signs appear',
      {
        kind: 'event',
        done: any(
          stage('signs'),
          stage('aided'),
          stage('farewell'),
          stage('defeated'),
        ),
        evidence: 'script',
        requires: [needsGate(haligtreeSpirit)],
        where: { grace: DRAINAGE_CHANNEL },
      },
    ),
    choice('fate', 'Aid Millicent, or answer her sisters’ call', [
      path(
        'assist',
        'Aid her against her sisters',
        [
          step(
            'assist-fight',
            'Use her gold sign and beat her sisters with her',
            {
              kind: 'boss',
              done: any(stage('aided'), stage('farewell')),
              evidence: 'script',
              where: { grace: DRAINAGE_CHANNEL },
              rewards: ['Rotten Winged Sword Insignia'],
            },
          ),
          step('goodbye', 'Talk to her until she says goodbye, then rest', {
            kind: 'talk',
            done: any(talk(15009211, 'said goodbye'), stage('farewell')),
            evidence: 'script',
            where: { grace: DRAINAGE_CHANNEL },
            reload: true,
          }),
          step('her-needle', 'Take the Unalloyed Gold Needle from her body', {
            kind: 'item',
            done: any(
              pickup(400321, 'needle taken from her body'),
              has(8196, 'Unalloyed Gold Needle (Millicent’s)'),
            ),
            evidence: 'observed',
            where: { grace: DRAINAGE_CHANNEL },
            rewards: ['Unalloyed Gold Needle'],
          }),
          detour(
            'miquellas-needle',
            'Return the needle to Malenia’s flower',
            {
              reward:
                'Miquella’s Needle and a Somber Ancient Dragon Smithing Stone',
            },
            [
              step(
                'restore-needle',
                'After Malenia falls, offer the needle at the scarlet flower in her arena',
                {
                  kind: 'item',
                  done: any(
                    pickup(400324, 'Miquella’s Needle received'),
                    has(2190, 'Miquella’s Needle'),
                  ),
                  evidence: 'observed',
                  requires: [needsGate(GATES.malenia)],
                  where: { note: 'Malenia’s arena, Haligtree Roots' },
                  rewards: [
                    "Miquella's Needle",
                    'Somber Ancient Dragon Smithing Stone',
                  ],
                  note: 'Miquella’s Needle can undo the Frenzied Flame at Dragonlord Placidusax’s arena.',
                },
              ),
            ],
          ),
        ],
        { ending: 'Millicent faced her destiny on her own terms' },
      ),
      path(
        'challenge',
        'Use her red sign and defeat her',
        [
          step('defeat', 'Invade her world and defeat her', {
            kind: 'boss',
            done: any(
              stage('defeated'),
              pickup(400323, 'Millicent’s Prosthesis received'),
            ),
            evidence: 'script',
            where: { grace: DRAINAGE_CHANNEL },
            rewards: ["Millicent's Prosthesis"],
          }),
        ],
        { ending: 'You struck Millicent down for her sisters' },
      ),
    ]),
  ],
);
