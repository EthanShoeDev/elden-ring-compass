import { all, any, boss, flag, not, reached, talk } from '../cond';
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

const MISTWOOD_OUTSKIRTS = 76114;
const RANNIS_RISE = 76228;
const SIOFRA_RIVER_BANK = 71222;
const REDMANE_CASTLE_PLAZA = 76419;

const DARRIWIL = defineGate(
  'darriwil',
  'Defeat Bloodhound Knight Darriwil in the Forlorn Hound Evergaol',
  boss(1044350800, 'Bloodhound Knight Darriwil'),
);

/**
 * Blaidd the Half-Wolf (talk block NPC216 `狼頭の戦士`, status 3600).
 *
 * `EFID_Talk_NPC216` names his talk flags by phase: 1 Mistwood (1045379205 first talk, 1045379208
 * "got acquainted"), 2 the evergaol (1044349255, 1044349258 "beat Darriwil together"), 3 Ranni's
 * Rise (1034509205), 4 Siofra (12029153, 12029155 "told of the festival"), 5 Redmane (1051369355),
 * 5-late Wailing Dunes (1052389305), 6 sealed in the evergaol (1044359255, 1044359256 "first talk
 * after release").
 *
 * Stage machine (`common.evs.py` `Event_3619`; the eventparam stage names past 3610 are stale):
 * 3605 initial → 3606/3607 Darriwil sign / Darriwil beaten → 3608 after the evergaol talk → 3609
 * on joining Ranni (1034509410) → 3610 when she sleeps (1034509416) → 3611–3613 at the festival
 * (9410/9411/9412) → 3614 sealed in the evergaol, on the Dunes talk, Iji's post-Radahn talk
 * (1034499238) or the Fingerslayer Blade pickup (12027080); straight there if the festival ends
 * without him → 3615 released (Darriwil dead ∧ in Ranni's service) → 3616 after the release talk
 * → 3617 mad, from ANY stage, once Astel is dead (9108) and you hold the Dark Moon Ring (114).
 * Killed before 3617 he comes back hostile (3601), so only the mad fight leaves him dead.
 */
