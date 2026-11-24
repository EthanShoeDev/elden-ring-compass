import { any, boss, flag, pickup, reached, talk } from '../cond';
import { defineGate } from '../gates';
import { defineQuest, detour, lockedByGate, statusBlock, step } from '../model';

const GREAT_WATERFALL_BASIN = 71220;
const PRINCE_OF_DEATHS_THRONE = 71230;

/** The Valiant Gargoyles (Siofra Aqueduct): once they fall, D's twin can no longer be summoned. */
const valiantGargoyles = defineGate(
  'valiant-gargoyles',
  'Defeat the Valiant Gargoyles',
  boss(12020800, 'Valiant Gargoyles'),
);

/**
 * D, Beholder of Death: D's twin brother (talk block NPC319, dev name ダニー; status 4060).
 *
 * Stage machine (`common.evs.py` `Event_4079`): 4065 asleep in the Siofra Aqueduct → 4077 (unnamed)
 * on talk 12029016 "handed over the Twinned set" ∧ D slain by Fia (4048). Handing it over while D
 * is still alive or was killed by the player (no 4048) turns the twin permanently hostile (4062)
 * instead → 4066 beside the Death-Prince's corpse, on 4077 ∧ Mending Rune held (9502) ∧ Fia's
 * after-Fortissax stage 4131; this also kills Fia (4132 + 4123) → 4067 (unnamed, gone), on his
 * Deeproot talk 12039005.
 */
export const dBeholder = defineQuest(
  {
    id: 'd-beholder',
    npc: 'D, Beholder of Death',
    isDlc: false,
    blurb:
      'D’s twin, who shares his brother’s armor and comes to see Fia’s work through.',
    status: statusBlock(4060),
    stages: {
      asleep: 4065,
      byDeathPrince: 4066,
      gone: 4067,
      armorAccepted: 4077,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC319 (status/stage names, second half)',
      'soulstruct common.evs.py Event_4079 (stage transitions)',
      'er-save-manager quest_flags_db.py "D Hunter of the Dead" and "Fia" (observed twin flags)',
      'NPC Quests & Endings Guide v5 flowchart, D, Beholder of Death column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Find D’s twin sitting in the Siofra Aqueduct', {
      kind: 'talk',
      // Unnamed talk flag in his Siofra block; the flag log saw it with the armor prompt, and a
      // fixture character without D's armor has it, so it likely marks any talk. Verify.
      done: talk(12029015, 'spoke to him in the aqueduct'),
      evidence: 'assumed',
      // Inner Order is given on this first talk (not after the armor): two fixture characters
      // hold it with D still alive. Gestures carry into NG+, so it is never used as evidence.
      rewards: ['Inner Order'],
      where: {
        grace: GREAT_WATERFALL_BASIN,
        note: 'Down the corridor past the Great Waterfall Basin grace.',
      },
    }),
    step('get-armor', 'Take D’s armor from his body at Roundtable Hold', {
      kind: 'item',
      done: pickup(400349, 'D’s armor taken'),
      evidence: 'observed',
      requires: [
        {
          cond: flag(4043, 'status', 'D is dead'),
          label: 'D has died (hand him Fia’s Weathered Dagger)',
        },
      ],
      note: 'Only hand it to his twin after Fia has killed D: otherwise he turns on you.',
    }),
    step('give-armor', 'Give D’s twin the Twinned armor', {
      kind: 'talk',
      done: any(
        talk(12029016, 'handed over the Twinned set'),
        stage('armorAccepted'),
      ),
      evidence: 'script',
      requires: [
        {
          cond: flag(4048, 'stage', 'D slain by Fia'),
          label:
            'Fia has killed D (handing it over sooner makes his twin hostile)',
        },
      ],
      where: { grace: GREAT_WATERFALL_BASIN },
      reload: true,
    }),
    detour(
      'gargoyles',
      'Fight the Valiant Gargoyles with D’s twin',
      {
        lockedBy: [lockedByGate(valiantGargoyles)],
        reward: 'His help against the Valiant Gargoyles',
      },
      [
        step('gargoyles-summon', 'Summon him against the Valiant Gargoyles', {
          kind: 'boss',
          unlocks: ['D’s twin as a summon against the Valiant Gargoyles'],
          where: { grace: GREAT_WATERFALL_BASIN },
          flagTodo:
            'Summon D’s twin at the Valiant Gargoyles fog gate; the flag that flips when his sign is used',
        }),
      ],
    ),
    step('deeproot-talk', 'Talk to him by Fia’s body in the Deeproot Depths', {
      kind: 'talk',
      done: any(talk(12039005, 'spoke over Fia’s body'), stage('gone')),
      evidence: 'script',
      requires: [
        {
          cond: reached('fia', 'mending-rune'),
          label: 'Defeat Lichdragon Fortissax and take Fia’s Mending Rune',
        },
      ],
      where: { grace: PRINCE_OF_DEATHS_THRONE },
      reload: true,
    }),
    detour(
      'inseparable-sword',
      'Collect what he leaves behind',
      { reward: 'Inseparable Sword and the Twinned set' },
      [
        step(
          'twinned-loot',
          'Rest, then pick up the Inseparable Sword and Twinned set',
          {
            kind: 'item',
            done: pickup(400348, 'Inseparable Sword and Twinned set taken'),
            evidence: 'observed',
            rewards: [
              'Inseparable Sword',
              'Twinned Helm',
              'Twinned Armor',
              'Twinned Gauntlets',
              'Twinned Greaves',
            ],
            where: { grace: PRINCE_OF_DEATHS_THRONE },
          },
        ),
      ],
    ),
  ],
);
