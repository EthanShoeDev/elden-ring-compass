import { all, any, flag, pickup, talk, world } from '../cond';
import { defineGate } from '../gates';
import {
  defineQuest,
  detour,
  lockedByGate,
  lockedWhen,
  step,
  statusBlock,
} from '../model';

const THE_FIRST_STEP = 76101;
const TABLE_OF_LOST_GRACE = 71190;
const CHURCH_OF_INHIBITION = 76240;
const DYNASTY_MAUSOLEUM_MIDPOINT = 71253;

/**
 * Flag 181 `大ルーン所持数チェック：1個以上` ("holds at least one Great Rune"). `Event_3199` moves
 * Varré to his post-Great-Rune state on it, which drops his Roundtable conversation for good.
 */
/** Any of his First Step conversations (1042369202 is set by the first one, per the flag log). */
const metVarre = any(
  talk(1042369202, 'first talk (map point unlocked)'),
  talk(1042369206, 'first conversation played'),
  talk(1042369235, 'post-Great-Rune talk played'),
);

const greatRune = defineGate(
  'great-rune',
  'Obtain a Great Rune',
  world(181, 'holds a Great Rune'),
);

/**
 * White Mask Varré (talk block NPC301, `EFID_Talk_NPC301`; status 3180 `戦場医師`).
 *
 * Stage machine (`common.evs.py` `Event_3199`, stage names from the eventparam block):
 * 3185 initial → 3187 "back from the Roundtable" on flag 105 (Roundtable reached) → 3191 "has a
 * Great Rune" on flag 181 → 3188 "has seen the Two Fingers" on Enia's talk flag 11109358 (moves him
 * to Rose Church) → 3189 "won the invasions" on 1035449235 (beat other players with the Festering
 * Bloody Finger) or 1035449207 (finger received) ∧ 7612 (Magnus the Beast Claw pseudo-invasion
 * cleared, `m60_40_53`) → 3190 "final trial done" on pickup 400033 (the favor soaked in maiden
 * blood) → 3192 "battle in the underground" on 1035449226 (Pureblood Knight's Medal received) →
 * 3193 "beaten underground" on 7601 (his Mohgwyn invasion cleared). His second talk there
 * (12059166) sets him dead (3183): that's the questline's normal end, not a lockout.
 *
 * His bloody message near the First Step (`m60_42_36` Event_1042363701) only shows in stages
 * 3188–3190, so the Bravo! gesture (60826) is lost once he hands over the medal.
 */
