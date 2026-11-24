import { any, has, pickup, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const ROAD_TO_THE_MANOR = 76213;
const RANNIS_RISE = 76228;

/**
 * War Counselor Iji (talk block NPC224 `爺や`, status 3760).
 *
 * Stage machine (`common.evs.py` `Event_3779`): 3765 initial → 3766 on joining Ranni (1034509410)
 * → 3767 when she withdraws to rest (1034509416; the eventparam name "after Radahn" is stale) →
 * 3768 once he hears of Blaidd's end (1034499242), which also sets his own death flag 3763: he
 * dies at the next load, so his death *is* the end of the questline.
 *
 * Talk flags: `EFID_Talk_NPC224` names 1034499205 (first talk) and 1034509355 (spirit's first
 * talk). In the post-Radahn block (1034499238–243) the names sit one off from what the community
 * flag log recorded; the log agrees with `Event_3779` (242 is the talk that kills him), so those
 * steps follow the log.
 */
export const iji = defineQuest(
  {
    id: 'iji',
    npc: 'War Counselor Iji',
    isDlc: false,
    blurb:
      'A giant blacksmith on the road to Caria Manor, sworn to Ranni and fond of Blaidd.',
    // He dies by the script once told of Blaidd's end (Event_3779 sets 3763 with 3768).
    status: { ...statusBlock(3760), diesAfter: 'blaidds-end' },
    stages: {
      initial: 3765,
      joinedRanni: 3766,
      ranniAsleep: 3767,
      blaiddDead: 3768,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC224 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3779 (stage transitions)',
      'er-save-manager quest_flags_db.py "Iji" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Iji column (ordering, missables)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Iji by the Road to the Manor', {
      kind: 'talk',
      done: talk(1034499205, 'first talk played'),
      evidence: 'script',
      where: { grace: ROAD_TO_THE_MANOR },
      unlocks: ['Iji’s shop: Somber Smithing Stones, and weapon upgrades'],
    }),
    step('spirit', 'Talk to Iji’s spirit at Ranni’s Rise', {
      kind: 'talk',
      done: any(
        talk(1034509355, 'spirit’s first talk'),
        talk(1034509358, 'spirit’s apology'),
      ),
      evidence: 'script',
      requires: [
        { cond: reached('ranni', 'join'), label: 'Enter Ranni’s service' },
      ],
      where: { grace: RANNIS_RISE },
    }),
    step('nokron-talk', 'Back on the road, ask Iji about Nokron and Blaidd', {
      kind: 'talk',
      done: talk(1034499223, 'asked about Blaidd'),
      evidence: 'observed',
      requires: [
        {
          cond: reached('ranni', 'slumber'),
          label: 'Ranni has withdrawn to rest',
        },
      ],
      where: { grace: ROAD_TO_THE_MANOR },
    }),
    detour(
      'sealed-blaidd',
      'Ask Iji why Blaidd is sealed away',
      {
        lockedBy: [
          lockedWhen(
            reached('blaidd', 'defeat-mad'),
            'Defeat the maddened Blaidd',
            'Blaidd is dead',
          ),
        ],
        reward:
          'Iji’s account of why he sealed Blaidd (dialogue only, no item)',
      },
      [
        step('why-evergaol', 'Ask Iji why Blaidd is in the evergaol', {
          kind: 'talk',
          done: talk(1034499241, 'asked about the evergaol'),
          evidence: 'observed',
          requires: [
            needsGate(GATES.radahn),
            {
              cond: reached('blaidd', 'sealed-talk'),
              label: 'Find Blaidd sealed in the Forlorn Hound Evergaol',
            },
          ],
          where: { grace: ROAD_TO_THE_MANOR },
        }),
      ],
    ),
    step('blaidds-end', 'Tell Iji that Blaidd is gone', {
      kind: 'talk',
      done: any(talk(1034499242, 'told of Blaidd’s end'), stage('blaiddDead')),
      evidence: 'script',
      requires: [
        {
          cond: reached('blaidd', 'defeat-mad'),
          label: 'Defeat the maddened Blaidd',
        },
      ],
      where: { grace: ROAD_TO_THE_MANOR },
      reload: true,
      note: 'Iji dies once you rest or reload afterwards.',
    }),
    detour(
      'iji-remains',
      'Collect what Iji left behind',
      { reward: "Iji's Bell Bearing and Iji's Mirrorhelm" },
      [
        step('loot', 'Take Iji’s Bell Bearing and Mirrorhelm from his body', {
          kind: 'item',
          done: any(
            pickup(400240, 'Iji’s Bell Bearing picked up'),
            has(8940, 'Iji’s Bell Bearing'),
          ),
          evidence: 'observed',
          where: { grace: ROAD_TO_THE_MANOR },
          rewards: ["Iji's Bell Bearing", "Iji's Mirrorhelm"],
        }),
      ],
    ),
  ],
);
