import { all, any, flag, pickup, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  lockedByDecision,
  lockedWhen,
  needsGate,
  statusBlock,
  step,
} from '../model';

const MISTWOOD_OUTSKIRTS = 76114;
const FORT_HAIGHT_WEST = 76105;
const GODRICK_THE_GRAFTED = 71000;

/**
 * Kenneth Haight (talk 321, status 3580 `見張り塔の貴人`; his `EFID_Talk_NPC321` block only lists a
 * placeholder status range). Talk flags: Mistwood block 1045389200, Fort Haight block 1046369200,
 * Stormveil 10009750, from the community flag log.
 *
 * Stage machine (`common.evs.py` `Event_3599`): 3585 Mistwood → 3586 Fort Haight on 1045389222
 * (agreed to serve him) → 3587 Stormveil throne room on 4229 (Nepheli became lord) ∧ 1046369205
 * (first talk at Fort Haight). His questline ends only through Nepheli's.
 */
export const kenneth = defineQuest(
  {
    id: 'kenneth',
    npc: 'Kenneth Haight',
    isDlc: false,
    blurb:
      'A Limgrave noble looking for a worthy lord for Stormveil Castle, and a vassal to serve him.',
    status: statusBlock(3580),
    stages: {
      mistwood: 3585,
      fortHaight: 3586,
      throneRoom: 3587,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_Common (status block 3580)',
      'soulstruct common.evs.py Event_3599 (stage transitions); m10_00 (throne room)',
      'er-save-manager quest_flags_db.py "Kenneth Haight" (observed talk / pickup flags)',
      'NPC Quests & Endings Guide v5 flowchart, Kenneth Haight column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Kenneth Haight in the Mistwood', {
      kind: 'talk',
      done: talk(1045389205, 'first conversation'),
      evidence: 'observed',
      where: { grace: MISTWOOD_OUTSKIRTS },
    }),
    step('clear-fort', 'Clear Fort Haight of Godrick’s soldiers', {
      kind: 'action',
      // The knight atop the fort drops Bloody Slash with or without Kenneth, so this only counts
      // once he has been met.
      done: all(
        pickup(65877, 'Bloody Slash from the knight atop the fort'),
        talk(1045389205),
      ),
      evidence: 'observed',
      where: { grace: FORT_HAIGHT_WEST },
      rewards: ['Ash of War: Bloody Slash'],
    }),
    step('reward', 'Return to Kenneth: Erdsteel Dagger', {
      kind: 'talk',
      done: any(
        talk(1045389220, 'talked after the fort was cleared'),
        pickup(400221, 'Erdsteel Dagger'),
      ),
      evidence: 'observed',
      where: { grace: MISTWOOD_OUTSKIRTS },
      rewards: ['Erdsteel Dagger'],
    }),
    step('service', 'Agree to enter his service', {
      kind: 'talk',
      done: any(talk(1045389222, 'agreed to serve'), stage('fortHaight')),
      evidence: 'script',
      where: { grace: MISTWOOD_OUTSKIRTS },
      reload: true,
    }),
    step('fort-haight', 'Talk to Kenneth atop Fort Haight', {
      kind: 'talk',
      done: talk(1046369205, 'first talk at Fort Haight'),
      evidence: 'script',
      where: { grace: FORT_HAIGHT_WEST },
    }),
    step(
      'throne-room',
      'Once Nepheli rules Stormveil, talk to Kenneth in the throne room',
      {
        kind: 'talk',
        done: any(
          stage('throneRoom'),
          talk(10009755, 'first throne-room talk'),
        ),
        evidence: 'script',
        where: { grace: GODRICK_THE_GRAFTED },
        requires: [
          {
            cond: reached('nepheli', 'lord'),
            label: 'Nepheli takes Stormveil’s throne',
          },
          needsGate(GATES.morgott),
        ],
        lockedBy: [
          lockedByDecision('nepheli', 'puppet'),
          lockedWhen(
            flag(4223, 'status', 'Nepheli is dead'),
            'Let Nepheli Loux die',
            'Nepheli Loux died',
          ),
        ],
      },
    ),
  ],
);
