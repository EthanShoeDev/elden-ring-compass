import { all, any, flag, pickup, reached, talk } from '../cond';
import { GATES } from '../gates';
import {
  choice,
  defineQuest,
  detour,
  lockedByDecision,
  lockedByGate,
  lockedWhen,
  needsGate,
  path,
  step,
} from '../model';

const MAIN_GATE_CROSS = 76803;
const CLEANSING_CHAMBER_ANTEROOM = 72015;

/**
 * Moore (event-state block 4380), leader of the Forager Brood, at the Main Gate Cross.
 *
 * Stage machine (`common.evs.py` Event_4399): 4385 at the Main Gate Cross → 4386 on 2045429266
 * (assumed: you answered "Remain sad forever"; at 4386 `m61_47_46_00` lays his body and gear out
 * by the Church of the Crusade) or → 4387 on 2045429298, which Event_4843 sets after the Miquella's
 * Faithful fight when Moore was in it (4895); at 4387 `m20_01_00_00` lays his gear out in
 * Enir-Ilim. 4901 (he has left, set from 2045429264 — assumed: "Put it behind you") stops
 * Event_4850, which otherwise makes him permanently hostile (4382) when his avenging invasion is
 * beaten (2045429282). His gear is lot 106420–106425 (Bell Bearing flag 400644, Verdigris set
 * 400645) in both places, so each ending pairs the pickup with its stage.
 *
 * Pickup flags are ItemLotParam_map `getItemFlagId`s (regulation.bin): Black Syrup lot 106410
 * (400642); Forager Brood Cookbooks [1]–[6] lots 107500–107550 (flags 68520, 68530, 68540,
 * 68550, 68560, 68510), [7] from Moore lot 106400 (68830).
 */