export const varre = defineQuest(
  {
    id: 'varre',
    npc: 'White Mask Varré',
    isDlc: false,
    blurb:
      'A Bloody Finger surgeon at the First Step who recruits you into the Lord of Blood’s service.',
    status: { ...statusBlock(3180), diesAfter: 'final-words' },
    stages: {
      initial: 3185,
      backFromRoundtable: 3187,
      seenTwoFingers: 3188,
      wonInvasions: 3189,
      soakedFavor: 3190,
      greatRune: 3191,
      mohgwyn: 3192,
      beatenAtMohgwyn: 3193,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC301 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3199 (stage transitions); m60_42_36 (message), m12_05 (invasion, final talk)',
      'er-save-manager quest_flags_db.py "White Mask Varre" (observed flags)',
      'NPC Quests & Endings Guide v5 flowchart, Varré column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Varré by the First Step', {
      kind: 'talk',
      done: metVarre,
      evidence: 'script',
      where: { grace: THE_FIRST_STEP },
      note: 'Skippable: he moves to Rose Church once you see the Two Fingers, met or not.',
    }),
    detour(
      'roundtable-chat',
      'Talk to Varré after reaching Roundtable Hold',
      {
        lockedBy: [lockedByGate(greatRune)],
        reward: 'His conversation about joining the Roundtable',
      },
      [
        step(
          'roundtable-chat-talk',
          'Tell Varré whether you mean to join the Roundtable',
          {
            kind: 'talk',
            done: any(
              talk(1042369225, 'said no'),
              talk(1042369226, 'said yes'),
            ),
            evidence: 'script',
            where: { grace: THE_FIRST_STEP },
            requires: [
              {
                cond: world(105, 'Roundtable Hold reached'),
                label: 'Reach Roundtable Hold',
              },
            ],
          },
        ),
      ],
    ),
    step('two-fingers', 'With a Great Rune, ask Enia to see the Two Fingers', {
      kind: 'talk',
      // Enia's flag alone also fires for players who never met Varré; his own stage 3188 (he has
      // moved to Rose Church) does not.
      done: any(
        all(talk(11109358, 'Enia: audience with the Two Fingers'), metVarre),
        stage('seenTwoFingers'),
      ),
      evidence: 'script',
      where: { grace: TABLE_OF_LOST_GRACE },
      requires: [{ cond: greatRune.cond, label: greatRune.label }],
      reload: true,
      note: 'Varré then leaves the First Step for Rose Church in Liurnia.',
    }),
    step('rose-church', 'Talk to Varré at Rose Church', {
      kind: 'talk',
      done: any(
        talk(1035449205, 'praised the Two Fingers'),
        talk(1035449206, 'voiced doubts'),
      ),
      evidence: 'script',
      where: { note: 'Rose Church, southwestern Liurnia' },
    }),
    detour(
      'bravo',
      'Read Varré’s message near the First Step',
      {
        lockedBy: [
          lockedWhen(
            any(talk(1035449226), stage('mohgwyn'), stage('beatenAtMohgwyn')),
            'Accept the Pureblood Knight’s Medal from Varré',
            'Varré’s message is gone: you took his medal',
          ),
        ],
        reward: 'The Bravo! gesture',
      },
      [
        step(
          'bravo-message',
          'Find his bloody message where he first stood and take the gesture',
          {
            kind: 'item',
            // The message's item lot (400035) awards the gesture (`m60_42_36` Event_1042363703); the
            // gesture flag itself carries over into NG+, so it isn't evidence.
            done: pickup(400035, 'Varré’s message read'),
            evidence: 'script',
            rewards: ['Bravo!'],
            where: { grace: THE_FIRST_STEP },
            requires: [
              {
                cond: any(
                  stage('seenTwoFingers'),
                  stage('wonInvasions'),
                  stage('soakedFavor'),
                ),
                label: 'Varré has moved to Rose Church',
              },
            ],
          },
        ),
      ],
    ),
    step('festering-finger', 'Accept the Festering Bloody Finger', {
      kind: 'talk',
      done: talk(1035449207, 'invasion item received'),
      evidence: 'script',
      where: { note: 'Rose Church' },
      rewards: ['Festering Bloody Finger'],
    }),
    step(
      'trial',
      'Prove yourself: win three invasions, or defeat Magnus the Beast Claw at Writheblood Ruins',
      {
        kind: 'action',
        done: any(
          talk(1035449235, 'won invasions against other players'),
          flag(7612, 'boss', 'Magnus the Beast Claw (pseudo-invasion)'),
        ),
        evidence: 'script',
        note: 'Magnus’s invasion sign at Writheblood Ruins is the offline route.',
      },
    ),
    step('favor', 'Report back and accept the Lord of Blood’s Favor', {
      kind: 'talk',
      done: any(
        talk(1035449216, 'favor (white cloth) received'),
        pickup(400031, 'Lord of Blood’s Favor received'),
      ),
      evidence: 'script',
      where: { note: 'Rose Church' },
      rewards: ["Lord of Blood's Favor"],
      note: 'Refusing once is fine: rest and he asks again.',
    }),
    step(
      'soak-favor',
      'Soak the favor in a maiden’s blood (Church of Inhibition or Chapel of Anticipation)',
      {
        kind: 'action',
        done: pickup(400033, 'soaked Lord of Blood’s Favor'),
        evidence: 'script',
        where: { grace: CHURCH_OF_INHIBITION },
      },
    ),
    step('medal', 'Bring the soaked favor back: Pureblood Knight’s Medal', {
      kind: 'talk',
      done: talk(1035449226, 'medal received'),
      evidence: 'script',
      where: { note: 'Rose Church' },
      rewards: ['Bloody Finger', "Pureblood Knight's Medal"],
    }),
    step(
      'mohgwyn-invasion',
      'Use the medal, then take Varré’s red sign near Dynasty Mausoleum Midpoint and defeat him',
      {
        kind: 'boss',
        done: flag(7601, 'boss', 'Varré’s invasion cleared'),
        evidence: 'script',
        where: { grace: DYNASTY_MAUSOLEUM_MIDPOINT },
        rewards: ['Rune Arc', 'Furlcalling Finger Remedy'],
      },
    ),
    step('final-words', 'Talk to the dying Varré by his sign, twice', {
      kind: 'talk',
      done: talk(12059166, 'second talk after his defeat'),
      evidence: 'script',
      where: { grace: DYNASTY_MAUSOLEUM_MIDPOINT },
      rewards: ["Varré's Bouquet", 'Festering Bloody Finger'],
      note: 'He dies and leaves his belongings by the sign.',
    }),
  ],
);
