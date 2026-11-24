import { any, boss, flag, pickup, reached } from '../cond';
import { defineGate, GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByGate,
  lockedWhen,
  needsGate,
  step,
} from '../model';

const PILLAR_PATH_CROSS = 76810;
const GARDEN_OF_DEEP_PURPLE = 72200;
const STONE_COFFIN_FISSURE = 72201;
const CLEANSING_CHAMBER_ANTEROOM = 72015;

/** The Putrescent Knight, boss of the Stone Coffin Fissure (`m22_00_00_00`). */
const PUTRESCENT_KNIGHT = defineGate(
  'putrescent-knight',
  'Defeat the Putrescent Knight',
  boss(22000800, 'Putrescent Knight'),
);

/**
 * Thiollier (event-state block 4460) and St. Trina (block 4280).
 *
 * Thiollier's stage machine (`common.evs.py` Event_4479): 4465 at the Pillar Path Cross → 4466
 * beside St. Trina (2048439205) → 4467 after his invasion (`m22_00_00_00` Event_22000702: the
 * invader's defeat 22000496 sets 22009205; the same flag awards St. Trina's Smile, lot 106310,
 * pickup flag 400632, via CommonFunc_90005774) → 4468 in Enir-Ilim (20019305, set by Event_4843
 * from 4894) → 4469 once Radahn (20010800) is dead. With 20019306 on (assumed: you summoned him
 * against Miquella's Faithful) Event_4479 sets 22009232, which `m20_01_00_00` needs to place his
 * sign for Radahn; at 4469 his gear is laid out in Enir-Ilim (lot 106320, flag 400634).
 *
 * St. Trina (Event_4299): 4285 → 4286 on 22009275, which `m22_00_00_00` Event_22000717 sets when
 * you enter her cave after Radahn's defeat; 4286 lays out St. Trina's Blossom (lot 107400, flag
 * 400740). Thiollier's Concoction is lot 106300, flag 400630. Lot flags are ItemLotParam_map
 * `getItemFlagId`s (regulation.bin).
 */
