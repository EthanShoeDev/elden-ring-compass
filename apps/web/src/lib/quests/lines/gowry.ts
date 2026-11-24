import { all, any, flag, has, pickup, reached, talk } from '../cond';
import {
  choice,
  defineQuest,
  detour,
  lockedByDecision,
  lockedWhen,
  path,
  statusBlock,
  step,
} from '../model';

/** Gowry's Shack shares its map tile with this grace, just west of the shack. */
const CHURCH_OF_THE_PLAGUE = 76418;
const HEART_OF_AEONIA = 76412;

/**
 * Sage Gowry (status block 4160–4163, stage machine 4165–4177; no eventparam talk block, so the
 * names come from the script and the community log). Talk flags live in the `m60_50_38` block
 * 10503892xx, which Millicent shares: 1050389255 "Millicent took the needle" drives both NPCs.
 *
 * Stage machine (`common.evs.py` `Event_4179`): 4165 initial → 4166 on talk 1050389207 "gave
 * him the broken needle" → 4167 on 1050389255 "Millicent took the needle" → 4168 on Millicent's
 * 4193 "her two summon signs are out at the Haligtree" → 4169 on Millicent's 4191/4192 (you aided
 * her), or 4171 + status 4163 "dead" on 7611 (you defeated her for her sisters), or 4170 when
 * Millicent died (4183) some other way.
 *
 * Millicent's Haligtree stage (4193) needs 1050389227 (a Gowry talk flag) OR 15009213 (walking
 * near the Drainage Channel), so his plea is optional: assumed to be 1050389227.
 */
