import { any, flag, has, pickup, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  choice,
  defineQuest,
  detour,
  lockedWhen,
  needsGate,
  path,
  statusBlock,
  step,
} from '../model';

const WAYPOINT_RUINS_CELLAR = 76120;
const SELLIA_HIDEAWAY = 73111;
const RANNIS_RISE = 76228;
const GRAND_LIBRARY = 71400;

/**
 * Sorceress Sellen (talk block NPC316 `学院の女魔術師`; status 3460, stages 3465–3469).
 *
 * Stage machine (`common.evs.py` `Event_3479`): 3465 initial → 3466 `原輝石からの復活` once Jerren
 * reaches his Witchbane stage (3369, itself on 1044369231 "primal glintstone obtained") → 3467
 * `平原砦の城主と戦っている` on 1034509256 (glintstone placed in the puppet) ∧ Rennala defeated
 * (9118) → 3468 `学院に戻った` on Jerren dead (3363) ∨ 7609 (`NPC疑似マルチクリア 平原砦の領主`:
 * Jerren beaten as her summon) → 3469 `魔術玉になった` on 14009266 (Glintstone Kris talk) ∧ a Lusat
 * sorcery talk (1044369228 ∨ 14009263). 7608 (`NPC疑似マルチクリア 学院の女魔術師`: she was beaten
 * as Jerren's summon) marks her dead.
 *
 * Talk flags are the named `会話用フラグ` of the Waypoint Ruins block (1044369200+, e.g. 1044369209
 * `弟子入り済`, 1044369231 `原輝石入手済`) and the Academy block (14009255 `挨拶_学院１済`). The
 * puppet-room (1034509250+) and Academy reward flags are unnamed; their ids come from the community
 * flag log, confirmed where the stage machine reads them.
 *
 * The Jerren-vs-Sellen summon-sign fork is mirrored in `jerren.ts` (which locks on this one).
 */
