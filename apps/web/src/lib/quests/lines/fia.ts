import { any, boss, flag, has, pickup, reached, talk } from '../cond';
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

const TABLE_OF_LOST_GRACE = 71190;
const DIVINE_TOWER_OF_LIURNIA = 73422;
const ACROSS_THE_ROOTS = 71235;
const PRINCE_OF_DEATHS_THRONE = 71230;

/**
 * Fia, the Deathbed Companion (talk block NPC322, dev name ユリア; status 4120).
 *
 * Stage machine (`common.evs.py` `Event_4139`): 4125 at Roundtable Hold → 4126 "reclaimed the
 * mark", on D at the Hold (4047) ∧ D's talk 11109625 "handed over Fia's dagger" (also kills D:
 * 4048 + 4043) → 4127 "away", on her talk 11109015 over D's body; OR at 4125 once D is dead ∧
 * (an Altus grace 3063 ∨ the Radahn Festival 9410); OR from 4125/4126 once the Erdtree burns
 * (110, which also kills D) → 4128 by Godwyn's body, on Fia's Champions 12030800 → 4129, on talk
 * 12039157 "about lying with Godwyn" → 4130 "boss warp", on talk 12039158 "about parting" → 4131
 * after Lichdragon Fortissax 12030850 → 4132 "killed by D's twin" (D, Beholder of Death's
 * `Event_4079`, once the Mending Rune is held: 9502).
 *
 * Her whole Roundtable Hold arc is skippable: she reaches Deeproot Depths anyway once the Erdtree
 * burns (or D dies), so it is a detour closed by her leaving the Hold.
 */