export const gowry = defineQuest(
  {
    id: 'gowry',
    npc: 'Sage Gowry',
    isDlc: false,
    blurb:
      'A gentle old sage in a Caelid shack who asks you to look after Millicent, for reasons of his own.',
    status: statusBlock(4160),
    lockedBy: [
      lockedWhen(
        flag(4170, 'stage', 'Millicent died'),
        'Millicent died before the Haligtree',
      ),
    ],
    stages: {
      initial: 4165,
      needleGiven: 4166,
      millicentHealed: 4167,
      haligtree: 4168,
      helped: 4169,
      millicentDied: 4170,
      betrayed: 4171,
    },
    sources: [
      'soulstruct common.evs.py Event_4179 (Gowry stages), Event_4199 (Millicent stages)',
      'er-save-manager quest_flags_db.py "Gowry", "Millicent" (observed talk/pickup/gesture flags)',
      'NPC Quests & Endings Guide v5 flowchart, Gowry column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Gowry at his shack and hear his request', {
      kind: 'talk',
      done: any(
        talk(1050389205, 'heard the request'),
        talk(1050389208, 'asked for the needle'),
      ),
      evidence: 'observed',
      where: { grace: CHURCH_OF_THE_PLAGUE, note: 'Gowry’s Shack' },
    }),
    step(
      'needle',
      'Defeat Commander O’Neil in the Swamp of Aeonia for the broken needle',
      {
        kind: 'item',
        // O'Neil drops it whether or not you met Gowry: only count it once he has asked.
        done: all(
          has(8975, 'Unalloyed Gold Needle (broken)'),
          any(
            talk(1050389205, 'heard the request'),
            talk(1050389208, 'asked for the needle'),
          ),
        ),
        evidence: 'assumed',
        where: { grace: HEART_OF_AEONIA },
      },
    ),
    step('give-needle', 'Bring him the broken needle', {
      kind: 'item',
      done: any(talk(1050389207, 'gave him the needle'), stage('needleGiven')),
      evidence: 'script',
      where: { grace: CHURCH_OF_THE_PLAGUE },
      rewards: ["Sellia's Secret"],
      reload: true,
    }),
    step('repaired', 'Rest, then collect the mended needle from him', {
      kind: 'item',
      done: any(
        pickup(400310, 'mended needle received'),
        has(8976, 'Unalloyed Gold Needle (mended)'),
      ),
      evidence: 'observed',
      where: { grace: CHURCH_OF_THE_PLAGUE },
      rewards: ['Unalloyed Gold Needle'],
    }),
    step('where-millicent', 'Ask him where Millicent is', {
      kind: 'talk',
      done: talk(1050389211, 'told you she is at the Church of the Plague'),
      evidence: 'observed',
      where: { grace: CHURCH_OF_THE_PLAGUE },
    }),
    step('millicent-healed', 'Give Millicent the needle (her questline)', {
      kind: 'event',
      done: talk(1050389255, 'Millicent took the needle'),
      evidence: 'script',
      where: { grace: CHURCH_OF_THE_PLAGUE },
    }),
    step(
      'visit',
      'Once Millicent has visited the shack, talk to him about it',
      {
        kind: 'talk',
        done: any(
          talk(1050389219, 'Millicent paid a visit'),
          talk(1050389216, 'asked you to look after her'),
        ),
        evidence: 'observed',
        requires: [
          {
            cond: reached('millicent', 'shack'),
            label:
              'Talk to Millicent at Gowry’s Shack (he leaves while she is there)',
          },
        ],
        where: { grace: CHURCH_OF_THE_PLAGUE },
        unlocks: [
          'Gowry’s shop: Glintstone Stars, Night Shard and Night Maiden’s Mist',
        ],
      },
    ),
    step('prosthesis-news', 'Tell him you gave Millicent the prosthesis', {
      kind: 'talk',
      done: any(
        talk(1050389221, 'told him about the prosthesis'),
        talk(1050389223, 'asked about Millicent'),
      ),
      evidence: 'observed',
      requires: [
        {
          cond: reached('millicent', 'give-prosthesis'),
          label: 'Give Millicent the Valkyrie’s Prosthesis',
        },
      ],
      where: { grace: CHURCH_OF_THE_PLAGUE },
      unlocks: ['Pest Threads in Gowry’s shop'],
    }),
    detour(
      'desperate-prayer',
      'Buy Pest Threads and ask about Malenia',
      {
        lockedBy: [
          lockedWhen(
            flag(4163, 'status', 'Gowry dead'),
            'Gowry dies',
            'Gowry is dead',
          ),
        ],
        reward: 'Desperate Prayer',
      },
      [
        step(
          'about-malenia',
          'Buy Pest Threads from him, then ask him about Malenia',
          {
            kind: 'talk',
            // Not the gesture flag (60842): gestures carry over into NG+.
            done: talk(1050389225, 'asked about Malenia'),
            evidence: 'observed',
            where: { grace: CHURCH_OF_THE_PLAGUE },
            rewards: ['Desperate Prayer'],
          },
        ),
      ],
    ),
    detour(
      'plea',
      'Hear what Gowry really wants',
      {
        lockedBy: [
          lockedByDecision('millicent', 'assist'),
          lockedByDecision('millicent', 'challenge'),
        ],
        reward: 'Gowry’s plea to side with Millicent’s sisters',
      },
      [
        step(
          'plea-talk',
          'While Millicent waits in the Haligtree, talk to Gowry: he begs you to side with her sisters',
          {
            kind: 'talk',
            done: talk(1050389227, 'heard his plea'),
            evidence: 'assumed',
            requires: [
              {
                cond: reached('millicent', 'snow-valley'),
                label: 'Millicent has left for the Haligtree',
              },
            ],
            where: { grace: CHURCH_OF_THE_PLAGUE },
          },
        ),
      ],
    ),
    choice('fate', 'Millicent’s fate at the Haligtree', [
      path(
        'gowry-aided',
        'You aided Millicent',
        [
          step('lament', 'Return to the shack and hear him lament', {
            kind: 'talk',
            done: any(
              stage('helped'),
              talk(1050389234, 'talked after you aided her'),
            ),
            evidence: 'script',
            lockedBy: [lockedByDecision('millicent', 'challenge')],
            where: { grace: CHURCH_OF_THE_PLAGUE },
          }),
          detour(
            'gowry-loot',
            'Kill Gowry for his belongings',
            { reward: "Flock's Canvas Talisman and Gowry's Bell Bearing" },
            [
              step(
                'kill-gowry',
                'Strike Gowry down at his shack and loot him',
                {
                  kind: 'action',
                  done: pickup(400312, 'looted Gowry'),
                  evidence: 'observed',
                  where: { grace: CHURCH_OF_THE_PLAGUE },
                  rewards: ["Flock's Canvas Talisman", "Gowry's Bell Bearing"],
                },
              ),
            ],
          ),
        ],
        { ending: 'Millicent bloomed on her own terms' },
      ),
      path(
        'gowry-betrayed',
        'You defeated Millicent for her sisters',
        [
          step('gone', 'Return to the shack: Gowry is dead', {
            kind: 'event',
            done: stage('betrayed'),
            evidence: 'script',
            lockedBy: [lockedByDecision('millicent', 'assist')],
            where: { grace: CHURCH_OF_THE_PLAGUE },
            rewards: ["Flock's Canvas Talisman", "Gowry's Bell Bearing"],
            note: 'Loot his body.',
          }),
        ],
        { ending: 'Millicent fell, and Gowry with her' },
      ),
    ]),
  ],
);