export const sellen = defineQuest(
  {
    id: 'sellen',
    npc: 'Sorceress Sellen',
    isDlc: false,
    blurb:
      'An exiled sorceress in a Limgrave cellar who wants the primeval current restored, and a body to escape her own.',
    status: statusBlock(3460),
    stages: {
      initial: 3465,
      glintstone: 3466,
      awaitingJerren: 3467,
      academy: 3468,
      transformed: 3469,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC316 + Talk_Common (status/stage/talk flag names; the block’s 3260 status ids are a template slip, 3460 per Talk_Common)',
      'soulstruct common.evs.py Event_3479 (stage transitions), Event_3379 (Jerren’s side)',
      'er-save-manager quest_flags_db.py "Sorceress Sellen" (observed talk/pickup flags)',
      'NPC Quests & Endings Guide v5 flowchart, Sellen column (ordering, fork)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Sellen in the Waypoint Ruins cellar', {
      kind: 'talk',
      done: talk(1044369206, 'first greeting played'),
      evidence: 'script',
      where: { grace: WAYPOINT_RUINS_CELLAR },
    }),
    step('apprentice', 'Ask to learn sorcery and become her apprentice', {
      kind: 'talk',
      // Not the Nod In Thought gesture she teaches: a fixture save holds it without her flags.
      done: talk(1044369209, 'became her apprentice'),
      evidence: 'script',
      rewards: ['Nod In Thought'],
      unlocks: [
        'Sellen’s sorcery shop (more stock for Royal House, Academy and Conspectus scrolls)',
      ],
      where: { grace: WAYPOINT_RUINS_CELLAR },
    }),
    detour(
      'seluvis-letter',
      'Show Sellen the letter of introduction from Seluvis',
      {
        lockedBy: [
          lockedWhen(
            talk(1034509256, 'her glintstone is in the puppet'),
            'Move Sellen into her new body',
            'Sellen moved into her new body',
          ),
        ],
        reward: 'Her talk about Radahn’s power, and Seluvis’s errand',
      },
      [
        step('show-letter', 'Show her Seluvis’s letter and hear about Radahn', {
          kind: 'talk',
          done: talk(1044369223, 'letter shown'),
          evidence: 'script',
          requires: [
            {
              cond: reached('seluvis', 'ask-nokron'),
              label: 'Ask Seluvis about Nokron and take his Introduction',
            },
          ],
          where: { grace: WAYPOINT_RUINS_CELLAR },
        }),
      ],
    ),
    step(
      'show-azur',
      'Learn Comet Azur from Azur on Mt. Gelmir, then show it to Sellen',
      {
        kind: 'talk',
        done: talk(1044369224, '“about Azur’s sorcery” played'),
        evidence: 'script',
        // Comet Azur is obtainable without Sellen, so it gates this step rather than proving one.
        requires: [
          {
            cond: any(
              pickup(400440, 'Comet Azur received'),
              has(4200, 'Comet Azur'),
            ),
            label:
              'Find Primeval Sorcerer Azur on Mt. Gelmir and take Comet Azur',
          },
        ],
        where: {
          grace: WAYPOINT_RUINS_CELLAR,
          note: 'Azur sits by the Primeval Sorcerer Azur grace on Mt. Gelmir',
        },
      },
    ),
    step('her-story', 'Hear her story', {
      kind: 'talk',
      done: any(
        talk(1044369226, '“let me think about it”'),
        talk(1044369225, '“walk with you”'),
      ),
      evidence: 'script',
    }),
    step('restore-current', 'Promise to help restore the primeval current', {
      kind: 'talk',
      done: talk(1044369229, 'agreed to help'),
      evidence: 'script',
    }),
    step(
      'sealbreaker',
      'Ask about her favor and take the Sellian Sealbreaker',
      {
        kind: 'talk',
        done: any(
          talk(1044369227, '“about Lusat ①” played'),
          has(8169, 'Sellian Sealbreaker'),
        ),
        evidence: 'script',
        rewards: ['Sellian Sealbreaker'],
      },
    ),
    step('free-lusat', 'Unseal Master Lusat in the Sellia Hideaway', {
      kind: 'item',
      done: any(
        pickup(400430, 'Stars of Ruin received'),
        has(4220, 'Stars of Ruin'),
      ),
      evidence: 'observed',
      rewards: ['Stars of Ruin'],
      where: { grace: SELLIA_HIDEAWAY },
    }),
    step('report-lusat', 'Tell Sellen where Lusat was', {
      kind: 'talk',
      done: talk(1044369228, '“Lusat’s sorcery ①” played'),
      evidence: 'script',
      rewards: ['Starlight Shards'],
      where: { grace: WAYPOINT_RUINS_CELLAR },
      note: 'She then asks you to visit her real body.',
    }),
    step('witchbane', 'Find Sellen’s real body at the Witchbane Ruins', {
      kind: 'talk',
      done: talk(1044369233, 'real-body greeting, second half'),
      evidence: 'script',
      where: { note: 'Witchbane Ruins, Weeping Peninsula (cellar)' },
    }),
    step('primal-glintstone', 'Accept Sellen’s Primal Glintstone', {
      kind: 'item',
      done: any(
        talk(1044369231, 'primal glintstone obtained'),
        has(8144, 'Sellen’s Primal Glintstone'),
      ),
      evidence: 'script',
      rewards: ["Sellen's Primal Glintstone"],
      where: { note: 'Witchbane Ruins, Weeping Peninsula' },
    }),
    step(
      'new-body',
      'Place the glintstone in the puppet in Seluvis’s hidden room',
      {
        kind: 'action',
        done: talk(1034509256, 'glintstone transplanted'),
        evidence: 'script',
        // No `requires` on Seluvis's puppet-room step: that step has no known flag, so it would
        // wrongly block anyone who found the room on their own.
        where: {
          grace: RANNIS_RISE,
          note: 'Seluvis’s hidden puppet room, under the illusory floor at the Three Sisters',
        },
        reload: true,
      },
    ),
    choice(
      'witch-hunt',
      'At the Grand Library doors: whose summon sign do you take?',
      [
        path(
          'with-sellen',
          'Side with Sellen and defeat Jerren',
          [
            step('defend-sellen', 'Help Sellen defeat Witch-Hunter Jerren', {
              kind: 'boss',
              done: any(
                flag(7609, 'boss', 'Jerren defeated as her summon'),
                stage('academy'),
                stage('transformed'),
              ),
              evidence: 'script',
              requires: [needsGate(GATES.rennala)],
              rewards: [
                "Eccentric's Hood",
                "Eccentric's Armor",
                "Eccentric's Manchettes",
                "Eccentric's Breeches",
              ],
              where: {
                grace: GRAND_LIBRARY,
                note: 'Summon sign outside Rennala’s library',
              },
              note: 'Jerren drops his armor.',
            }),
            step('academy-reunion', 'Talk to Sellen inside the Academy', {
              kind: 'talk',
              done: talk(14009255, 'first Academy greeting'),
              evidence: 'script',
              where: { grace: GRAND_LIBRARY },
            }),
            step(
              'glintstone-kris',
              'Talk to her again for the Glintstone Kris',
              {
                kind: 'talk',
                done: any(
                  talk(14009266, 'Glintstone Kris talk'),
                  pickup(400101, 'Glintstone Kris received'),
                ),
                evidence: 'script',
                rewards: ['Glintstone Kris'],
                unlocks: ['Shard Spiral in her shop'],
                where: { grace: GRAND_LIBRARY },
                reload: true,
              },
            ),
            step('transformed', 'Find Sellen transformed beside the library', {
              kind: 'event',
              done: stage('transformed'),
              evidence: 'script',
              where: { grace: GRAND_LIBRARY },
            }),
            step('crown', 'Pick up the Witch’s Glintstone Crown beside her', {
              kind: 'item',
              done: pickup(14005031, 'crown picked up'),
              evidence: 'observed',
              rewards: ["Witch's Glintstone Crown"],
              where: { grace: GRAND_LIBRARY },
            }),
            detour(
              'primeval-sorcerers',
              'Loot the primeval sorcerers’ bodies',
              {
                reward:
                  'Azur’s and Lusat’s armor sets (Azur’s also appears after the Jerren fight)',
              },
              [
                step(
                  'azur-set',
                  'Take Azur’s armor where he sat on Mt. Gelmir',
                  {
                    kind: 'item',
                    done: pickup(400441, 'Azur’s set picked up'),
                    evidence: 'observed',
                    rewards: [
                      "Azur's Glintstone Crown",
                      "Azur's Glintstone Robe",
                      "Azur's Manchettes",
                      "Old Sorcerer's Legwraps",
                    ],
                    where: {
                      note: 'By the Primeval Sorcerer Azur grace, Mt. Gelmir',
                    },
                  },
                ),
                step('lusat-set', 'Take Lusat’s armor in the Sellia Hideaway', {
                  kind: 'item',
                  done: pickup(400431, 'Lusat’s set picked up'),
                  evidence: 'observed',
                  rewards: [
                    "Lusat's Glintstone Crown",
                    "Lusat's Robe",
                    "Lusat's Manchettes",
                    "Old Sorcerer's Legwraps",
                  ],
                  where: { grace: SELLIA_HIDEAWAY },
                }),
              ],
            ),
          ],
          { ending: 'Sellen becomes one with the primeval glintstone' },
        ),
        path(
          'with-jerren',
          'Side with Jerren and defeat Sellen',
          [
            step('hunt-sellen', 'Help Jerren defeat Sellen', {
              kind: 'boss',
              done: flag(7608, 'boss', 'Sellen defeated as Jerren’s summon'),
              evidence: 'script',
              requires: [needsGate(GATES.rennala)],
              where: {
                grace: GRAND_LIBRARY,
                note: 'Summon sign outside Rennala’s library',
              },
              rewards: ["Sellen's Bell Bearing", "Witch's Glintstone Crown"],
            }),
          ],
          { ending: 'Sellen is slain by the witch-hunter' },
        ),
      ],
    ),
  ],
);
