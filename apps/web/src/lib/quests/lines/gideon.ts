import { any, reached, talk, world } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByDecision,
  lockedByGate,
  needsGate,
  statusBlock,
  step,
} from '../model';

const TABLE_OF_LOST_GRACE = 71190;

/**
 * Sir Gideon Ofnir, the All-Knowing (NPC324; status block 3960, `キャラ状態フラグ_324_百智卿`).
 *
 * The event-param dump has no `EFID_Talk_NPC324` block, so his talk flags (11109650–11109699,
 * 11109550–11109556) are only known from the er-save-manager log (`observed`), except those his
 * stage machine reads. Stage machine (`common.evs.py` `Event_3979`): 3965 initial → 3966 once he
 * has advised you (11109659) → 3967 on (seen the Two Fingers, Enia's 11109358 ∧ his room talk
 * 11109660) ∨ holding a Great Rune (181) ∧ 11109659 ∨ the Erdtree burning (110) → 3968 on
 * Maliketh's defeat (9116), when he leaves the Hold to face you at the Erdtree.
 *
 * So all of his Roundtable dialogue and rewards are closed by the Maliketh gate. The duel itself
 * is a mandatory story boss, i.e. world progression, so it isn't a step here.
 */
export const gideon = defineQuest(
  {
    id: 'gideon',
    npc: 'Gideon Ofnir',
    isDlc: false,
    blurb:
      'The Roundtable’s all-knowing spymaster, who trades lore for your discoveries.',
    status: statusBlock(3960),
    stages: {
      initial: 3965,
      advised: 3966,
      informed: 3967,
      leftHold: 3968,
    },
    sources: [
      'soulsmods elden-ring-eventparam キャラ状態フラグ_324_百智卿 (status block), 181/182 (Great Rune count)',
      'soulstruct common.evs.py Event_3979 (stage transitions)',
      'er-save-manager quest_flags_db.py "Gideon Ofnir" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Gideon Ofnir column (ordering)',
    ],
  },
  () => [
    step(
      'welcome',
      'Hear Gideon’s welcome on your first visit to Roundtable Hold',
      {
        kind: 'talk',
        done: any(
          talk(11109658, 'welcome played'),
          talk(11109659, 'advice played'),
        ),
        evidence: 'script',
        lockedBy: [lockedByGate(GATES.maliketh)],
        where: { grace: TABLE_OF_LOST_GRACE },
      },
    ),
    step(
      'his-room',
      'Talk to Gideon in his room: he asks you to seek the Great Runes',
      {
        kind: 'talk',
        done: any(
          talk(11109661, 'first room talk'),
          talk(11109660, 'second room talk'),
        ),
        evidence: 'script',
        lockedBy: [lockedByGate(GATES.maliketh)],
        where: { grace: TABLE_OF_LOST_GRACE },
      },
    ),
    step('shardbearers', 'Ask him about the other shardbearers', {
      kind: 'talk',
      done: any(
        talk(11109662, 'post-Two-Fingers talk'),
        talk(11109664, 'shardbearer menu opened'),
      ),
      evidence: 'observed',
      requires: [
        {
          cond: talk(11109358, 'saw the Two Fingers'),
          label: 'Claim a Great Rune and have Enia show you the Two Fingers',
        },
      ],
      lockedBy: [lockedByGate(GATES.maliketh)],
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    detour(
      'nepheli',
      'Gideon on Nepheli',
      {
        lockedBy: [lockedByGate(GATES.maliketh)],
        reward:
          'His dialogue about his adopted daughter (dialogue only, no item)',
      },
      [
        step(
          'about-nepheli',
          'Ask Gideon about Nepheli after meeting her in the Hold',
          {
            kind: 'talk',
            done: talk(11109676, '“About Nepheli” chosen'),
            evidence: 'observed',
            requires: [
              {
                cond: reached('nepheli', 'arsenal-charm'),
                label: 'Meet Nepheli at Roundtable Hold',
              },
            ],
            where: { grace: TABLE_OF_LOST_GRACE },
          },
        ),
      ],
    ),
    step('second-rune', 'Claim a second Great Rune and report to Gideon', {
      kind: 'talk',
      done: talk(11109665, 'second Great Rune talk'),
      evidence: 'observed',
      requires: [
        {
          cond: world(182, 'holds two or more Great Runes'),
          label: 'Hold two Great Runes',
        },
      ],
      lockedBy: [lockedByGate(GATES.maliketh)],
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    detour(
      'seluvis-potion',
      'Seluvis’s potion',
      {
        lockedBy: [
          lockedByGate(GATES.maliketh),
          // There is only one potion.
          lockedByDecision('nepheli', 'puppet'),
          lockedByDecision('dung-eater', 'seluvis-potion'),
        ],
        reward: 'Gideon’s dialogue about Seluvis (dialogue only, no item)',
      },
      [
        step('give-potion', 'Hand Seluvis’s potion to Gideon', {
          kind: 'talk',
          done: talk(11109553, 'gave him the potion'),
          evidence: 'observed',
          requires: [
            {
              cond: reached('seluvis', 'potion'),
              label: 'Accept Seluvis’s Potion',
            },
          ],
          where: { grace: TABLE_OF_LOST_GRACE },
        }),
      ],
    ),
    detour(
      'ensha',
      'Gideon on Ensha and the secret medallion',
      {
        lockedBy: [lockedByGate(GATES.maliketh)],
        reward: 'His lead on the Albinauric woman (dialogue only, no item)',
      },
      [
        step('about-ensha', 'After Ensha ambushes you, ask Gideon about him', {
          kind: 'talk',
          done: any(
            talk(11109680, 'first “About Ensha”'),
            talk(11109681, 'second “About Ensha”'),
          ),
          evidence: 'observed',
          where: { grace: TABLE_OF_LOST_GRACE },
        }),
      ],
    ),
    detour(
      'medallion',
      'The Haligtree Secret Medallion',
      {
        lockedBy: [lockedByGate(GATES.maliketh)],
        reward: 'Black Flame’s Protection',
      },
      [
        step(
          'use-medallion',
          'Use the reunited medallion at the Grand Lift of Rold, then tell Gideon',
          {
            kind: 'talk',
            done: talk(11109694, '“Using the secret medallions” chosen'),
            evidence: 'observed',
            requires: [needsGate(GATES.morgott)],
            where: { grace: TABLE_OF_LOST_GRACE },
            rewards: ["Black Flame's Protection"],
          },
        ),
      ],
    ),
    detour(
      'haligtree',
      'The Haligtree’s roots',
      {
        lockedBy: [lockedByGate(GATES.maliketh)],
        reward: 'Lord’s Divine Fortification',
      },
      [
        step(
          'haligtree-roots',
          'Defeat Malenia, then ask Gideon about the Haligtree roots',
          {
            kind: 'talk',
            done: talk(11109696, '“About the Haligtree roots” chosen'),
            evidence: 'observed',
            requires: [needsGate(GATES.malenia)],
            where: { grace: TABLE_OF_LOST_GRACE },
            rewards: ["Lord's Divine Fortification"],
          },
        ),
      ],
    ),
    detour(
      'cocoon',
      'The Lord of Blood’s cocoon',
      {
        lockedBy: [lockedByGate(GATES.maliketh)],
        reward: 'Law of Causality',
      },
      [
        step('mohg-cocoon', 'Defeat Mohg, then ask Gideon about the cocoon', {
          kind: 'talk',
          done: talk(11109550, '“About the Lord of Blood’s cocoon” chosen'),
          evidence: 'observed',
          requires: [needsGate(GATES.mohg)],
          where: { grace: TABLE_OF_LOST_GRACE },
          rewards: ['Law of Causality'],
        }),
      ],
    ),
    detour(
      'mausoleum',
      'The Mohgwyn Dynasty Mausoleum',
      {
        lockedBy: [lockedByGate(GATES.maliketh)],
        reward: "Fevor's Cookbook [3]",
      },
      [
        step(
          'mausoleum-news',
          'Reach the Mohgwyn Dynasty Mausoleum, then tell Gideon',
          {
            kind: 'talk',
            flagTodo:
              'Reach the Mohgwyn Dynasty Mausoleum, then choose its dialogue option at Gideon; the talk flag that flips (11109697–11109699 are candidates)',
            where: { grace: TABLE_OF_LOST_GRACE },
            rewards: ["Fevor's Cookbook [3]"],
          },
        ),
      ],
    ),
    step('after-burning', 'Talk to Gideon once the Erdtree has burned', {
      kind: 'talk',
      done: any(
        talk(11109666, 'post-burning talk'),
        talk(11109690, 'post-burning “Talk”'),
      ),
      evidence: 'assumed',
      requires: [needsGate(GATES.erdtreeBurned)],
      lockedBy: [lockedByGate(GATES.maliketh)],
      where: { grace: TABLE_OF_LOST_GRACE },
      note: 'After Maliketh falls he leaves the Hold and waits for you at the Erdtree.',
    }),
  ],
);