export const fia = defineQuest(
  {
    id: 'fia',
    npc: 'Fia, the Deathbed Companion',
    isDlc: false,
    blurb:
      'A Roundtable companion who embraces the Tarnished, and who means to lie beside the dead god Godwyn.',
    // D's twin kills her once the Mending Rune is taken (stage 4132 + dead 4123).
    status: { ...statusBlock(4120), diesAfter: 'mending-rune' },
    stages: {
      initial: 4125,
      markReclaimed: 4126,
      away: 4127,
      nearGodwyn: 4128,
      beforeSleep: 4129,
      dreamWarp: 4130,
      afterFortissax: 4131,
      killedByTwin: 4132,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC322 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_4139 (stage transitions), Event_4059 / Event_4079 (D and his twin)',
      'er-save-manager quest_flags_db.py "Fia" (observed talk and item-lot flags)',
      'NPC Quests & Endings Guide v5 flowchart, Fia column (ordering)',
      'Fextralife Fia page (dagger timing, Erdtree skip)',
    ],
  },
  ({ stage }) => [
    detour(
      'roundtable',
      'Fia at Roundtable Hold',
      {
        lockedBy: [
          lockedWhen(
            any(
              stage('away'),
              stage('nearGodwyn'),
              stage('beforeSleep'),
              stage('dreamWarp'),
              stage('afterFortissax'),
              stage('killedByTwin'),
            ),
            'Fia has left Roundtable Hold',
          ),
          lockedByGate(GATES.erdtreeBurned),
        ],
        reward:
          'Baldachin’s Blessing, the Weathered Dagger and her Roundtable Hold conversations',
      },
      [
        step('meet', 'Meet Fia at Roundtable Hold and let her hold you', {
          kind: 'talk',
          done: any(
            talk(11109006, 'let her hold you'),
            talk(11109005, 'turned her down'),
          ),
          evidence: 'script',
          where: { grace: TABLE_OF_LOST_GRACE },
          rewards: ["Baldachin's Blessing"],
          note: 'She hands over another Baldachin’s Blessing whenever you hold none.',
        }),
        detour(
          'secret',
          'Talk to Fia in secret',
          { reward: 'Her account of the Deathbed Companions' },
          [
            step(
              'talk-in-secret',
              'Let her hold you again and talk in secret',
              {
                kind: 'talk',
                done: talk(11109007, 'about the Deathbed Companion'),
                evidence: 'script',
                where: { grace: TABLE_OF_LOST_GRACE },
              },
            ),
          ],
        ),
        detour(
          'knifeprint',
          'Ask Fia about the Black Knives',
          { reward: 'Knifeprint Clue' },
          [
            step(
              'knifeprint-clue',
              'After Rogier tells you of the Black Knives, ask Fia about them',
              {
                kind: 'item',
                done: any(
                  talk(11109017, 'about the Black Knives ②'),
                  pickup(400334, 'Knifeprint Clue received'),
                  has(8190, 'Knifeprint Clue'),
                ),
                evidence: 'script',
                requires: [
                  {
                    cond: reached('rogier', 'ask-black-knives'),
                    label: 'Ask Rogier about the Night of the Black Knives',
                  },
                ],
                rewards: ['Knifeprint Clue'],
                where: { grace: TABLE_OF_LOST_GRACE },
              },
            ),
          ],
        ),
        step('weathered-dagger', 'Ask Fia for a favor and take her dagger', {
          kind: 'item',
          done: any(
            talk(11109008, 'about Fia’s dagger'),
            pickup(400331, 'Weathered Dagger received'),
          ),
          evidence: 'script',
          requires: [needsGate(GATES.radahnFestival)],
          rewards: ['Weathered Dagger'],
          where: { grace: TABLE_OF_LOST_GRACE },
        }),
        step('deliver-dagger', 'Hand the Weathered Dagger to D', {
          kind: 'talk',
          done: any(
            talk(11109625, 'D took the dagger'),
            stage('markReclaimed'),
          ),
          evidence: 'script',
          where: { grace: TABLE_OF_LOST_GRACE },
          reload: true,
          note: 'Rest afterwards: D is found dead in the Hold’s back room.',
        }),
        step('over-d-body', 'Talk to Fia where she stands over D’s body', {
          kind: 'talk',
          done: talk(11109015, 'spoke to her over D’s body'),
          evidence: 'script',
          where: { grace: TABLE_OF_LOST_GRACE },
          reload: true,
          note: 'She then leaves the Hold.',
        }),
      ],
    ),
    step('champions', 'Defeat Fia’s Champions in the Deeproot Depths', {
      kind: 'boss',
      // Not boss(12030800) itself: the arena can be cleared before Fia ever arrives (a fixture
      // character has). Her stage advances past 'away' only once both are true.
      done: any(
        stage('nearGodwyn'),
        stage('beforeSleep'),
        stage('dreamWarp'),
        stage('afterFortissax'),
        stage('killedByTwin'),
      ),
      evidence: 'script',
      requires: [
        {
          cond: any(
            stage('away'),
            stage('nearGodwyn'),
            stage('beforeSleep'),
            stage('dreamWarp'),
            stage('afterFortissax'),
            stage('killedByTwin'),
          ),
          label:
            'Fia has left Roundtable Hold (hand D her dagger, or burn the Erdtree)',
        },
      ],
      where: { grace: ACROSS_THE_ROOTS },
      reload: true,
      note: 'If you cleared the arena before she arrived, just rest: she moves beside Godwyn.',
    }),
    step('held-deeproot', 'Talk to Fia beside Godwyn and let her hold you', {
      kind: 'talk',
      done: any(
        talk(12039156, 'asked to be held'),
        talk(12039155, 'answered her'),
      ),
      evidence: 'script',
      rewards: ["Baldachin's Blessing"],
      where: { grace: PRINCE_OF_DEATHS_THRONE },
    }),
    step('cursemark', 'Obtain the Cursemark of Death', {
      kind: 'item',
      done: has(8191, 'Cursemark of Death'),
      evidence: 'script',
      requires: [
        {
          cond: reached('ranni', 'cursemark'),
          label:
            'Claim the Cursemark of Death atop the Divine Tower of Liurnia (Ranni’s questline)',
        },
      ],
      where: { grace: DIVINE_TOWER_OF_LIURNIA },
    }),
    step('give-cursemark', 'Give Fia the Cursemark of Death', {
      kind: 'talk',
      done: any(
        talk(12039161, 'handed over the Cursemark'),
        pickup(400333, 'Radiant Baldachin’s Blessing received'),
      ),
      evidence: 'script',
      rewards: ["Radiant Baldachin's Blessing"],
      where: { grace: PRINCE_OF_DEATHS_THRONE },
    }),
    step('godwyn-talk', 'Talk to her about lying with Godwyn', {
      kind: 'talk',
      done: any(
        talk(12039157, 'about lying with Godwyn'),
        stage('beforeSleep'),
      ),
      evidence: 'script',
      where: { grace: PRINCE_OF_DEATHS_THRONE },
    }),
    step('farewell', 'Hear her farewell, then rest', {
      kind: 'talk',
      done: any(talk(12039158, 'about parting'), stage('dreamWarp')),
      evidence: 'script',
      where: { grace: PRINCE_OF_DEATHS_THRONE },
      reload: true,
      note: 'She falls asleep. Examine her to enter the Deathbed Dream.',
    }),
    step('fortissax', 'Enter her dream and defeat Lichdragon Fortissax', {
      kind: 'boss',
      done: boss(12030850, 'Lichdragon Fortissax'),
      evidence: 'script',
      rewards: ['Remembrance of the Lichdragon'],
      where: { grace: PRINCE_OF_DEATHS_THRONE },
    }),
    step('mending-rune', 'Take the Mending Rune of the Death-Prince from her', {
      kind: 'item',
      done: any(
        flag(9502, 'pickup', 'holding the Mending Rune of the Death-Prince'),
        has(8183, 'Mending Rune of the Death-Prince'),
        stage('killedByTwin'),
      ),
      evidence: 'script',
      rewards: ['Mending Rune of the Death-Prince'],
      unlocks: ['The Age of the Duskborn ending'],
      where: { grace: PRINCE_OF_DEATHS_THRONE },
    }),
    detour(
      'fia-set',
      'Collect Fia’s clothes',
      { reward: 'Fia’s Hood and Fia’s Robe' },
      [
        step(
          'fia-set-pickup',
          'Rest, then take Fia’s set from beside her body',
          {
            kind: 'item',
            done: pickup(400339, 'Fia’s set picked up'),
            evidence: 'observed',
            rewards: ["Fia's Hood", "Fia's Robe"],
            where: { grace: PRINCE_OF_DEATHS_THRONE },
          },
        ),
      ],
    ),
  ],
);
