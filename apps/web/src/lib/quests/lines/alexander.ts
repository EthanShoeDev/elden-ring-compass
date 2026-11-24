import { any, has, pickup, talk } from '../cond';
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

const SAINTSBRIDGE = 76117;
const GAEL_TUNNEL = 73207;
const REDMANE_CASTLE_PLAZA = 76419;
const JARBURG = 76245;
const SEETHEWATER_TERMINUS = 76355;
const BESIDE_THE_GREAT_BRIDGE = 71310;

/**
 * Iron Fist Alexander (status 3660 `壺マイヤー`; stages 3665–3671, unnamed — the names here are
 * ours; his EFID_Talk_NPC220 block is a template).
 *
 * Stage machine (`common.evs.py` `Event_3679`): 3665 Stormhill → 3666 Gael Tunnel on
 * 1043399307 (thanked you in Stormhill) ∨ 32009203 → 3667 Redmane on the festival (9410), from
 * either earlier stage — so the early encounters are missable → 3668 on Radahn's defeat (9130) →
 * 3669 Liurnia on his post-Radahn talk (1051369266) → 3670 Mt. Gelmir on 1035539204 (unknown) →
 * 3671 Farum Azula once the Fire Giant is dead (1052520800) and you've freed him from the lava
 * (1035539205). The Liurnia hole is skipped if you go straight to Gelmir.
 *
 * Talk flags are from his per-map `会話用フラグ` blocks (Stormhill 1043399300+, Gael Tunnel
 * 32009200+, Redmane 1051369250+, Liurnia 1039449200+, Gelmir 1035539200+, Farum 13009250+), all
 * unnamed; ids from the community flag log, `script` where the stage machine reads them.
 *
 * Jar-Bairn (`jar-bairn.ts`) wakes once you've spoken to him (1043399313) and wants his innards.
 */
