import { all, any, flag, has, pickup, talk } from '../cond';
import { defineQuest, detour, statusBlock, step } from '../model';

const BRIDGE_OF_SACRIFICE = 76157;
const CASTLE_MORNE_LIFT = 76158;

/**
 * The player killed Irina herself: NPC310's dead flag while she is still waiting at the bridge.
 * (The same flag also turns on when Hyetta's questline ends, at stage 3393.)
 */
export const irinaKilled = all(
  flag(3383, 'status', 'NPC310 dead'),
  flag(3385, 'stage', 'Irina still at the bridge'),
);

/**
 * Irina of Morne (talk block NPC310). The same block also drives Hyetta: the game reuses Irina's
 * character for her, so one status block (3380–3383) and one stage machine (3385–3397) cover
 * both questlines.
 *
 * Stage machine (`common.evs.py` `Event_3399`): 3385 initial → 3386 "faked death" on (3385 ∧
 * talk 1045349207 "agreed to carry the letter" ∧ (Edgar's talk 1043319206 "letter delivered" ∨
 * 3403 Edgar dead ∨ 3062 a Liurnia grace lit ∨ 9101 Godrick defeated)) → 3387 immediately (Hyetta
 * waits at the Lake-Facing Cliffs) → … Hyetta's stages … → 3393 + status 3383 "dead" at the end of
 * Hyetta's questline. So Irina's scripted death is a stage, never the dead flag; the dead flag at
 * stage 3385 means the player killed her (which also stops Hyetta from ever appearing).
 *
 * `diesAfter: 'slain'`: 3383 also turns on when Hyetta's questline completes, which is expected
 * once Irina's scripted death has happened. Dead while she is still at stage 3385 means you killed
 * her, which locks this questline (and Hyetta's) out.
 */
export const irina = defineQuest(
  {
    id: 'irina',
    npc: 'Irina',
    isDlc: false,
    blurb:
      'A blind girl past the Bridge of Sacrifice who asks you to carry a letter to her father at Castle Morne.',
    stages: {
      atBridge: 3385,
      slain: 3386,
      hyettaCliffs: 3387,
      hyettaRuins: 3388,
      hyettaGateTown: 3389,
      hyettaKnowsTruth: 3390,
      hyettaBellum: 3391,
      hyettaProscription: 3392,
      hyettaFinished: 3393,
    },
    status: { ...statusBlock(3380), diesAfter: 'slain' },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC310 (status/stage/talk flag names)',
      'soulstruct common.evs.py Event_3399 (stage transitions), Event_3419 (Edgar reacting to her)',
      'er-save-manager quest_flags_db.py "Irina" (observed talk/pickup flags)',
      'NPC Quests & Endings Guide v5 flowchart, Irina column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Irina just past the Bridge of Sacrifice', {
      kind: 'talk',
      done: talk(1045349205, 'first conversation'),
      evidence: 'script',
      where: { grace: BRIDGE_OF_SACRIFICE },
    }),
    step('take-letter', 'Agree to carry her letter to her father', {
      kind: 'talk',
      done: any(
        talk(1045349207, 'agreed to carry the letter'),
        pickup(400080, 'Irina’s Letter received'),
        has(8131, 'Irina’s Letter'),
      ),
      evidence: 'script',
      where: { grace: BRIDGE_OF_SACRIFICE },
      rewards: ["Irina's Letter"],
      note: 'Her fate is only set in motion once you accept. Refusing leaves her waiting.',
    }),
    // Not required: she dies whether or not the letter arrives, so a later step must never infer
    // it. Edgar's questline tracks the delivery as well.
    detour(
      'letter',
      'Deliver the letter',
      { reward: 'Edgar reading his daughter’s letter' },
      [
        step('deliver-letter', 'Hand the letter to Edgar at Castle Morne', {
          kind: 'talk',
          done: talk(1043319206, 'Edgar received the letter'),
          evidence: 'script',
          where: {
            grace: CASTLE_MORNE_LIFT,
            note: 'Edgar stands on the castle walls',
          },
        }),
      ],
    ),
    step('slain', 'Irina is killed while you are away', {
      kind: 'event',
      done: any(
        stage('slain'),
        stage('hyettaCliffs'),
        stage('hyettaRuins'),
        stage('hyettaGateTown'),
        stage('hyettaKnowsTruth'),
        stage('hyettaBellum'),
        stage('hyettaProscription'),
        stage('hyettaFinished'),
      ),
      evidence: 'script',
      note: 'Happens on its own once you deliver the letter, light a grace in Liurnia, defeat Godrick, or Edgar dies, whichever comes first.',
    }),
    step('find-body', 'Return to the Bridge of Sacrifice and find her body', {
      kind: 'event',
      done: talk(1045349215, 'found her body'),
      evidence: 'script',
      where: { grace: BRIDGE_OF_SACRIFICE },
      rewards: ['Iron Cleaver'],
      note: 'Edgar mourns her here once the Leonine Misbegotten is dead (his questline).',
    }),
  ],
);
