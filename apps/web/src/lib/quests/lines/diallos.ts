import { any, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  lockedByGate,
  needsGate,
  statusBlock,
  step,
} from '../model';

const TABLE_OF_LOST_GRACE = 71190;
const ACADEMY_GATE_TOWN = 76204;
const VOLCANO_MANOR = 71602;
const JARBURG = 76245;

/**
 * Diallos Hoslow (talk block NPC314).
 *
 * Stage machine (`common.evs.py` `Event_3459`): 3445 initial (Roundtable Hold) → 3446 his
 * servant's death, on approaching the scene in Liurnia (1037442701 / 1037449206) or the Erdtree
 * burning (110) → 3447 invited to the Manor, on his Academy Gate Town talk (1037449205) → 3448
 * Manor reunion, on his next Roundtable talk (11109430) → 3449 about to leave, on his second
 * Manor talk (16009406) ∧ ≥ 1 contract, or on Rykard (9122) without having met him there → 3456
 * left, on (Manor talk 16009405 ∧ Rykard) ∨ his monologue (16009416) → 3450 tending the jars in
 * Jarburg (∧ 1039449263).
 *
 * Rykard's death while he is still in stages 3445–3447 kills him off-screen (3457, dead 3443):
 * everything up to his invitation is locked by the Rykard gate. His Jarburg death (1039449315,
 * `壺を守って瀕死_死亡実行`) is the ending, so the dead flag comes after the questline completes.
 */
export const diallos = defineQuest(
  {
    id: 'diallos',
    npc: 'Diallos',
    isDlc: false,
    blurb:
      'A House Hoslow noble, hopeless with a whip, who finds his purpose among the living jars.',
    status: { ...statusBlock(3440), diesAfter: 'jarburg' },
    stages: {
      initial: 3445,
      servantDead: 3446,
      invited: 3447,
      atManor: 3448,
      leaving: 3449,
      tendingJars: 3450,
      leftManor: 3456,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC314 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3459 (stage transitions)',
      'er-save-manager quest_flags_db.py "Diallos" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Diallos column (ordering, lockout)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Diallos at Roundtable Hold', {
      kind: 'talk',
      done: talk(11109406, 'first talk'),
      evidence: 'script',
      lockedBy: [lockedByGate(GATES.rykard)],
      where: { grace: TABLE_OF_LOST_GRACE },
    }),
    step(
      'servant',
      'Find Diallos mourning his servant near Academy Gate Town',
      {
        kind: 'talk',
        done: talk(1037449205, 'mourning talk played'),
        evidence: 'script',
        requires: [needsGate(GATES.liurniaGrace)],
        lockedBy: [lockedByGate(GATES.rykard)],
        where: {
          grace: ACADEMY_GATE_TOWN,
          note: 'On a sunken rooftop west of the grace',
        },
      },
    ),
    step('roundtable-again', 'Talk to him back at Roundtable Hold', {
      kind: 'talk',
      done: talk(11109430, 'invited-to-the-Manor talk'),
      evidence: 'script',
      lockedBy: [lockedByGate(GATES.rykard)],
      where: { grace: TABLE_OF_LOST_GRACE },
      reload: true,
      note: 'He leaves for the Volcano Manor after you rest.',
    }),
    step('manor', 'Talk to Diallos in the Volcano Manor drawing room', {
      kind: 'talk',
      done: any(
        talk(16009405, 'first Manor talk'),
        talk(16009415, 'about-to-leave talk'),
      ),
      evidence: 'script',
      requires: [
        { cond: reached('tanith', 'join'), label: 'Join the Volcano Manor' },
      ],
      where: { grace: VOLCANO_MANOR },
    }),
    step('leaves-manor', 'Watch him leave the Manor', {
      kind: 'event',
      done: any(
        talk(16009416, 'monologue played'),
        stage('leftManor'),
        stage('tendingJars'),
      ),
      evidence: 'script',
      requires: [
        {
          cond: any(reached('tanith', 'rileigh'), GATES.rykard.cond),
          label: 'Complete Tanith’s second contract, or defeat Rykard',
        },
      ],
      where: { grace: VOLCANO_MANOR },
      reload: true,
    }),
    step('jarburg', 'Find Diallos caring for the living jars in Jarburg', {
      kind: 'talk',
      done: talk(1039449305, 'first Jarburg talk'),
      evidence: 'script',
      where: { grace: JARBURG },
    }),
    step(
      'last-stand',
      'Pass time, then find him wounded in Jarburg and hear his last words',
      {
        kind: 'talk',
        done: talk(1039449315, 'died defending the jars'),
        evidence: 'script',
        where: { grace: JARBURG },
        rewards: ["Diallos's Mask", "Hoslow's Petal Whip", "Numen's Rune"],
      },
    ),
  ],
);
