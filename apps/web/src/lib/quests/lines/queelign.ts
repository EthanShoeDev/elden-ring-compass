import { any, flag, has, pickup, talk } from '../cond';
import { choice, defineQuest, path, statusBlock, step } from '../model';

const SMALL_PRIVATE_ALTAR = 72002;
const CHURCH_DISTRICT_ENTRANCE = 72106;

const IRIS_OF_GRACE = 2002120;
const IRIS_OF_OCCULTATION = 2002130;

/**
 * Fire Knight Queelign (status block 4340), an invader whose real body lies in the Shadow Keep.
 *
 * Invasions (CommonFunc_90005754 / 90005755 in `m20_00_00_00` and `m61_47_46_00`): 4875 is set
 * when his Belurat invasion is beaten, 4876 his Church of the Crusade one; the shared counter
 * 4861 reaching 2 sets 4860. Rewards are ItemLotParam_map `getItemFlagId`s: the first win gives
 * the Crusade Insignia (lot 106920, flag 400694), the second the Prayer Room Key + Ash of War:
 * Flame Skewer (lot 106930/106931, flag 400696). Either invasion can come first.
 *
 * Stage machine (`common.evs.py` Event_4359 + Event_4846): 4345 invading → 4346 once both
 * invasions are beaten (4860 → 4865). The body (`m21_00_00_00` Event_21000700) appears then.
 * 21009208 is read by Event_4619 as "spoken to, no iris given yet"; treated as his first-talk
 * flag (assumed). Iris hand-over (Event_21000702 / 21000703, Event_4931): 21009210 awards his
 * spirit ash (lot 106900, flag 400690) — the Iris of Grace; 21009211 → 21009213 lays out
 * Queelign's Greatsword (lot 106910, flag 400692) — the Iris of Occultation.
 */
export const queelign = defineQuest(
  {
    id: 'queelign',
    npc: 'Fire Knight Queelign',
    isDlc: true,
    blurb:
      'A Fire Knight of the Crusade who invades you twice before you find what is left of him.',
    status: statusBlock(4340),
    stages: {
      invading: 4345,
      bodyRevealed: 4346,
    },
    sources: [
      'soulstruct common.evs.py Event_4359 / Event_4846 (stage machine), Event_4931 (iris reward)',
      'soulstruct m20_00_00_00 / m61_47_46_00 (invasions, CommonFunc_90005754)',
      'soulstruct m21_00_00_00 (Prayer Room body, iris hand-over, greatsword pickup)',
      'regulation.bin ItemLotParam_map getItemFlagId (reward pickup flags)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Fire Knight Queelign column (ordering)',
      'Fextralife Fire Knight Queelign (NPC) page (step detail, reworded)',
    ],
  },
  ({ stage }) => [
    step(
      'first-invasion',
      'Defeat Queelign’s invasion in Belurat, Tower Settlement: Crusade Insignia',
      {
        kind: 'boss',
        done: any(
          flag(4875, 'boss', 'Belurat invasion beaten'),
          flag(4876, 'boss', 'Church of the Crusade invasion beaten'),
          pickup(400694, 'Crusade Insignia received'),
        ),
        evidence: 'script',
        rewards: ['Crusade Insignia'],
        where: { grace: SMALL_PRIVATE_ALTAR },
        note: 'He can invade at the Church of the Crusade first instead; either win counts.',
      },
    ),
    step(
      'second-invasion',
      'Defeat his invasion at the Church of the Crusade: Prayer Room Key and Flame Skewer',
      {
        kind: 'boss',
        done: any(
          flag(4860, 'boss', 'both invasions beaten'),
          pickup(400696, 'Prayer Room Key received'),
          stage('bodyRevealed'),
        ),
        evidence: 'script',
        rewards: ['Prayer Room Key', 'Ash of War: Flame Skewer'],
        where: { note: 'Church of the Crusade, Scadu Altus' },
      },
    ),
    step(
      'find-body',
      'Unlock the Prayer Room in the Shadow Keep’s Church District and speak to his body',
      {
        kind: 'talk',
        done: talk(21009208, 'spoke to his body'),
        evidence: 'assumed',
        requires: [
          {
            cond: has(2008036, 'Prayer Room Key'),
            label: 'Have the Prayer Room Key',
          },
        ],
        where: { grace: CHURCH_DISTRICT_ENTRANCE },
      },
    ),
    choice('iris', 'Which iris do you give Queelign?', [
      path(
        'grace',
        'Give him the Iris of Grace',
        [
          step(
            'give-grace',
            'Give Queelign the Iris of Grace: his spirit ash',
            {
              kind: 'talk',
              done: any(
                flag(21009210, 'talk', 'gave the Iris of Grace'),
                pickup(400690, 'Fire Knight Queelign ashes received'),
              ),
              evidence: 'script',
              rewards: ['Fire Knight Queelign'],
              requires: [
                {
                  cond: has(IRIS_OF_GRACE, 'Iris of Grace'),
                  label: 'Have an Iris of Grace (two in the Shadow Keep)',
                },
              ],
              where: { grace: CHURCH_DISTRICT_ENTRANCE },
            },
          ),
        ],
        { ending: 'Fire Knight Queelign spirit ash' },
      ),
      path(
        'occultation',
        'Give him the Iris of Occultation',
        [
          step('give-occultation', 'Give Queelign the Iris of Occultation', {
            kind: 'talk',
            done: flag(21009211, 'talk', 'gave the Iris of Occultation'),
            evidence: 'script',
            requires: [
              {
                cond: has(IRIS_OF_OCCULTATION, 'Iris of Occultation'),
                label:
                  'Have an Iris of Occultation (Shadow Keep, Fort of Reprimand)',
              },
            ],
            where: { grace: CHURCH_DISTRICT_ENTRANCE },
          }),
          step('greatsword', 'Pick up Queelign’s Greatsword beside him', {
            kind: 'item',
            done: pickup(400692, 'Queelign’s Greatsword picked up'),
            evidence: 'script',
            rewards: ["Queelign's Greatsword"],
            where: { grace: CHURCH_DISTRICT_ENTRANCE },
          }),
        ],
        { ending: 'Queelign’s Greatsword' },
      ),
    ]),
  ],
);