export const moore = defineQuest(
  {
    id: 'moore',
    npc: 'Moore',
    isDlc: true,
    blurb:
      'The gentle armored merchant at the Main Gate Cross who looks after the Forager Brood.',
    stages: {
      mainGate: 4385,
      diedOfSorrow: 4386,
      enirIlim: 4387,
    },
    lockedBy: [
      lockedWhen(
        flag(4382, 'status', 'Moore is permanently hostile'),
        'Kill Moore when he invades to avenge the Forager Brood',
        'You killed Moore when he invaded to avenge the Forager Brood',
      ),
    ],
    sources: [
      'soulstruct common.evs.py Event_4399 (stage machine), Event_4850 (avenging invasion), Event_4843',
      'soulstruct m61_45_42_00 (Main Gate Cross), m61_47_46_00 (Church of the Crusade body)',
      'soulstruct m20_01_00_00 (Enir-Ilim gear)',
      'regulation.bin ItemLotParam_map getItemFlagId (reward and cookbook pickup flags)',
      'NPC Quests & Endings Guide v5 SotE flowchart, Moore column (ordering)',
      'Fextralife Moore page (step detail, reworded)',
    ],
  },
  ({ stage }) => {
    const closesBrood = [
      lockedByDecision('moore', 'put-behind'),
      lockedByDecision('moore', 'sad-forever'),
    ];
    return [
      step('meet', 'Meet Moore at the Main Gate Cross', {
        kind: 'talk',
        unlocks: ['Moore’s shop'],
        where: { grace: MAIN_GATE_CROSS },
        flagTodo:
          'talk to Moore for the first time (buy something to open his dialogue); the flag that flips',
      }),
      detour(
        'syrup',
        'The Black Syrup for Thiollier',
        {
          lockedBy: [
            lockedWhen(
              reached('thiollier', 'with-trina'),
              'Let Thiollier leave the Pillar Path Cross',
              'Thiollier has left the Pillar Path Cross',
            ),
            lockedWhen(
              stage('diedOfSorrow'),
              'Let Moore die of sorrow',
              'Moore is dead',
            ),
          ],
          reward: 'Black Syrup (Thiollier turns it into his Concoction)',
        },
        [
          step(
            'black-syrup',
            'After meeting Thiollier, talk to Moore: the Black Syrup',
            {
              kind: 'talk',
              done: pickup(400642, 'Black Syrup received'),
              evidence: 'script',
              rewards: ['Black Syrup'],
              requires: [
                {
                  cond: reached('thiollier', 'meet'),
                  label: 'Meet Thiollier at the Pillar Path Cross',
                },
              ],
              where: { grace: MAIN_GATE_CROSS },
            },
          ),
        ],
      ),
      detour(
        'brood',
        'The Forager Brood',
        {
          lockedBy: closesBrood,
          reward: 'Forager Brood Cookbooks [1]–[6]',
        },
        [
          step(
            'brood-cookbooks',
            'Find all six Forager Broodlings around the Land of Shadow and take their cookbooks',
            {
              kind: 'item',
              done: all(
                pickup(68520, 'Forager Brood Cookbook [1]'),
                pickup(68530, 'Forager Brood Cookbook [2]'),
                pickup(68540, 'Forager Brood Cookbook [3]'),
                pickup(68550, 'Forager Brood Cookbook [4]'),
                pickup(68560, 'Forager Brood Cookbook [5]'),
                pickup(68510, 'Forager Brood Cookbook [6]'),
              ),
              evidence: 'script',
              rewards: [
                'Forager Brood Cookbook [1]',
                'Forager Brood Cookbook [2]',
                'Forager Brood Cookbook [3]',
                'Forager Brood Cookbook [4]',
                'Forager Brood Cookbook [5]',
                'Forager Brood Cookbook [6]',
              ],
              where: {
                note: 'Across Gravesite Plain, the Cerulean Coast and Scadu Altus',
              },
              note: 'Don’t kill them: one death earns a warning, a second brings Moore’s invasion. The one by the Church of the Crusade needs warming first.',
            },
          ),
        ],
      ),
      detour(
        'moore-cookbook',
        'Moore’s own cookbook',
        {
          lockedBy: closesBrood,
          reward: 'Forager Brood Cookbook [7]',
        },
        [
          step(
            'cookbook-7',
            'Help the Broodling by the Church of the Crusade, then talk to Moore: Forager Brood Cookbook [7]',
            {
              kind: 'talk',
              done: pickup(68830, 'Forager Brood Cookbook [7]'),
              evidence: 'script',
              rewards: ['Forager Brood Cookbook [7]'],
              where: { grace: MAIN_GATE_CROSS },
            },
          ),
        ],
      ),
      step(
        'question',
        'Once Miquella’s charm is broken, talk to Moore and hear his question',
        {
          kind: 'talk',
          requires: [needsGate(GATES.miquellaCharmBroken)],
          lockedBy: [lockedByGate(GATES.sealingTreeBurned)],
          where: { grace: MAIN_GATE_CROSS },
          note: 'Answering “I don’t know” leaves the question open for later.',
          flagTodo:
            'after the charm breaks, talk to Moore until he asks if sorrow lasts forever; the flag that flips',
        },
      ),
      choice('answer', 'How do you answer Moore?', [
        path(
          'put-behind',
          'Put it behind you',
          [
            step('answer-put-behind', 'Tell Moore to put it behind him', {
              kind: 'talk',
              done: talk(2045429264, 'answered “Put it behind you”'),
              evidence: 'assumed',
              where: { grace: MAIN_GATE_CROSS },
            }),
            step(
              'faithful',
              'Face Moore among Miquella’s Faithful in Enir-Ilim',
              {
                kind: 'boss',
                // Moore stands with Leda's Miquella's Faithful: his stage moves to 4387 when
                // that fight (Leda's `miquellas-faithful` step) is won with him in the roster.
                done: any(
                  stage('enirIlim'),
                  all(
                    talk(2045429264, 'answered “Put it behind you”'),
                    reached('leda', 'miquellas-faithful'),
                  ),
                ),
                evidence: 'script',
                requires: [needsGate(GATES.sealingTreeBurned)],
                where: { grace: CLEANSING_CHAMBER_ANTEROOM },
              },
            ),
            step(
              'enir-gear',
              'Take Moore’s Bell Bearing and Verdigris gear from his body in Enir-Ilim',
              {
                kind: 'item',
                done: all(
                  stage('enirIlim'),
                  pickup(400644, 'Moore’s Bell Bearing'),
                ),
                evidence: 'script',
                rewards: [
                  "Moore's Bell Bearing",
                  'Verdigris Greatshield',
                  'Verdigris Helm',
                  'Verdigris Armor',
                  'Verdigris Gauntlets',
                  'Verdigris Greaves',
                ],
                where: { grace: CLEANSING_CHAMBER_ANTEROOM },
              },
            ),
          ],
          { ending: 'Moore falls in Enir-Ilim' },
        ),
        path(
          'sad-forever',
          'Remain sad forever',
          [
            step('answer-sad', 'Tell Moore to remain sad forever', {
              kind: 'talk',
              done: any(
                talk(2045429266, 'answered “Remain sad forever”'),
                stage('diedOfSorrow'),
              ),
              evidence: 'assumed',
              where: { grace: MAIN_GATE_CROSS },
              reload: true,
            }),
            step(
              'church-gear',
              'Take Moore’s Bell Bearing and Verdigris gear from his body outside the Church of the Crusade',
              {
                kind: 'item',
                done: all(
                  stage('diedOfSorrow'),
                  pickup(400644, 'Moore’s Bell Bearing'),
                ),
                evidence: 'script',
                rewards: [
                  "Moore's Bell Bearing",
                  'Verdigris Greatshield',
                  'Verdigris Helm',
                  'Verdigris Armor',
                  'Verdigris Gauntlets',
                  'Verdigris Greaves',
                ],
                where: {
                  note: 'Outside the Church of the Crusade, Scadu Altus',
                },
              },
            ),
          ],
          { ending: 'Moore dies of sorrow' },
        ),
      ]),
    ];
  },
);
