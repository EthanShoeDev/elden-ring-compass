import { any, boss, flag, talk } from '../cond';
import { defineGate, GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByGate,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const SEASIDE_RUINS = 76113;
const MURKWATER_COAST = 76116;
const MAIN_ACADEMY_GATE = 76206;

/** Flying Dragon Agheel: once dead, Yura's first meeting no longer leads to the dragon talk. */
const agheel = defineGate(
  'agheel',
  'Defeat Flying Dragon Agheel',
  boss(1043360800, 'Flying Dragon Agheel'),
);

/**
 * Bloody Finger Hunter Yura (talk block NPC318, status 3620; the block's `混沌の宿主` name is a
 * development leftover).
 *
 * Stage machine (`common.evs.py` `Event_3639`, stage names from `EFID_Talk_NPC318`): 3626 initial
 * → 3625 "after the Nerijus win" on 1043379263 (Nerijus withdrew once) until his first talk there
 * (1044389206), then back to 3626 → 3627 "after the Ravenmount win" on 7607 (pseudo-invasion
 * cleared, `m60_35_46`) → 3630 "beaten by Eleonora" on 1035469207 (his second talk after the win)
 * → 3631 "taken by the chaos host" on 1039529206 (Eleonora's sign enabled, `m60_39_52`).
 *
 * Killing him never leaves him dead: the same event resets him to alive and jumps to 3631,
 * setting 1049539210. That marker is the lockout.
 */
export const yura = defineQuest(
  {
    id: 'yura',
    npc: 'Bloody Finger Hunter Yura',
    isDlc: false,
    blurb:
      'A hunter of Bloody Fingers who keeps crossing your path, chasing the invader Eleonora.',
    status: statusBlock(3620),
    stages: {
      afterNerijus: 3625,
      initial: 3626,
      afterRavenmount: 3627,
      beatenByEleonora: 3630,
      takenByChaos: 3631,
    },
    lockedBy: [
      lockedWhen(
        flag(1049539210, 'status', 'Yura was killed'),
        'Kill Yura',
        'Yura was killed',
      ),
    ],
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC318 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3639 (stage transitions); m60_35_46 (Ravenmount), m60_39_52 (Eleonora)',
      'Grand Archives CT "NPCs/Yura" (locations)',
      'NPC Quests & Endings Guide v5 flowchart, Yura column (ordering)',
    ],
  },
  () => [
    detour(
      'agheel-meeting',
      'Meet Yura before Agheel falls',
      { reward: 'His warning about Agheel and the Church of Dragon Communion' },
      [
        step('meet-seaside', 'Meet Yura northeast of the Seaside Ruins grace', {
          kind: 'talk',
          done: any(
            talk(1043359255, 'met before seeing the dragon'),
            talk(1043359256, 'met with the dragon alive'),
          ),
          evidence: 'script',
          where: { grace: SEASIDE_RUINS },
          lockedBy: [lockedByGate(agheel)],
        }),
        step(
          'agheel-talk',
          'Defeat Agheel (Yura can be summoned), then hear him out about the Church of Dragon Communion',
          {
            kind: 'talk',
            flagTodo:
              'Talk to Yura at the Seaside Ruins after killing Agheel, having met him before; the 104335925x/104336920x flag that flips',
            where: { grace: SEASIDE_RUINS },
          },
        ),
      ],
    ),
    step(
      'nerijus',
      'Defeat the Bloody Finger Nerijus who invades near Murkwater Cave',
      {
        kind: 'boss',
        done: talk(1043379262, 'Nerijus defeated'),
        evidence: 'script',
        where: { grace: MURKWATER_COAST, note: 'Outside Murkwater Cave' },
      },
    ),
    step('after-nerijus', 'Talk to Yura north of Murkwater Cave', {
      kind: 'talk',
      done: talk(1044389206, 'first talk after Nerijus'),
      evidence: 'script',
      where: { grace: MURKWATER_COAST },
    }),
    step(
      'ravenmount',
      'Touch Yura’s red sign north of the Main Academy Gate and kill the Ravenmount Assassin',
      {
        kind: 'boss',
        done: flag(7607, 'boss', 'Ravenmount Assassin (pseudo-invasion)'),
        evidence: 'script',
        where: { grace: MAIN_ACADEMY_GATE },
        requires: [needsGate(GATES.liurniaGrace)],
        rewards: [
          'Rune Arc',
          'Furlcalling Finger Remedy',
          'Ash of War: Raptor of the Mists',
          'Smithing Stone [5]',
        ],
      },
    ),
    step('after-ravenmount', 'Talk to Yura afterwards, twice', {
      kind: 'talk',
      done: any(
        talk(1035469206, 'first talk after the win'),
        talk(1035469207, 'second talk after the win'),
      ),
      evidence: 'script',
      where: { grace: MAIN_ACADEMY_GATE },
      reload: true,
    }),
    step(
      'second-church',
      'Find the wounded Yura near the Second Church of Marika',
      {
        kind: 'talk',
        done: talk(1039529205, 'first talk after Eleonora beat him'),
        evidence: 'script',
        where: { note: 'Second Church of Marika, Altus Plateau' },
        requires: [needsGate(GATES.altusGrace)],
        // Item lot 101630 appears once this talk has played (`m60_39_52` CommonFunc_90005750).
        rewards: ['Nagakiba'],
        note: 'Pick up the sword he leaves beside him.',
      },
    ),
    step('eleonora', 'Answer Eleonora’s sign nearby and defeat her', {
      kind: 'boss',
      done: flag(1039520180, 'boss', 'Eleonora, Violet Bloody Finger'),
      evidence: 'script',
      where: { note: 'Second Church of Marika, Altus Plateau' },
      rewards: [
        "Eleonora's Poleblade",
        'Purifying Crystal Tear',
        'Furlcalling Finger Remedy',
      ],
    }),
  ],
);