export const thiollier = defineQuest(
  {
    id: 'thiollier',
    npc: 'Thiollier & St. Trina',
    isDlc: true,
    blurb:
      'A poisoner from the Pillar Path Cross searching the Land of Shadow for St. Trina.',
    stages: {
      pillarPath: 4465,
      withTrina: 4466,
      afterInvasion: 4467,
      enirIlim: 4468,
      afterRadahn: 4469,
    },
    sources: [
      'soulstruct common.evs.py Event_4479 (Thiollier stages), Event_4299 (St. Trina), Event_4843',
      'soulstruct m61_48_43_00 (Pillar Path Cross), m22_00_00_00 (Stone Coffin Fissure, invasion)',
      'soulstruct m20_01_00_00 (Enir-Ilim summon sign and gear)',
      'regulation.bin ItemLotParam_map getItemFlagId (reward pickup flags)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Thiollier & St. Trina column (ordering)',
      'Fextralife Thiollier page (step detail, reworded)',
    ],
  },
  ({ stage }) => {
    const leftPillarPath = any(
      stage('withTrina'),
      stage('afterInvasion'),
      stage('enirIlim'),
      stage('afterRadahn'),
    );
    return [
      step('meet', 'Meet Thiollier at the Pillar Path Cross', {
        kind: 'talk',
        unlocks: ['Thiollier’s shop'],
        where: { grace: PILLAR_PATH_CROSS },
        flagTodo:
          'talk to Thiollier at the Pillar Path Cross for the first time; the flag that flips',
      }),
      detour(
        'concoction',
        'Thiollier’s Concoction',
        {
          lockedBy: [
            lockedWhen(
              leftPillarPath,
              'Let Thiollier leave the Pillar Path Cross',
              'Thiollier has left the Pillar Path Cross',
            ),
          ],
          reward:
            'Thiollier’s Concoction (the Dragon Priestess’s other ending needs it)',
        },
        [
          step(
            'get-concoction',
            'Bring him Moore’s Black Syrup and say you’re weary of life: Thiollier’s Concoction',
            {
              kind: 'talk',
              done: pickup(400630, 'Thiollier’s Concoction received'),
              evidence: 'script',
              rewards: ["Thiollier's Concoction"],
              requires: [
                {
                  cond: reached('moore', 'black-syrup'),
                  label: 'Get the Black Syrup from Moore',
                },
              ],
              where: { grace: PILLAR_PATH_CROSS },
            },
          ),
        ],
      ),
      step(
        'after-charm',
        'Talk to him at the Pillar Path Cross once Miquella’s charm is broken',
        {
          kind: 'talk',
          requires: [needsGate(GATES.miquellaCharmBroken)],
          where: { grace: PILLAR_PATH_CROSS },
          flagTodo:
            'after the charm breaks, talk to Thiollier at the Pillar Path Cross; the flag that flips',
        },
      ),
      detour(
        'putrescent-help',
        'Thiollier against the Putrescent Knight',
        {
          lockedBy: [lockedByGate(PUTRESCENT_KNIGHT)],
          reward: 'Thiollier’s help against the Putrescent Knight',
        },
        [
          step('learn-search', 'Hear him out about his search for St. Trina', {
            kind: 'talk',
            requires: [
              {
                cond: any(
                  boss(21000850, 'Golden Hippopotamus'),
                  flag(72106, 'grace', 'Church District Entrance'),
                  flag(72204, 'grace', 'Fissure Depths'),
                ),
                label:
                  'Defeat the Golden Hippopotamus, enter the Shadow Keep’s Church District, or reach the Fissure Depths grace',
              },
            ],
            where: { grace: PILLAR_PATH_CROSS },
            flagTodo:
              'after one of the move-on triggers, talk to Thiollier before resting; the flag that flips',
          }),
          step(
            'summon-putrescent',
            'Summon him for the Putrescent Knight in the Stone Coffin Fissure',
            { kind: 'boss', where: { grace: STONE_COFFIN_FISSURE } },
          ),
        ],
      ),
      step(
        'find-trina',
        'Find St. Trina in the cave behind the Putrescent Knight’s arena',
        {
          kind: 'event',
          requires: [needsGate(PUTRESCENT_KNIGHT)],
          where: { grace: GARDEN_OF_DEEP_PURPLE },
          flagTodo:
            'walk into St. Trina’s cave for the first time and talk to her; the flag that flips',
        },
      ),
      detour(
        'tell-whereabouts',
        'Tell Thiollier where St. Trina is',
        { reward: 'Pointing Thiollier to St. Trina yourself' },
        [
          step(
            'tell-him',
            'If he hasn’t found her yet, tell Thiollier where St. Trina is',
            {
              kind: 'talk',
              where: { grace: PILLAR_PATH_CROSS },
              flagTodo:
                'pick “Tell him St. Trina’s whereabouts” at the Pillar Path Cross; the flag that flips',
            },
          ),
        ],
      ),
      step('with-trina', 'Speak to Thiollier beside St. Trina', {
        kind: 'talk',
        done: leftPillarPath,
        evidence: 'script',
        where: { grace: GARDEN_OF_DEEP_PURPLE },
        note: 'His move there is what’s saved, not the conversation.',
      }),
      step(
        'imbibe',
        'Talk to St. Trina and imbibe her nectar until you hear her voice',
        {
          kind: 'talk',
          where: { grace: GARDEN_OF_DEEP_PURPLE },
          note: 'Four sips are enough; six exhaust her dialogue.',
          flagTodo:
            'imbibe St. Trina’s nectar until her voice speaks; the flag that flips',
        },
      ),
      step('relay', 'Pass St. Trina’s words on to Thiollier, twice', {
        kind: 'talk',
        where: { grace: GARDEN_OF_DEEP_PURPLE },
        reload: true,
        flagTodo:
          'pick “Pass on St. Trina’s words” twice with Thiollier; the flag that flips',
      }),
      step(
        'invasion',
        'Rest, then defeat Thiollier’s invasion in the Garden of Deep Purple: St. Trina’s Smile',
        {
          kind: 'boss',
          done: any(
            pickup(400632, 'St. Trina’s Smile received'),
            stage('afterInvasion'),
            stage('enirIlim'),
            stage('afterRadahn'),
          ),
          evidence: 'script',
          rewards: ["St. Trina's Smile"],
          lockedBy: [
            // Leda's Miquella's Faithful fight: once it's over, Thiollier is gone from the cave.
            lockedWhen(
              reached('leda', 'miquellas-faithful'),
              GATES.miquellasFaithful.label,
              'Miquella’s Faithful fell before Thiollier’s invasion',
            ),
            lockedWhen(
              flag(4463, 'status', 'Thiollier is dead'),
              'Kill Thiollier',
              'Thiollier is dead',
            ),
          ],
          where: { grace: GARDEN_OF_DEEP_PURPLE },
        },
      ),
      step('talk-after', 'Speak to Thiollier in St. Trina’s room once more', {
        kind: 'talk',
        where: { grace: GARDEN_OF_DEEP_PURPLE },
        flagTodo:
          'after his invasion, talk to Thiollier in St. Trina’s room until he repeats; the flag that flips',
      }),
      detour(
        'enir-ilim-help',
        'Thiollier in Enir-Ilim',
        {
          reward:
            'Thiollier’s help in Enir-Ilim, then his Hidden Needle and garb',
        },
        [
          step(
            'summon-faithful',
            'Summon Thiollier against Miquella’s Faithful',
            {
              kind: 'boss',
              done: flag(
                20019306,
                'talk',
                'summoned him against Miquella’s Faithful',
              ),
              evidence: 'assumed',
              requires: [needsGate(GATES.sealingTreeBurned)],
              lockedBy: [lockedByGate(GATES.miquellasFaithful)],
              where: { grace: CLEANSING_CHAMBER_ANTEROOM },
            },
          ),
          step(
            'summon-radahn',
            'Summon him again for Promised Consort Radahn',
            {
              kind: 'boss',
              lockedBy: [lockedByGate(GATES.consortRadahn)],
              where: { note: 'Enir-Ilim, before the Divine Gate' },
            },
          ),
          step(
            'thiollier-gear',
            'Pick up Thiollier’s Hidden Needle and garb near Enir-Ilim’s entrance',
            {
              kind: 'item',
              done: pickup(
                400634,
                'Thiollier’s Hidden Needle and garb picked up',
              ),
              evidence: 'script',
              rewards: [
                "Thiollier's Hidden Needle",
                "Thiollier's Mask",
                "Thiollier's Garb",
                "Thiollier's Gloves",
                "Thiollier's Trousers",
              ],
              requires: [needsGate(GATES.consortRadahn)],
              where: { note: 'Enir-Ilim, near the entrance' },
            },
          ),
        ],
      ),
      step('blossom', 'Return to St. Trina after Radahn: St. Trina’s Blossom', {
        kind: 'item',
        done: pickup(400740, 'St. Trina’s Blossom picked up'),
        evidence: 'script',
        rewards: ["St. Trina's Blossom"],
        requires: [needsGate(GATES.consortRadahn)],
        where: { grace: GARDEN_OF_DEEP_PURPLE },
      }),
    ];
  },
);
