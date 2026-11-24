import { any, flag, has, pickup, reached, talk } from '../cond';
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

const SUMMONWATER_VILLAGE_OUTSKIRTS = 76119;
const TABLE_OF_LOST_GRACE = 71190;

const D_DEAD = flag(4043, 'status', 'D is dead');
const MET_GURRANQ = any(
  talk(1051439203, 'met Gurranq'),
  talk(1051439205, 'spoke to Gurranq'),
);

/**
 * D, Hunter of the Dead (talk block NPC319, dev name ダヴィド; status 4040–4043).
 *
 * Stage machine (`common.evs.py` `Event_4059`): 4045 met near Summonwater Village → 4046 once its
 * Tibia Mariner falls (1045390800) → 4047 at Roundtable Hold, on 4046 ∧ (talk 1045399206 "was
 * introduced to Gurranq" ∨ 11109609); OR from 4045/4046 on further progress (an Altus or 3064
 * grace, legacy 132, or having spoken to Gurranq 1051439205) → 4048 "slain by Fia", set by Fia's
 * `Event_4139` when he takes her dagger (11109625) or when the Erdtree burns, together with his
 * dead flag 4043.
 *
 * D dies by Fia's hand once he takes her dagger (`diesAfter`): only a death before that (you
 * killed him, or the Erdtree burned first) locks the questline out.
 */
export const dHunter = defineQuest(
  {
    id: 'd-hunter',
    npc: 'D, Hunter of the Dead',
    isDlc: false,
    blurb:
      'A hunter of the Golden Order who stalks those who died twice, and who trusts the Tarnished with Fia’s dagger.',
    stages: {
      limgrave: 4045,
      marinerSlain: 4046,
      roundtable: 4047,
      slainByFia: 4048,
    },
    status: { ...statusBlock(4040), diesAfter: 'give-dagger' },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC319 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_4059 (stage transitions), Event_4139 (Fia kills him)',
      'er-save-manager quest_flags_db.py "D Hunter of the Dead" (observed talk and item-lot flags)',
      'NPC Quests & Endings Guide v5 flowchart, D, Hunter of the Dead column (ordering)',
    ],
  },
  ({ stage }) => [
    detour(
      'limgrave',
      'Meet D in Limgrave',
      {
        lockedBy: [
          lockedWhen(
            any(stage('roundtable'), stage('slainByFia')),
            'D has moved to Roundtable Hold',
          ),
        ],
        reward: 'His Limgrave conversations',
      },
      [
        step('meet-limgrave', 'Meet D outside Summonwater Village', {
          kind: 'talk',
          done: any(
            talk(1044399205, 'first Limgrave talk'),
            talk(1044399207, 'met D before the Hold'),
          ),
          evidence: 'script',
          where: { grace: SUMMONWATER_VILLAGE_OUTSKIRTS },
        }),
      ],
    ),
    detour(
      'deathroot',
      'Show D a Deathroot',
      {
        lockedBy: [lockedWhen(MET_GURRANQ, 'You found Gurranq on your own')],
        reward:
          'D’s introduction to Gurranq (Bestial Sanctum marked on the map)',
      },
      [
        step(
          'show-deathroot',
          'Show D the Deathroot and agree to carry them to Gurranq',
          {
            kind: 'talk',
            done: any(
              talk(1045399206, 'introduced to Gurranq'),
              talk(1045399208, 'introduced before the Hold'),
              talk(11109606, 'Hold talk after showing the Deathroot'),
              talk(11109607, 'Hold talk after the introduction'),
            ),
            evidence: 'script',
            requires: [
              {
                cond: has(2090, 'Deathroot'),
                label:
                  'Carry a Deathroot (the Tibia Mariner at Summonwater Village drops one)',
              },
            ],
            unlocks: ['The Bestial Sanctum marked on your map'],
            where: { grace: SUMMONWATER_VILLAGE_OUTSKIRTS },
            note: 'Also possible at Roundtable Hold if he has moved there.',
          },
        ),
      ],
    ),
    step('roundtable', 'Talk to D at Roundtable Hold', {
      kind: 'talk',
      done: any(
        talk(11109605, 'first Hold talk'),
        talk(11109616, 'Hold talk before meeting Gurranq'),
        talk(11109617, 'Hold talk after meeting Gurranq'),
      ),
      evidence: 'script',
      requires: [
        {
          cond: any(stage('roundtable'), stage('slainByFia')),
          label:
            'D has moved to Roundtable Hold (show him a Deathroot, or press on into the Lands Between)',
        },
      ],
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    step('after-gurranq', 'Tell D you have met Gurranq', {
      kind: 'talk',
      done: any(
        talk(11109617, 'Hold talk after meeting Gurranq'),
        talk(11109618, 'thanked you for the Deathroot'),
      ),
      evidence: 'script',
      requires: [
        {
          cond: reached('gurranq', 'meet'),
          label: 'Meet Gurranq at the Bestial Sanctum',
        },
      ],
      unlocks: [
        'D’s shop: the Litany of Proper Death and Order’s Blade incantations',
      ],
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    detour(
      'about-rogier',
      'Ask D about Rogier',
      {
        lockedBy: [lockedWhen(D_DEAD, 'D has died')],
        reward: 'His words about Rogier',
      },
      [
        step('rogier-talk', 'Ask D about Rogier', {
          kind: 'talk',
          done: talk(11109623, 'about Rogier'),
          evidence: 'script',
          requires: [needsGate(GATES.godrick)],
          where: { grace: TABLE_OF_LOST_GRACE },
        }),
      ],
    ),
    step('give-dagger', 'Give D the Weathered Dagger from Fia', {
      kind: 'talk',
      done: talk(11109625, 'handed over the dagger'),
      evidence: 'script',
      requires: [
        {
          cond: any(
            has(8980, 'Weathered Dagger'),
            reached('fia', 'weathered-dagger'),
          ),
          label: 'Get the Weathered Dagger from Fia',
        },
      ],
      lockedBy: [lockedByGate(GATES.erdtreeBurned)],
      where: { grace: TABLE_OF_LOST_GRACE },
      reload: true,
      note: 'Burning the Erdtree also gets D killed, off-screen.',
    }),
    step(
      'loot-armor',
      'Rest, then take D’s armor from his body in the back room',
      {
        kind: 'item',
        done: pickup(400349, 'D’s armor and Bell Bearing taken'),
        evidence: 'observed',
        requires: [{ cond: D_DEAD, label: 'D has died' }],
        rewards: [
          'Twinned Helm',
          'Twinned Armor',
          'Twinned Gauntlets',
          'Twinned Greaves',
          "D's Bell Bearing",
        ],
        where: { grace: TABLE_OF_LOST_GRACE },
      },
    ),
  ],
);
