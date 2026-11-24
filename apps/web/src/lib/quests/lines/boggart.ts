import { any, has, pickup, reached, talk } from '../cond';
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

const BOILPRAWN_SHACK = 76216;
const RUIN_STREWN_PRECIPICE = 73901;
const CAPITAL_RAMPART = 76314;

/**
 * Blackguard Big Boggart (talk block NPC331, dev name ならず者; status 4140).
 *
 * Stage machine (`common.evs.py` `Event_4159`): 4145 at the Boilprawn Shack → 4146 "reunited as
 * the crab seller" at the Leyndell outer moat, on talk 1036439213 "bought prawns" ∧ an Altus grace
 * lit (3063) ∧ (the Dung Eater hasn't invaded yet 35009316 ∨ his invasion was beaten 1045520180)
 * → 4147 "killed by the Dung Eater", on talk 1044529259 "about the Dung Eater ③". His map event
 * (`m60_44_52` ~line 267) then sets the dead flag 4143 after his second dying talk 1044529271.
 */
export const boggart = defineQuest(
  {
    id: 'boggart',
    npc: 'Blackguard Big Boggart',
    isDlc: false,
    blurb:
      'A hulking ex-convict who boils prawns in Liurnia, and later crab by the capital’s moat.',
    // The Dung Eater kills him once his dying words have played (dead 4143).
    status: { ...statusBlock(4140), diesAfter: 'dying' },
    stages: {
      liurnia: 4145,
      moat: 4146,
      killedByDungEater: 4147,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC331 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_4159 (stage transitions), m60_44_52_00.evs.py (his death)',
      'er-save-manager quest_flags_db.py "Dung Eater" (observed loot flags)',
      'NPC Quests & Endings Guide v5 flowchart, Blackguard Big Boggart column (ordering)',
      'Fextralife Blackguard Big Boggart page (moat timing, missable notes)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Boggart at the Boilprawn Shack', {
      kind: 'talk',
      done: talk(1036439202, 'his map marker unlocked'),
      evidence: 'assumed',
      unlocks: ['Boggart’s shop: Boiled Prawn'],
      where: { grace: BOILPRAWN_SHACK },
    }),
    detour(
      'rya-necklace',
      'Buy back Rya’s necklace',
      {
        lockedBy: [
          lockedWhen(
            any(stage('moat'), stage('killedByDungEater')),
            'Boggart has left Liurnia',
          ),
        ],
        reward: 'Rya’s Necklace (for Rya’s questline)',
      },
      [
        step('buy-necklace', 'Buy Rya’s Necklace from him', {
          kind: 'item',
          done: any(
            talk(1036439210, 'bought the necklace'),
            has(8136, 'Rya’s Necklace'),
          ),
          evidence: 'script',
          rewards: ["Rya's Necklace"],
          where: { grace: BOILPRAWN_SHACK },
          note: 'Only offered once you’ve met Rya.',
        }),
      ],
    ),
    step('buy-prawns', 'Buy Boiled Prawns from him', {
      kind: 'action',
      done: talk(1036439213, 'bought prawns'),
      evidence: 'script',
      rewards: ['Boiled Prawn'],
      where: { grace: BOILPRAWN_SHACK },
      note: 'This is what later moves him to Leyndell (and puts him in the Dung Eater’s path).',
    }),
    detour(
      'makar',
      'Fight Magma Wyrm Makar with Boggart',
      {
        lockedBy: [lockedByGate(GATES.magmaWyrmMakar)],
        reward: 'His help against Magma Wyrm Makar',
      },
      [
        step('makar-summon', 'Summon him against Magma Wyrm Makar', {
          kind: 'boss',
          unlocks: ['Boggart as a summon against Magma Wyrm Makar'],
          where: { grace: RUIN_STREWN_PRECIPICE },
          flagTodo:
            'Summon Boggart at the Magma Wyrm Makar fog gate; the flag that flips when his sign is used (39209250 only marks the sign appearing)',
        }),
      ],
    ),
    step('moat', 'Talk to him at the outer moat below the capital', {
      kind: 'talk',
      done: talk(1044529256, 'first talk at the moat'),
      evidence: 'script',
      requires: [
        needsGate(GATES.altusGrace),
        {
          cond: any(stage('moat'), stage('killedByDungEater')),
          label:
            'Boggart has moved to the outer moat (rest after buying prawns)',
        },
      ],
      unlocks: ['Boggart’s shop at the moat: Boiled Crab'],
      where: { grace: CAPITAL_RAMPART },
    }),
    step('dung-eater-warning', 'Hear all his warnings about the Dung Eater', {
      kind: 'talk',
      done: any(
        talk(1044529259, 'about the Dung Eater ③'),
        stage('killedByDungEater'),
      ),
      evidence: 'script',
      requires: [
        {
          cond: reached('dung-eater', 'release'),
          label: 'Free the Dung Eater from his cell',
        },
      ],
      where: { grace: CAPITAL_RAMPART },
      reload: true,
    }),
    step('dying', 'Talk to the wounded Boggart; the Dung Eater invades', {
      kind: 'talk',
      done: talk(1044529270, 'first dying talk'),
      evidence: 'script',
      where: { grace: CAPITAL_RAMPART },
    }),
    detour(
      'loot',
      'Take what Boggart left',
      {
        reward:
          'A Seedbed Curse, Blackguard’s Bell Bearing, his Iron Ball and Iron Mask',
      },
      [
        step('loot-body', 'Loot his body by the crab pot', {
          kind: 'item',
          done: any(
            pickup(1044525004, 'loot on his body'),
            pickup(400308, 'loot on his body'),
          ),
          evidence: 'observed',
          rewards: [
            'Seedbed Curse',
            "Blackguard's Bell Bearing",
            'Iron Ball',
            "Blackguard's Iron Mask",
          ],
          where: { grace: CAPITAL_RAMPART },
        }),
      ],
    ),
  ],
);
