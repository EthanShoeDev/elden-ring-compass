import { any, flag, has, pickup, reached, talk } from '../cond';
import { defineQuest, detour, lockedWhen, statusBlock, step } from '../model';

const LAKE_FACING_CLIFFS = 76200;
const SCHOOLHOUSE_CLASSROOM = 71403;

/**
 * Thops (status 3800 `戻れない輝石魔術師`, "the sorcerer who can't go back"; stages 3805–3806;
 * his EFID_Talk_NPC333 block is an unnamed template).
 *
 * Stage machine (`common.evs.py` `Event_3819`): 3805 initial → 3806 on 1039399220 (the talk
 * after you hand over the Academy Glintstone Key), which also sets his status to dead (3803): he
 * dies at the Academy, and his body is the questline's end.
 *
 * So his status block has `diesAfter: 'give-key'`: dying is expected from then on, a lockout
 * only before it.
 *
 * Talk flags are the Church of Irith `会話用フラグ` block (1039399200+, unnamed); ids from the
 * community flag log.
 */
export const thops = defineQuest(
  {
    id: 'thops',
    npc: 'Thops',
    isDlc: false,
    blurb:
      'A destitute academy sorcerer at the Church of Irith, locked out of Raya Lucaria without a key.',
    status: { ...statusBlock(3800), diesAfter: 'give-key' },
    stages: {
      initial: 3805,
      keyGiven: 3806,
    },
    sources: [
      'soulsmods elden-ring-eventparam Talk_Common (status block 3800)',
      'soulstruct common.evs.py Event_3819 (stage transition)',
      'er-save-manager quest_flags_db.py "Thops" (observed talk/pickup flags)',
      'NPC Quests & Endings Guide v5 flowchart, Thops column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Thops at the Church of Irith', {
      kind: 'talk',
      where: { grace: LAKE_FACING_CLIFFS, note: 'Church of Irith' },
    }),
    step('donate', 'Give him 10 runes', {
      kind: 'action',
      done: talk(1039399206, 'donated'),
      evidence: 'observed',
      unlocks: ['Thops’s sorcery shop'],
      where: { grace: LAKE_FACING_CLIFFS, note: 'Church of Irith' },
    }),
    step('about-key', 'Ask him about the Academy Glintstone Key', {
      kind: 'talk',
      done: talk(1039399214, 'key request talk'),
      evidence: 'observed',
    }),
    detour(
      'about-sellen',
      'Ask Thops about Sellen',
      {
        lockedBy: [
          lockedWhen(
            any(stage('keyGiven'), flag(3803, 'status', 'Thops dead')),
            'Give Thops the key (he dies at the Academy)',
            'Thops took the key and died at the Academy',
          ),
        ],
        reward: 'His memories of Sellen',
      },
      [
        step('sellen-talk', 'Ask him about Sorceress Sellen', {
          kind: 'talk',
          done: talk(1039399221, '“about Sellen” played'),
          evidence: 'observed',
          requires: [
            {
              cond: reached('sellen', 'meet'),
              label: 'Meet Sellen in the Waypoint Ruins cellar',
            },
          ],
        }),
      ],
    ),
    step(
      'second-key',
      'Find a second Academy Glintstone Key inside Raya Lucaria and bring it to him',
      {
        kind: 'item',
        // Holding a key proves nothing about Thops (most players pick both up anyway), so only
        // his “give the key” option counts.
        done: talk(1039399207, '“give the key” option unlocked'),
        evidence: 'observed',
        requires: [
          {
            cond: has(8174, 'second Academy Glintstone Key'),
            label:
              'Find the second Academy Glintstone Key inside Raya Lucaria (the first is behind Glintstone Dragon Smarag)',
          },
        ],
        where: { grace: LAKE_FACING_CLIFFS, note: 'Church of Irith' },
      },
    ),
    step('give-key', 'Give Thops the second key', {
      kind: 'talk',
      done: any(talk(1039399220, 'key handed over'), stage('keyGiven')),
      evidence: 'script',
      rewards: ['Erudition'],
      where: { grace: LAKE_FACING_CLIFFS, note: 'Church of Irith' },
      reload: true,
    }),
    step('his-body', 'Find his body outside the Schoolhouse Classroom', {
      kind: 'item',
      done: any(
        pickup(14005036, 'body looted'),
        pickup(400360, 'Thops’s Bell Bearing'),
      ),
      evidence: 'observed',
      rewards: [
        "Thops's Barrier",
        'Academy Glintstone Staff',
        "Thops's Bell Bearing",
      ],
      where: { grace: SCHOOLHOUSE_CLASSROOM },
    }),
  ],
);
