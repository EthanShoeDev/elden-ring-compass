import { all, any, boss, flag, has, not, talk } from '../cond';
import { defineGate, GATES } from '../gates';
import { defineQuest, lockedWhen, needsGate, step } from '../model';
import { irinaKilled } from './irina';

const LAKE_FACING_CLIFFS = 76200;
const LASKYAR_RUINS = 76202;
const GATE_TOWN_BRIDGE = 76222;
const BELLUM_CHURCH = 76208;
const CHURCH_OF_INHIBITION = 76240;
const FRENZIED_FLAME_PROSCRIPTION = 73504;

/** Mohg, the Omen guards the way down to the Frenzied Flame Proscription. */
const mohgTheOmen = defineGate(
  'mohg-the-omen',
  'Defeat Mohg, the Omen',
  boss(35000800, 'Mohg, the Omen'),
);

/**
 * Hyetta (talk block NPC310, shared with Irina: the game reuses Irina's character, so both
 * questlines read one status block 3380–3383 and one stage machine 3385–3397).
 *
 * Stage machine (`common.evs.py` `Event_3399`): Irina's death (3386) → 3387 at the Lake-Facing
 * Cliffs → 3388 on talk 1039409206 "gave a grape" (A) → 3389 on 1038419205 (B, Purified Ruins) →
 * 3390 "knows what the grapes are" on 1038439206 (C, Gate Town Bridge) → 3391 on 1038439209 "talked
 * after resting" → 3392 "waiting for the Frenzied Flame" on 1036499207 "gave the Fingerprint Grape"
 * (Bellum Church; the eventparam names this block under `m60_37_50`, the script reads `m60_36_49`)
 * → 3393 + status 3383 "dead" on 35009209 "last talk after touching her eye", in the Proscription.
 *
 * No `status`: the shared dead flag is also how Irina's death-by-player reads, and is the normal
 * end of this questline. Both lockouts are explicit conditions instead.
 */
