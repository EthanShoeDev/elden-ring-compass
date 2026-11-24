import { all, any, flag, not, pickup, reached, talk } from '../cond';
import { defineQuest, detour, lockedWhen, statusBlock, step } from '../model';

const JARBURG = 76245;

/**
 * Jar-Bairn (status 3820 `生きてる子壺`, "living child jar"; stages 3825–3829, unnamed — the names
 * here are ours; his EFID_Talk_NPC226 block is a template).
 *
 * Stage machine (`common.evs.py` `Event_3839`): 3825 initial → 3826 on 1039449258 ∧ (you've
 * spoken to Alexander, 1043399313, ∨ Alexander is dead, 3663) → 3827 on 1039449278 (not in the
 * flag log; read as Diallos settling in Jarburg) → 3828 on Diallos dead (3443) ∧ 1039449270
 * (spoke to him in the middle of town) → 3829 on 1039449291 (his goodbye after the innards).
 *
 * Talk flags are the Jarburg `会話用フラグ` block (1039449250+, unnamed); ids from the community
 * flag log, `script` where the stage machine reads them.
 */
export const jarBairn = defineQuest(
  {
    id: 'jar-bairn',
    npc: 'Jar-Bairn',
    isDlc: false,
    blurb:
      'A little living jar in Jarburg who dreams of becoming a great warrior jar like Alexander.',
    status: statusBlock(3820),
    stages: {
      initial: 3825,
      awake: 3826,
      diallos: 3827,
      mourning: 3828,
      departed: 3829,
    },
    sources: [
      'soulsmods elden-ring-eventparam Talk_Common (status block 3820)',
      'soulstruct common.evs.py Event_3839 (stage transitions)',
      'er-save-manager quest_flags_db.py "Jar-Bairn" (observed talk/pickup flags)',
      'NPC Quests & Endings Guide v5 flowchart, Jar Bairn column (ordering, missables)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Find Jar-Bairn in Jarburg and talk to him', {
      kind: 'talk',
      done: any(
        talk(1039449252, 'map point unlocked'),
        talk(1039449256, 'first conversation'),
        talk(1039449255, '“show your hands” talk'),
      ),
      evidence: 'observed',
      where: { grace: JARBURG },
    }),
    step('flowers', 'Reload and talk to him again', {
      kind: 'talk',
      done: talk(1039449258, '“pick any flowers” talk'),
      evidence: 'script',
      where: { grace: JARBURG },
      reload: true,
    }),
    step(
      'awake',
      'Meet Alexander, then come back: Jar-Bairn is properly awake',
      {
        kind: 'event',
        done: any(
          stage('awake'),
          stage('diallos'),
          stage('mourning'),
          stage('departed'),
        ),
        evidence: 'script',
        requires: [
          {
            cond: any(
              talk(1043399313, 'spoke to Alexander'),
              flag(3663, 'status', 'Alexander dead'),
            ),
            label: 'Meet Iron Fist Alexander',
          },
        ],
        where: { grace: JARBURG },
        note: 'His story doesn’t move on until you’ve met Alexander.',
      },
    ),
    detour(
      'jarburg-chats',
      'Keep chatting with Jar-Bairn between reloads',
      {
        // Assumed: the flowchart marks these missable once Diallos arrives.
        lockedBy: [
          lockedWhen(
            any(stage('diallos'), stage('mourning'), stage('departed')),
            'Let Diallos settle in Jarburg',
            'Diallos settled in Jarburg',
          ),
        ],
        reward: 'His talks about Alexander and the poachers',
      },
      [
        step('about-alexander', 'Reload and hear him talk about Alexander', {
          kind: 'talk',
          done: any(talk(1039449260), talk(1039449261)),
          evidence: 'observed',
          where: { grace: JARBURG },
          reload: true,
        }),
        step('poachers', 'Reload again and hear about the poachers', {
          kind: 'talk',
          done: talk(1039449263),
          evidence: 'observed',
          where: { grace: JARBURG },
          reload: true,
        }),
      ],
    ),
    detour(
      'diallos',
      'Jar-Bairn and Diallos',
      {
        // Diallos only comes to Jarburg alive (his own questline); 3827 never fires otherwise.
        lockedBy: [
          lockedWhen(
            all(
              flag(3443, 'status', 'Diallos dead'),
              not(
                any(
                  reached('diallos', 'jarburg'),
                  stage('diallos'),
                  stage('mourning'),
                  stage('departed'),
                ),
              ),
            ),
            'Let Diallos die before he reaches Jarburg',
            'Diallos died before he reached Jarburg',
          ),
        ],
        reward: 'Jar-Bairn’s scenes with Diallos',
      },
      [
        step(
          'about-diallos',
          'Talk to him about Diallos once Diallos moves to Jarburg',
          {
            kind: 'talk',
            done: any(talk(1039449265), talk(1039449266)),
            evidence: 'observed',
            requires: [
              {
                cond: any(
                  reached('diallos', 'jarburg'),
                  stage('diallos'),
                  stage('mourning'),
                  stage('departed'),
                ),
                label: 'Diallos moves to Jarburg (Diallos’s questline)',
              },
            ],
            where: { grace: JARBURG },
          },
        ),
        step(
          'town-centre',
          'Let a day pass, then find him in the middle of town',
          {
            kind: 'talk',
            done: talk(1039449270, 'mid-town talk'),
            evidence: 'script',
            where: { grace: JARBURG },
            note: 'Pass time at a grace; he sleeps at night.',
          },
        ),
        step('near-diallos', 'Reload and talk to him kneeling by Diallos', {
          kind: 'talk',
          done: any(talk(1039449285), stage('mourning')),
          evidence: 'script',
          where: { grace: JARBURG },
          reload: true,
        }),
        step('journey', 'Talk to him back at his usual spot', {
          kind: 'talk',
          done: any(talk(1039449280), talk(1039449282)),
          evidence: 'observed',
          where: { grace: JARBURG },
          reload: true,
        }),
      ],
    ),
    step('innards', 'Give him Alexander’s Innards', {
      kind: 'action',
      done: any(
        talk(1039449289, 'innards given'),
        talk(1039449291, 'goodbye played'),
        stage('departed'),
      ),
      evidence: 'script',
      requires: [
        {
          cond: reached('alexander', 'farum-farewell'),
          label: 'Get Alexander’s Innards (end of Alexander’s questline)',
        },
      ],
      where: { grace: JARBURG },
      reload: true,
    }),
    step('companion-jar', 'Pick up the Companion Jar where he sat', {
      kind: 'item',
      done: any(
        pickup(1039445027, 'Companion Jar picked up'),
        pickup(400460, 'Companion Jar'),
      ),
      evidence: 'observed',
      rewards: ['Companion Jar'],
      where: { grace: JARBURG },
    }),
  ],
);
