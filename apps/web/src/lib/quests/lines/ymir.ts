import { all, any, boss, flag, pickup } from '../cond';
import { defineQuest, detour, lockedWhen, statusBlock, step } from '../model';

const CATHEDRAL_OF_MANUS_METYR = 76906;
const FINGER_RUINS_OF_RHIA = 76834;

/** The two sacred bells. Each also awards its item lot (`m61_50_40_00` / `m61_53_46_00`). */
const RHIA_BELL = flag(
  2050400600,
  'pickup',
  'Rhia bell rung (Crimson Seed Talisman +1)',
);
const DHEO_BELL = flag(
  2053460600,
  'pickup',
  'Dheo bell rung (Cerulean Seed Talisman +1)',
);

/**
 * Count Ymir, High Priest (event-state block 4320) at the Cathedral of Manus Metyr.
 *
 * Stage machine (`common.evs.py` Event_4339): 4325 at his throne → 4326 once Metyr is dead
 * (2051459207, set by `m25_00_00_00` Event_25000701 on Metyr's defeat 25000800); his boss fight
 * sets 4322 (hostile) from 4326. A death or hostility before his boss (2051450800) is reset to
 * 4320, so he can't be killed early — no status-based lockout. Both stages are world-driven, so
 * the steps use item-lot pickups instead.
 *
 * Bells (`m61_50_40_00` Event_2050402600 / `m61_53_46_00` Event_2053462600): ringing needs the
 * Hole-Laden Necklace (good 2008008) and sets 2050400600 (Finger Ruins of Rhia, awards lot
 * 2050400000) / 2053460600 (Finger Ruins of Dheo, lot 2053460600). Either can be rung first, so
 * the steps read "either" / "both". Event_9440 sets 9440 once both rang.
 *
 * Rewards are ItemLotParam_map `getItemFlagId`s (read from regulation.bin): 400660 Hole-Laden
 * Necklace + Ruins Map (lot 106600/106601), 400661 Ruins Map (2nd) + Beloved Stardust, 400662
 * Ruins Map (3rd), 400664 Ymir's Bell Bearing + Maternal Staff + High Priest set (awarded by
 * Event_4857 on his defeat), 400666 Cherishing Fingers, 400672 Claws of Night (Anna's invasion,
 * `m61_51_45_00` CommonFunc_90005774). The throne switch (Event_2051450706) is only readable while
 * Metyr is alive and its flag is cleared on every load, so it isn't evidence.
 */