export const hyetta = defineQuest(
  {
    id: 'hyetta',
    npc: 'Hyetta',
    isDlc: false,
    blurb:
      'A blind maiden in Liurnia who hungers for Shabriri Grapes and is fated to become a Finger Maiden for the Frenzied Flame.',
    stages: {
      cliffs: 3387,
      purifiedRuins: 3388,
      gateTown: 3389,
      knowsTruth: 3390,
      bellum: 3391,
      proscription: 3392,
      finished: 3393,
    },
    lockedBy: [
      lockedWhen(
        irinaKilled,
        'Kill Irina',
        'You killed Irina, so Hyetta never appears',
      ),
      lockedWhen(
        all(
          flag(3383, 'status', 'NPC310 dead'),
          not(flag(3385, 'stage', 'Irina still at the bridge')),
          not(flag(3393, 'stage', 'Hyetta’s questline finished')),
        ),
        'Kill Hyetta',
        'You killed Hyetta',
      ),
    ],
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC310 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3399 (stage transitions)',
      'er-save-manager quest_flags_db.py "Hyetta" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Hyetta column (ordering, grape locations)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Hyetta at the Lake-Facing Cliffs', {
      kind: 'talk',
      done: talk(1039409205, 'first conversation'),
      evidence: 'script',
      where: { grace: LAKE_FACING_CLIFFS },
      requires: [
        {
          cond: any(
            stage('cliffs'),
            stage('purifiedRuins'),
            stage('gateTown'),
            stage('knowsTruth'),
            stage('bellum'),
            stage('proscription'),
            stage('finished'),
          ),
          label:
            'Irina has died (take her letter; she dies once it reaches Edgar, or once you reach Liurnia)',
        },
      ],
      reload: true,
      note: 'Rest at the grace (don’t just travel there) if she isn’t standing by it.',
    }),
    step('grape-1', 'Give her a Shabriri Grape', {
      kind: 'item',
      // Not the As You Wish gesture flag (60810): a fixture character has it without ever meeting
      // Irina or Hyetta, so it has another source.
      done: talk(1039409206, 'gave the first grape'),
      evidence: 'script',
      where: { grace: LAKE_FACING_CLIFFS },
      reload: true,
      rewards: ['As You Wish'],
      note: 'Grapes: Stormveil Castle (the room behind Godrick’s throne), under the planks at the Purified Ruins, and Edgar’s drop at Revenger’s Shack.',
    }),
    step('grape-2', 'Give her a second grape west of the Purified Ruins', {
      kind: 'item',
      done: talk(1038419205, 'gave the second grape'),
      evidence: 'script',
      where: { grace: LASKYAR_RUINS, note: 'West of the Purified Ruins' },
      reload: true,
    }),
    step('grape-3', 'Give her a third grape north of the Gate Town Bridge', {
      kind: 'item',
      done: talk(1038439205, 'gave the third grape'),
      evidence: 'script',
      where: { grace: GATE_TOWN_BRIDGE },
    }),
    step('tell-truth', 'Tell her what the grapes really are', {
      kind: 'talk',
      done: talk(1038439206, 'told her they are eyes'),
      evidence: 'script',
      where: { grace: GATE_TOWN_BRIDGE },
      note: 'Required: keep talking until she has nothing left to say, then rest.',
    }),
    step(
      'finger-maiden',
      'Talk to her again: she will become a Finger Maiden',
      {
        kind: 'talk',
        done: talk(1038439209, 'talked after resting'),
        evidence: 'script',
        where: { grace: GATE_TOWN_BRIDGE },
        reload: true,
      },
    ),
    step('bellum', 'Find her at Bellum Church', {
      kind: 'talk',
      done: talk(1036499205, 'asked for a Fingerprint Grape'),
      evidence: 'observed',
      where: { grace: BELLUM_CHURCH },
    }),
    step(
      'fingerprint-grape',
      'Defeat Festering Fingerprint Vyke near the Church of Inhibition for a Fingerprint Grape',
      {
        kind: 'item',
        // Holding the grape alone proves nothing about Hyetta (Vyke drops it either way), so
        // only count it once she has asked for it.
        done: all(
          has(8126, 'Fingerprint Grape'),
          talk(1036499205, 'she asked for one'),
        ),
        evidence: 'script',
        where: { grace: CHURCH_OF_INHIBITION },
      },
    ),
    step('give-fingerprint', 'Give her the Fingerprint Grape', {
      kind: 'item',
      done: talk(1036499207, 'gave the Fingerprint Grape'),
      evidence: 'script',
      where: { grace: BELLUM_CHURCH },
      reload: true,
    }),
    step('proscription', 'Talk to her at the Frenzied Flame Proscription', {
      kind: 'talk',
      done: talk(35009205, 'first talk in the Proscription'),
      evidence: 'script',
      requires: [needsGate(mohgTheOmen)],
      where: { grace: FRENZIED_FLAME_PROSCRIPTION },
      note: 'She leads you to the Three Fingers’ door.',
    }),
    step('after-flame', 'Take the Three Fingers’ flame, then talk to her', {
      kind: 'talk',
      done: talk(35009206, 'first talk after the flame'),
      evidence: 'script',
      requires: [needsGate(GATES.frenziedFlame)],
      where: { grace: FRENZIED_FLAME_PROSCRIPTION },
      unlocks: ['The Lord of Frenzied Flame ending'],
      note: 'To reach the Three Fingers, remove all your armor and open the sealed door. Taking their flame overrides every other ending unless you later cure it with Miquella’s Needle.',
    }),
    step('touch-eye', 'Touch her eye with the flame', {
      kind: 'action',
      done: any(
        talk(35009207, 'chose to touch her eye'),
        talk(35009208, 'talked after touching'),
      ),
      evidence: 'observed',
      where: { grace: FRENZIED_FLAME_PROSCRIPTION },
    }),
    step('farewell', 'Hear her last words, then take the Frenzied Flame Seal', {
      kind: 'talk',
      done: any(talk(35009209, 'last conversation'), stage('finished')),
      evidence: 'script',
      where: { grace: FRENZIED_FLAME_PROSCRIPTION },
      rewards: ['Frenzied Flame Seal', 'Frenzyflame Stone'],
    }),
  ],
);
