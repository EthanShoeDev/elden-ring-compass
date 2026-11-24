import { any, has, pickup, talk } from '../cond';
import { defineGate, GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByGate,
  needsGate,
  statusBlock,
  step,
} from '../model';

const SLUMBERING_WOLFS_SHACK = 76215;
const ANCIENT_SNOW_VALLEY_RUINS = 76503;
const APOSTATE_DERELICT = 76653;

/**
 * 1051587800: the m60_51_58 (Castle Sol) item flag for the left Haligtree Medallion half (lot
 * 1051580800). Her shack script (`m60_36_41_00.evs.py` `Event_1036413700`) checks it while she is
 * still at her initial stage: she vanishes, 1036419215 `PCが割符を先に入手してバディ化した` is set
 * and her spirit ash is left lying at the shack instead (same lot flag 400410). She never reaches
 * the Haligtree stage, so the rest of the questline is lost. That it is the *left half pickup* is
 * our reading of the id (the script also pairs it with 400130, the right half); verify on a save.
 */
const leftHalf = defineGate(
  'haligtree-medallion-left',
  'Pick up the left half of the Haligtree Secret Medallion at Castle Sol',
  pickup(1051587800, 'left Haligtree Medallion half picked up'),
);

/**
 * Latenna the Albinauric (talk block NPC228 `ウルフライダー`; status 4100, stages 4105–4107).
 *
 * Stage machine (`common.evs.py` `Event_4119`): 4105 initial → 4106 `聖樹の地にて` ("in the land
 * of the Haligtree") on 1036419209 `バディアイテム化した` (she became your spirit ash). 4107
 * `イベント終了` is never set by `common`.
 *
 * Every talk flag here is a named `会話用フラグ` from her block: 1036419205 `割符を見せる_選択済`,
 * 1036419207 `連れて行く_選択済`, 1051569301 `城砦誘導_初回能動会話再生済`, 1049549201
 * `教会誘導_初回能動会話再生済`, 1047589205 `聖樹の地にて_受動会話再生済`.
 */
export const latenna = defineQuest(
  {
    id: 'latenna',
    npc: 'Latenna the Albinauric',
    isDlc: false,
    blurb:
      'An Albinauric archer guarding her dead wolf in Liurnia, who asks to be taken to Miquella’s Haligtree.',
    status: statusBlock(4100),
    stages: {
      initial: 4105,
      haligtree: 4106,
      finished: 4107,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC228 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_4119 (stage transition), m60_36_41_00.evs.py (shack, left-half lockout)',
      'er-save-manager quest_flags_db.py "Latenna" (observed flags)',
      'NPC Quests & Endings Guide v5 flowchart, Latenna column (ordering, missable lines, fail condition)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Latenna at the Slumbering Wolf’s Shack', {
      kind: 'talk',
      done: any(
        talk(1036419206, 'walked away without the medallion'),
        talk(1036419202, 'map point unlocked'),
      ),
      evidence: 'script',
      lockedBy: [lockedByGate(leftHalf)],
      where: { grace: SLUMBERING_WOLFS_SHACK },
      note: 'Gideon can tell you where she is once Ensha’s ambush is behind you.',
    }),
    step(
      'show-medallion',
      'Show her the right half of the Haligtree Secret Medallion',
      {
        kind: 'talk',
        done: talk(1036419205, 'medallion shown'),
        evidence: 'script',
        // Albus gives the right half whether or not you know Latenna, so it gates this step.
        requires: [
          {
            cond: any(
              pickup(400130, 'right half from Albus'),
              has(8176, 'Haligtree Secret Medallion (Right)'),
            ),
            label:
              'Unmask Albus in the Village of the Albinaurics and take the right medallion half',
          },
        ],
        lockedBy: [lockedByGate(leftHalf)],
        where: { grace: SLUMBERING_WOLFS_SHACK },
      },
    ),
    step(
      'join',
      'Agree to take her to the Haligtree: she becomes a spirit ash',
      {
        kind: 'talk',
        done: any(
          talk(1036419207, 'agreed to take her'),
          talk(1036419209, 'became a spirit ash'),
          stage('haligtree'),
        ),
        evidence: 'script',
        lockedBy: [lockedByGate(leftHalf)],
        rewards: ['Latenna the Albinauric'],
        where: { grace: SLUMBERING_WOLFS_SHACK },
      },
    ),
    detour(
      'snow-valley',
      'Latenna speaks up near Castle Sol',
      {
        // Assumed: she points you to the castle, so the line should stop once its half is taken.
        lockedBy: [lockedByGate(leftHalf)],
        reward: 'Her line guiding you to Castle Sol',
      },
      [
        step(
          'snow-valley-talk',
          'Hear Latenna speak northeast of the Ancient Snow Valley Ruins',
          {
            kind: 'talk',
            done: talk(1051569301, 'castle-guidance line played'),
            evidence: 'script',
            requires: [needsGate(GATES.mountaintopsGrace)],
            where: { grace: ANCIENT_SNOW_VALLEY_RUINS },
          },
        ),
      ],
    ),
    detour(
      'snowfield',
      'Latenna speaks up in the Consecrated Snowfield',
      { reward: 'Her line on arriving in the Consecrated Snowfield' },
      [
        step(
          'snowfield-talk',
          'Hear Latenna speak as you reach the Consecrated Snowfield',
          {
            kind: 'talk',
            done: talk(1049549201, 'church-guidance line played'),
            evidence: 'script',
            where: { note: 'Consecrated Snowfield, after the hidden lift' },
          },
        ),
      ],
    ),
    step(
      'apostate-derelict',
      'Talk to the giant Albinauric at the Apostate Derelict',
      {
        kind: 'talk',
        done: any(
          talk(1047589205, 'Haligtree talk played'),
          pickup(400411, 'Somber Ancient Dragon Smithing Stone'),
        ),
        evidence: 'script',
        requires: [needsGate(GATES.mountaintopsGrace)],
        rewards: ['Somber Ancient Dragon Smithing Stone'],
        where: { grace: APOSTATE_DERELICT },
        note: 'Summon her nearby first.',
      },
    ),
  ],
);