export const ymir = defineQuest(
  {
    id: 'ymir',
    npc: 'Count Ymir',
    isDlc: true,
    blurb:
      'The High Priest of the Cathedral of Manus Metyr, who sends you to ring the sacred bells of the Finger Ruins.',
    // He turns permanently hostile (4322) for his boss fight once Metyr is dead.
    status: { ...statusBlock(4320), diesAfter: 'metyr' },
    stages: {
      throne: 4325,
      metyrDead: 4326,
    },
    sources: [
      'soulstruct common.evs.py Event_4339 (stage machine), Event_9440, Event_4857 (bell bearing)',
      'soulstruct m61_51_45_00 (cathedral: Ymir, Jolán, Anna invasion, throne switch)',
      'soulstruct m61_50_40_00 / m61_53_46_00 (sacred bells), m25_00_00_00 (Metyr)',
      'regulation.bin ItemLotParam_map getItemFlagId (reward pickup flags)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Count Ymir column (ordering)',
      'Fextralife Count Ymir page (step detail, reworded)',
    ],
  },
  () => [
    step(
      'meet',
      'Meet Count Ymir in the Cathedral of Manus Metyr: the Hole-Laden Necklace and the first Ruins Map',
      {
        kind: 'talk',
        done: pickup(400660, 'Hole-Laden Necklace and Ruins Map received'),
        evidence: 'script',
        rewards: ['Hole-Laden Necklace', 'Ruins Map'],
        unlocks: ['Ymir’s shop (sorceries)'],
        where: { grace: CATHEDRAL_OF_MANUS_METYR },
      },
    ),
    step(
      'first-bell',
      'Ring the sacred bell at the Finger Ruins of Rhia with the necklace',
      {
        kind: 'action',
        done: any(RHIA_BELL, DHEO_BELL),
        evidence: 'script',
        rewards: ['Crimson Seed Talisman +1'],
        where: { grace: FINGER_RUINS_OF_RHIA },
        note: 'Ringing the Dheo bell first also counts: Ymir hands out the next map either way.',
      },
    ),
    detour(
      'ask-about-jolan',
      'Ask Ymir about Jolán',
      {
        lockedBy: [
          lockedWhen(
            pickup(400662),
            'Take the third Ruins Map from Ymir',
            'Ymir has handed over the third Ruins Map',
          ),
        ],
        reward: 'Ymir’s dialogue about Jolán',
      },
      [
        step('jolan-talk', 'Talk to Ymir to learn more about Jolán', {
          kind: 'talk',
          where: { grace: CATHEDRAL_OF_MANUS_METYR },
          flagTodo:
            'after ringing the first bell, pick Ymir’s dialogue about Jolán; the flag that flips',
        }),
      ],
    ),
    step(
      'second-map',
      'Talk to Ymir: the second Ruins Map and Beloved Stardust',
      {
        kind: 'talk',
        done: pickup(400661, 'Ruins Map (2nd) and Beloved Stardust received'),
        evidence: 'script',
        rewards: ['Ruins Map (2nd)', 'Beloved Stardust'],
        where: { grace: CATHEDRAL_OF_MANUS_METYR },
        reload: true,
      },
    ),
    detour(
      'graveyard',
      'Ymir in the western graveyard',
      {
        lockedBy: [
          lockedWhen(
            all(RHIA_BELL, DHEO_BELL),
            'Ring both sacred bells',
            'Both sacred bells have been rung',
          ),
        ],
        reward: 'Ymir’s graveyard conversation',
      },
      [
        step(
          'graveyard-talk',
          'Hear Ymir speaking in the cathedral’s western graveyard, then talk to him',
          {
            kind: 'talk',
            where: { grace: CATHEDRAL_OF_MANUS_METYR },
            flagTodo:
              'with the second map in hand, rest until Ymir stands at the western graveyard and talk to him; the flag that flips',
          },
        ),
      ],
    ),
    step(
      'second-bell',
      'Ring the sacred bell at the Finger Ruins of Dheo in the Hinterland',
      {
        kind: 'action',
        done: all(RHIA_BELL, DHEO_BELL),
        evidence: 'script',
        rewards: ['Cerulean Seed Talisman +1'],
        where: {
          note: 'Finger Ruins of Dheo, Hinterland (past the Shadow Keep’s back gate)',
        },
      },
    ),
    step('third-map', 'Talk to Ymir: the third Ruins Map', {
      kind: 'talk',
      done: pickup(400662, 'Ruins Map (3rd) received'),
      evidence: 'script',
      rewards: ['Ruins Map (3rd)'],
      where: { grace: CATHEDRAL_OF_MANUS_METYR },
      reload: true,
      note: 'Rest afterwards: Ymir leaves his throne.',
    }),
    step(
      'empty-throne',
      'Examine Ymir’s empty throne and climb down to the Finger Ruins of Miyr',
      {
        kind: 'action',
        where: { grace: CATHEDRAL_OF_MANUS_METYR },
        note: 'Leaves no saved trace (the throne switch flag resets on load). Confirmed by the next steps.',
      },
    ),
    step(
      'anna',
      'Defeat Swordhand of Night Anna’s invasion in the Finger Ruins of Miyr: Claws of Night',
      {
        kind: 'boss',
        done: pickup(400672, 'Claws of Night received'),
        evidence: 'script',
        rewards: ['Claws of Night'],
        where: { note: 'Finger Ruins of Miyr, below the cathedral' },
        note: 'Pulling the switch under the throne earlier brings her invasion to the cathedral instead.',
      },
    ),
    step('metyr', 'Ring the bell in Miyr and defeat Metyr, Mother of Fingers', {
      kind: 'boss',
      done: boss(25000800, 'Metyr, Mother of Fingers'),
      evidence: 'script',
      rewards: ['Remembrance of the Mother of Fingers'],
      where: {
        note: 'Finger Birthing Grounds, through the hanging bell in Miyr',
      },
    }),
    step(
      'ymir-boss',
      'Examine the throne again: beat Jolán’s invasion, then Count Ymir, Mother of Fingers',
      {
        kind: 'boss',
        done: any(
          boss(2051450800, 'Count Ymir, Mother of Fingers'),
          pickup(400664, 'Ymir’s Bell Bearing received'),
        ),
        evidence: 'script',
        rewards: [
          "Ymir's Bell Bearing",
          'Maternal Staff',
          'High Priest Hat',
          'High Priest Robe',
          'High Priest Gloves',
          'High Priest Undergarments',
        ],
        where: { grace: CATHEDRAL_OF_MANUS_METYR },
      },
    ),
    step(
      'cherishing-fingers',
      'Pick up the Cherishing Fingers sorcery in the cathedral’s western graveyard',
      {
        kind: 'item',
        done: pickup(400666, 'Cherishing Fingers picked up'),
        evidence: 'script',
        rewards: ['Cherishing Fingers'],
        where: { grace: CATHEDRAL_OF_MANUS_METYR },
      },
    ),
  ],
);