export const blaidd = defineQuest(
  {
    id: 'blaidd',
    npc: 'Blaidd the Half-Wolf',
    isDlc: false,
    blurb:
      'Ranni’s loyal half-wolf shadow, who hunts with you in Limgrave and Caelid until the fate written for him catches up.',
    status: statusBlock(3600),
    stages: {
      initial: 3605,
      darriwilSign: 3606,
      darriwilBeaten: 3607,
      afterEvergaol: 3608,
      joinedRanni: 3609,
      ranniAsleep: 3610,
      atFestival: 3611,
      festivalOn: 3612,
      festivalOver: 3613,
      sealed: 3614,
      released: 3615,
      releaseTalked: 3616,
      mad: 3617,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC216 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3619 (stage transitions)',
      'NPC Quests & Endings Guide v5 flowchart, Blaidd column (ordering, missables)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Blaidd', {
      kind: 'talk',
      done: any(
        talk(1045379208, 'got acquainted with Blaidd'),
        talk(1045379205, 'first Mistwood talk'),
        talk(1051369355, 'first Redmane talk'),
      ),
      evidence: 'script',
      where: {
        grace: MISTWOOD_OUTSKIRTS,
        note: 'Follow the howl in Mistwood and answer with Finger Snap (from Kalé). Missed that, he’s at Redmane Castle during the festival.',
      },
    }),
    detour(
      'darriwil-hunt',
      'Hunt Darriwil with Blaidd',
      {
        lockedBy: [lockedByGate(GATES.radahnFestival)],
        reward:
          'Somber Smithing Stone [2] and Blaidd’s word to Iji (the Carian Filigreed Crest in Iji’s shop)',
      },
      [
        step(
          'darriwil-together',
          'Summon Blaidd and defeat Darriwil in the Forlorn Hound Evergaol',
          {
            kind: 'boss',
            done: talk(1044349258, 'beat Darriwil together'),
            evidence: 'script',
            lockedBy: [
              lockedWhen(
                all(
                  DARRIWIL.cond,
                  not(talk(1045379205, 'first Mistwood talk')),
                ),
                'Defeat Darriwil alone, before meeting Blaidd',
                'Darriwil was defeated before you met Blaidd',
              ),
            ],
            where: { note: 'Forlorn Hound Evergaol, Limgrave' },
          },
        ),
        step('evergaol-talk', 'Talk to Blaidd outside the evergaol', {
          kind: 'talk',
          done: talk(1044349255, 'first evergaol talk'),
          evidence: 'script',
          requires: [needsGate(DARRIWIL)],
          where: { note: 'Forlorn Hound Evergaol, Limgrave' },
          note: 'Talk twice: he asks you to tell Iji that Blaidd sent you.',
          rewards: ['Somber Smithing Stone [2]'],
          unlocks: [
            'Carian Filigreed Crest in Iji’s shop (say Blaidd sent you)',
          ],
        }),
      ],
    ),
    detour(
      'ranni-service',
      'Blaidd as Ranni’s retainer',
      {
        lockedBy: [lockedByGate(GATES.radahnFestival)],
        reward:
          'Blaidd’s talks at Ranni’s Rise and Siofra River (dialogue only, no item)',
      },
      [
        step('rise-talk', 'Talk to Blaidd’s spirit at Ranni’s Rise', {
          kind: 'talk',
          done: talk(1034509205, 'first Rise talk'),
          evidence: 'script',
          requires: [
            {
              cond: reached('ranni', 'join'),
              label: 'Enter Ranni’s service',
            },
          ],
          where: { grace: RANNIS_RISE },
        }),
        step('siofra-talk', 'Find Blaidd by the Siofra River', {
          kind: 'talk',
          done: talk(12029153, 'first Siofra talk'),
          evidence: 'script',
          requires: [
            {
              cond: reached('ranni', 'slumber'),
              label: 'Ranni has withdrawn to rest',
            },
          ],
          where: { grace: SIOFRA_RIVER_BANK },
        }),
        step('festival-news', 'Hear from Blaidd about the Radahn Festival', {
          kind: 'talk',
          done: talk(12029155, 'told of the festival'),
          evidence: 'script',
          where: { grace: SIOFRA_RIVER_BANK },
        }),
      ],
    ),
    detour(
      'redmane',
      'Blaidd at the Radahn Festival',
      {
        lockedBy: [lockedByGate(GATES.radahn)],
        reward: 'Blaidd’s summon against Radahn (no item)',
      },
      [
        step('redmane-talk', 'Talk to Blaidd at Redmane Castle', {
          kind: 'talk',
          done: talk(1051369355, 'first Redmane talk'),
          evidence: 'script',
          requires: [needsGate(GATES.radahnFestival)],
          where: { grace: REDMANE_CASTLE_PLAZA },
          unlocks: ['Blaidd’s summon sign for the Radahn fight'],
        }),
      ],
    ),
    detour(
      'wailing-dunes',
      'Blaidd after Radahn',
      {
        lockedBy: [
          lockedWhen(
            any(
              stage('sealed'),
              stage('released'),
              stage('releaseTalked'),
              stage('mad'),
            ),
            'Iji seals Blaidd in the evergaol',
            'Blaidd is sealed in the evergaol',
          ),
        ],
        reward: 'Blaidd’s talk at the Wailing Dunes (dialogue only, no item)',
      },
      [
        step('dunes-talk', 'Talk to Blaidd on the Wailing Dunes', {
          kind: 'talk',
          done: talk(1052389305, 'first Dunes talk'),
          evidence: 'script',
          requires: [needsGate(GATES.radahn)],
          where: { note: 'Wailing Dunes, below Redmane Castle' },
          note: 'Fetching the Fingerslayer Blade or Iji’s post-Radahn talk seals him away first.',
        }),
      ],
    ),
    detour(
      'evergaol',
      'Blaidd sealed in the Forlorn Hound Evergaol',
      {
        lockedBy: [
          lockedWhen(
            stage('mad'),
            'Blaidd turns on Ranni (Dark Moon Ring + Astel)',
            'Blaidd has turned on Ranni',
          ),
        ],
        reward: 'Blaidd’s last sane conversations (dialogue only, no item)',
      },
      [
        step('sealed-talk', 'Find Blaidd sealed in the evergaol and talk', {
          kind: 'talk',
          done: talk(1044359255, 'first sealed talk'),
          evidence: 'script',
          requires: [
            {
              cond: any(
                stage('sealed'),
                stage('released'),
                stage('releaseTalked'),
              ),
              label: 'Iji has sealed Blaidd in the evergaol',
            },
          ],
          where: { note: 'Forlorn Hound Evergaol, Limgrave' },
        }),
        step('release', 'Free Blaidd and talk to him again', {
          kind: 'talk',
          done: any(
            talk(1044359256, 'first talk after release'),
            stage('releaseTalked'),
          ),
          evidence: 'script',
          requires: [needsGate(DARRIWIL)],
          where: { note: 'Forlorn Hound Evergaol, Limgrave' },
        }),
      ],
    ),
    step('defeat-mad', 'Put down the maddened Blaidd at Ranni’s Rise', {
      kind: 'boss',
      done: all(stage('mad'), flag(3603, 'status', 'Blaidd is dead')),
      evidence: 'script',
      requires: [
        {
          cond: reached('ranni', 'dark-moon-ring'),
          label: 'Find Ranni’s Dark Moon Ring',
        },
        needsGate(GATES.astel),
      ],
      where: { grace: RANNIS_RISE },
      rewards: [
        'Royal Greatsword',
        "Blaidd's Armor",
        "Blaidd's Gauntlets",
        "Blaidd's Greaves",
      ],
    }),
  ],
);