export const alexander = defineQuest(
  {
    id: 'alexander',
    npc: 'Iron Fist Alexander',
    isDlc: false,
    blurb:
      'A jovial warrior jar, forever stuck in holes, out to grow stronger through great battles.',
    // He dies after the Farum Azula duel; hitting him while he's down skips his last words.
    status: { ...statusBlock(3660), diesAfter: 'farum-duel' },
    stages: {
      stormhill: 3665,
      gaelTunnel: 3666,
      festival: 3667,
      afterRadahn: 3668,
      liurnia: 3669,
      gelmir: 3670,
      farum: 3671,
    },
    sources: [
      'soulsmods elden-ring-eventparam Talk_Common (status block 3660, per-map talk blocks)',
      'soulstruct common.evs.py Event_3679 (stage transitions), festival trigger (9410)',
      'er-save-manager quest_flags_db.py "Iron Fist Alexander" (observed flags)',
      'NPC Quests & Endings Guide v5 flowchart, Alexander column (ordering, missables)',
    ],
  },
  ({ stage }) => [
    detour(
      'early',
      'Free Alexander before the festival',
      {
        lockedBy: [lockedByGate(GATES.radahnFestival)],
        reward: 'Triumphant Delight, Exalted Flesh and his early dialogue',
      },
      [
        step('stormhill', 'Hit Alexander out of his hole in Stormhill', {
          kind: 'action',
          // Not the gesture alone: gestures carry over into NG+.
          done: talk(1043399312, 'knocked free'),
          evidence: 'observed',
          rewards: ['Triumphant Delight'],
          where: {
            grace: SAINTSBRIDGE,
            note: 'Stormhill, north of the Warmaster’s Shack',
          },
        }),
        step('stormhill-thanks', 'Talk to him for his thanks', {
          kind: 'talk',
          done: any(
            talk(1043399307, 'thanked you (Exalted Flesh)'),
            pickup(400170, 'Exalted Flesh'),
          ),
          evidence: 'script',
          rewards: ['Exalted Flesh'],
          where: { grace: SAINTSBRIDGE },
        }),
        step('gael-tunnel', 'Talk to him again in Gael Tunnel', {
          kind: 'talk',
          done: any(talk(32009203), talk(32009206)),
          evidence: 'observed',
          where: { grace: GAEL_TUNNEL },
        }),
      ],
    ),
    detour(
      'festival',
      'Alexander at the Radahn Festival',
      {
        // He leaves the plaza once Radahn falls (stage 3667 → 3668); two fixture saves skipped it.
        lockedBy: [lockedByGate(GATES.radahn)],
        reward: 'His festival dialogue',
      },
      [
        step('festival-talk', 'Talk to Alexander at the Radahn Festival', {
          kind: 'talk',
          done: talk(1051369255, 'festival talk'),
          evidence: 'observed',
          requires: [needsGate(GATES.radahnFestival)],
          where: { grace: REDMANE_CASTLE_PLAZA },
        }),
      ],
    ),
    step(
      'after-radahn',
      'Talk to him in the Wailing Dunes after Radahn falls',
      {
        kind: 'talk',
        done: any(
          talk(1051369266, 'second post-Radahn talk'),
          stage('liurnia'),
          stage('gelmir'),
          stage('farum'),
        ),
        evidence: 'script',
        requires: [needsGate(GATES.radahn)],
        where: {
          grace: REDMANE_CASTLE_PLAZA,
          note: 'Wailing Dunes, near the battlefield',
        },
        reload: true,
      },
    ),
    detour(
      'liurnia',
      'Free Alexander from a hole in Liurnia',
      {
        // Assumed from the flowchart's "missable": once he is in the Gelmir lava he is gone here.
        lockedBy: [
          lockedWhen(
            any(stage('gelmir'), stage('farum')),
            'Meet Alexander on Mt. Gelmir',
            'Alexander moved on to Mt. Gelmir',
          ),
        ],
        reward: 'Exalted Flesh and his Liurnia dialogue',
      },
      [
        step(
          'liurnia-free',
          'Oil him up and break him free south of the Carian Study Hall',
          {
            kind: 'action',
            done: any(
              talk(1039449214, 'freed in Liurnia'),
              pickup(400171, 'Exalted Flesh (Liurnia)'),
            ),
            evidence: 'observed',
            rewards: ['Exalted Flesh'],
            where: { grace: JARBURG, note: 'South of the Carian Study Hall' },
            note: 'Use an Oil Pot on him, then strike him.',
          },
        ),
      ],
    ),
    step('gelmir', 'Free him from the lava on Mt. Gelmir', {
      kind: 'action',
      done: any(
        talk(1035539205, 'freed (Jar helmet)'),
        pickup(400172, 'Jar helmet'),
        stage('farum'),
      ),
      evidence: 'script',
      rewards: ['Jar'],
      where: {
        grace: SEETHEWATER_TERMINUS,
        note: 'Lava lake past the Magma Wyrm at Fort Laiedd',
      },
    }),
    detour(
      'fire-giant',
      'Fight the Fire Giant with Alexander',
      {
        lockedBy: [lockedByGate(GATES.fireGiant)],
        reward: 'Alexander’s help (and dialogue) against the Fire Giant',
      },
      [
        step('fire-giant-summon', 'Summon Alexander against the Fire Giant', {
          kind: 'boss',
          flagTodo:
            'Use Alexander’s summon sign at the Fire Giant arena; the flag that flips on summoning',
          unlocks: ['Alexander as an ally against the Fire Giant'],
          where: { note: 'Fire Giant arena, Mountaintops of the Giants' },
        }),
      ],
    ),
    step(
      'farum-duel',
      'Meet him in Crumbling Farum Azula and accept his duel',
      {
        kind: 'boss',
        done: talk(13009256, 'duel accepted'),
        evidence: 'observed',
        requires: [needsGate(GATES.erdtreeBurned)],
        where: { grace: BESIDE_THE_GREAT_BRIDGE },
      },
    ),
    step('farum-farewell', 'Hear his last words after the duel', {
      kind: 'talk',
      done: any(
        talk(13009257, 'last words'),
        pickup(400174, 'Shard of Alexander and his innards'),
        has(8222, 'Alexander’s Innards'),
      ),
      evidence: 'observed',
      rewards: ['Shard of Alexander', "Alexander's Innards"],
      where: { grace: BESIDE_THE_GREAT_BRIDGE },
      note: 'Take the innards to Jar-Bairn in Jarburg.',
    }),
  ],
);
