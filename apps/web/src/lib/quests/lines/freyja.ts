import { all, any, boss, has, not, pickup, reached, talk } from '../cond';
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

const THREE_PATH_CROSS = 76802;
const BELURAT = 72001;
const MAIN_GATE_PLAZA = 72101;
const STOREHOUSE_SEVENTH_FLOOR = 72113;

/**
 * Redmane Freyja (status block 4420), a Redmane knight who followed Radahn's memory into the
 * Land of Shadow.
 *
 * Stage machine (`common.evs.py` Event_4439): 4425 at Three-Path Cross → 4426 in the Specimen
 * Storehouse once 2046429378 is on (set when 4923, the player entering the Storehouse, meets
 * 2046429371 — a Three-Path Cross talk flag, presumably the post-charm conversation) → 4427 in
 * Enir-Ilim (21019375, Event_4843, only while her roster flag 4891 "fights for Leda" is on).
 * Dead flag 4423.
 *
 * Item-lot pickup flags (regulation.bin `getItemFlagId`): Golden Lion Shield 400600 (lot 106000,
 * her thanks for Ansbach's letter); her greatsword and set 400602 (lot 106010, on her body at
 * stage 4427 in `m20_01_00_00`, or in the Storehouse if she dies there).
 */
export const freyja = defineQuest(
  {
    id: 'freyja',
    npc: 'Redmane Freyja',
    isDlc: true,
    blurb:
      'A Redmane knight searching the Land of Shadow for a way to bring Radahn back.',
    status: { ...statusBlock(4420), diesAfter: 'miquellas-faithful' },
    stages: { threePath: 4425, storehouse: 4426, enirIlim: 4427 },
    sources: [
      'soulstruct common.evs.py Event_4439 (stage machine), Event_4623 (map flags), Event_4843 (Enir-Ilim)',
      'soulstruct m21_01_00_00 (Storehouse), m20_01_00_00 (Enir-Ilim body and items)',
      'regulation.bin ItemLotParam_map getItemFlagId (Golden Lion Shield, her set)',
      'Paramdex NpcParam names (Freyja at Three-Path Cross, Storehouse, Enir-Ilim; co-op summons)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Redmane Freyja column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Redmane Freyja at Three-Path Cross', {
      kind: 'talk',
      requires: [needsGate(GATES.landOfShadow)],
      where: { grace: THREE_PATH_CROSS },
      flagTodo:
        'first talk with Freyja at Three-Path Cross; the flag that flips',
    }),
    detour(
      'early-summons',
      'Fight beside Freyja before the charm breaks',
      {
        lockedBy: [lockedByGate(GATES.miquellaCharmBroken)],
        reward: 'Freyja’s help against the Dancing Lion and Rugalea',
      },
      [
        step(
          'lion-summon',
          'Summon her to fight the Divine Beast Dancing Lion',
          {
            kind: 'boss',
            lockedBy: [
              lockedWhen(
                boss(20000800, 'Divine Beast Dancing Lion (Belurat)'),
                'Defeat the Divine Beast Dancing Lion',
                'The Dancing Lion is already defeated',
              ),
            ],
            where: { grace: BELURAT },
          },
        ),
        step('three-path-talk', 'Talk to her again at Three-Path Cross', {
          kind: 'talk',
          where: { grace: THREE_PATH_CROSS },
          flagTodo:
            'second talk with Freyja at Three-Path Cross (after the Dancing Lion); the flag that flips',
        }),
        step(
          'rugalea-summon',
          'Summon her to fight Rugalea the Great Red Bear',
          {
            kind: 'boss',
            lockedBy: [
              lockedWhen(
                boss(2044470800, 'Rugalea the Great Red Bear'),
                'Defeat Rugalea the Great Red Bear',
                'Rugalea is already defeated',
              ),
            ],
            where: { note: 'Rauh Base' },
          },
        ),
      ],
    ),
    detour(
      'shadow-keep-summon',
      'Fight beside Freyja at the Shadow Keep',
      { reward: 'Freyja’s help against the Golden Hippopotamus' },
      [
        step(
          'after-charm',
          'Once Miquella’s charm breaks, talk to her at Three-Path Cross',
          {
            kind: 'talk',
            // Presumed from Event_4439: with "entered the Storehouse" (4923) it moves her there.
            done: talk(2046429371, 'post-charm talk'),
            evidence: 'assumed',
            requires: [needsGate(GATES.miquellaCharmBroken)],
            where: { grace: THREE_PATH_CROSS },
          },
        ),
        step(
          'hippopotamus-summon',
          'Summon her to fight the Golden Hippopotamus',
          {
            kind: 'boss',
            lockedBy: [
              lockedWhen(
                boss(21000850, 'Golden Hippopotamus'),
                'Defeat the Golden Hippopotamus',
                'The Golden Hippopotamus is already defeated',
              ),
            ],
            where: { grace: MAIN_GATE_PLAZA },
          },
        ),
      ],
    ),
    step(
      'storehouse-talk',
      'Talk to her on the Storehouse’s seventh floor and hear what she wants to ask Ansbach',
      {
        kind: 'talk',
        requires: [
          {
            cond: any(stage('storehouse'), stage('enirIlim')),
            label:
              'Freyja has moved to the Storehouse (enter the Specimen Storehouse)',
          },
        ],
        // The flowchart fails her questline if Ansbach gets the scroll before you hear her out.
        // Her talk leaves no known flag, so only the provable case locks: the letter exists while
        // she hasn't even reached the Storehouse yet.
        lockedBy: [
          lockedWhen(
            all(
              any(
                pickup(400620, 'Letter for Freyja received'),
                has(2008015, 'Letter for Freyja'),
              ),
              not(any(stage('storehouse'), stage('enirIlim'))),
            ),
            'Give Ansbach the Secret Rite Scroll before hearing Freyja out in the Storehouse',
            'Ansbach wrote the Letter for Freyja before you heard her out',
          ),
        ],
        where: { grace: STOREHOUSE_SEVENTH_FLOOR },
        flagTodo:
          'talk to Freyja on the Storehouse seventh floor (her question for Ansbach); the flag that flips',
      },
    ),
    step(
      'give-letter',
      'Bring her Ansbach’s Letter for Freyja: Golden Lion Shield',
      {
        kind: 'talk',
        done: pickup(400600, 'Golden Lion Shield'),
        evidence: 'script',
        rewards: ['Golden Lion Shield'],
        requires: [
          {
            cond: reached('ansbach', 'give-scroll'),
            label: 'Get the Letter for Freyja from Ansbach',
          },
        ],
        where: { grace: STOREHOUSE_SEVENTH_FLOOR },
      },
    ),
    step('miquellas-faithful', 'Face Freyja among Leda’s allies in Enir-Ilim', {
      kind: 'boss',
      done: stage('enirIlim'),
      evidence: 'script',
      requires: [needsGate(GATES.sealingTreeBurned)],
      where: { note: 'Enir-Ilim, the Miquella’s Faithful fight' },
    }),
    detour(
      'freyja-gear',
      'Freyja’s greatsword and armor',
      { reward: 'Freyja’s Greatsword and her armor set' },
      [
        step(
          'freyja-gear-pickup',
          'Take her greatsword and armor from where she fell',
          {
            kind: 'item',
            done: pickup(400602, 'Freyja’s greatsword and set'),
            evidence: 'script',
            where: { note: 'Enir-Ilim, the Miquella’s Faithful arena' },
            rewards: [
              "Freyja's Greatsword",
              "Freyja's Helm",
              "Freyja's Armor",
              "Freyja's Gauntlets",
              "Freyja's Greaves",
            ],
          },
        ),
      ],
    ),
  ],
);
