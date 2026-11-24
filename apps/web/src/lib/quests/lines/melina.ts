import { any, flag, has, talk } from '../cond';
import { GATES } from '../gates';
import {
  choice,
  defineQuest,
  detour,
  lockedByGate,
  needsGate,
  path,
  step,
} from '../model';

const GATEFRONT = 76111;
const TABLE_OF_LOST_GRACE = 71190;
const THIRD_CHURCH_OF_MARIKA = 76104;
const GRAND_LIFT_OF_DECTUS = 76209;
const OUTER_WALL_BATTLEGROUND = 76312;
const MINOR_ERDTREE_CHURCH = 76310;
const CATHEDRAL_OF_THE_FORSAKEN = 73500;
const EAST_CAPITAL_RAMPART = 71102;
const ELDEN_THRONE = 71100;
const CHURCH_OF_REPOSE = 76507;
const FIRST_CHURCH_OF_MARIKA = 76505;
const FORGE_OF_THE_GIANTS = 76510;

/**
 * Melina (talk block NPC100 `娘マリカ`, status 3160).
 *
 * She has no stage machine: `common.evs.py` `Event_3179` only seeds 3160/3165 and ends, so every
 * step is read from her talk flags. `EFID_Talk_NPC100` names the "made the pact at …" flags
 * (`…で契約した`: 1042379204 Gatefront, 10009650 before Margit, 1041389500 the smithy shack,
 * 1042369450 the starting point, 1042369452 the church), the Rold Medallion talk (11009251
 * `巨大EV用の通行証B再生済`) and the Forge choice (1054539200 chose the Flame of the Giants /
 * 1054539201 chose the Frenzied Flame). The grace conversations are from the community flag log.
 *
 * Her status block isn't used: she can't be fought (so no Hostile warning to lose), and whether
 * her self-immolation or the Frenzied Flame farewell sets her death flag is unverified. Neither
 * fits a single `diesAfter` step, so a stray death flag would read as a lockout mid-questline.
 */
export const melina = defineQuest(
  {
    id: 'melina',
    npc: 'Melina',
    isDlc: false,
    blurb:
      'A maiden who offers to be your guide, gives you Torrent and leads you to the Forge of the Giants to burn the Erdtree.',
    stages: {},
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_NPC100 (talk flag names)',
      'soulstruct common.evs.py Event_3179 (no stage transitions)',
      'er-save-manager quest_flags_db.py "Melina" (observed talk flags)',
      'NPC Quests & Endings Guide v5 flowchart, Melina column (ordering, missables)',
    ],
  },
  () => [
    step('accept', 'Accept Melina’s offer at a grace and receive Torrent', {
      kind: 'talk',
      done: any(
        talk(1042379204, 'pact made at Gatefront'),
        talk(10009650, 'pact made before Margit'),
        talk(1041389500, 'pact made at the smithy shack'),
        talk(1042369450, 'pact made at the starting point'),
        talk(1042369452, 'pact made at the church'),
      ),
      evidence: 'script',
      where: {
        grace: GATEFRONT,
        note: 'She appears after resting at one of a few Limgrave graces.',
      },
      rewards: ['Spectral Steed Whistle'],
      unlocks: [
        'Torrent, your spectral steed',
        'Leveling up at Sites of Grace',
      ],
    }),
    step('roundtable', 'Let Melina take you to Roundtable Hold', {
      kind: 'event',
      // 11109786 ("accepted the trip") is cleared again on arrival (m11_10 Event_11103775), so
      // the Hold's own grace is the lasting trace.
      done: flag(TABLE_OF_LOST_GRACE, 'grace', 'Table of Lost Grace lit'),
      evidence: 'assumed',
      where: {
        grace: TABLE_OF_LOST_GRACE,
        note: 'She offers once you rest at a grace past Limgrave or after meeting Margit.',
      },
    }),
    detour(
      'grace-talks',
      'Talk to Melina at graces across the Lands Between',
      { reward: 'Melina’s grace conversations and the Outer Order gesture' },
      [
        step('third-church', 'Hear her at the Third Church of Marika', {
          kind: 'talk',
          done: talk(1046389202),
          evidence: 'observed',
          where: { grace: THIRD_CHURCH_OF_MARIKA },
        }),
        step('dectus', 'Hear her at the Grand Lift of Dectus', {
          kind: 'talk',
          done: talk(1038509251),
          evidence: 'observed',
          where: { grace: GRAND_LIFT_OF_DECTUS },
        }),
        step('outer-wall', 'Hear her at the Outer Wall Battleground', {
          kind: 'talk',
          done: talk(1043539251),
          evidence: 'observed',
          where: { grace: OUTER_WALL_BATTLEGROUND },
        }),
        step(
          'outer-order',
          'Hear her at the Minor Erdtree Church: the Outer Order gesture',
          {
            kind: 'talk',
            // The gesture flag (60846) carries into NG+, so it can't stand as evidence alone.
            done: talk(1043509201, 'heard her at the church'),
            evidence: 'observed',
            where: { grace: MINOR_ERDTREE_CHURCH },
            rewards: ['Outer Order'],
          },
        ),
        step(
          'forsaken',
          'Hear her warning about the Frenzied Flame at the Cathedral of the Forsaken',
          {
            kind: 'talk',
            done: talk(35009351),
            evidence: 'observed',
            where: { grace: CATHEDRAL_OF_THE_FORSAKEN },
          },
        ),
      ],
    ),
    step('rampart', 'Talk to Melina at the East Capital Rampart', {
      kind: 'talk',
      done: talk(11009260, 'Melina’s visit at the rampart'),
      evidence: 'observed',
      where: { grace: EAST_CAPITAL_RAMPART },
    }),
    detour(
      'morgott-summon',
      'Fight Morgott with Melina',
      {
        lockedBy: [lockedByGate(GATES.morgott)],
        reward: 'Melina’s help against Morgott (no item)',
      },
      [
        step(
          'summon-against-morgott',
          'Summon Melina with her sign outside Morgott’s arena',
          {
            kind: 'boss',
            flagTodo:
              'Summon Melina for the Morgott fight and win; record the flag that flips for her summon',
          },
        ),
      ],
    ),
    step(
      'rold-medallion',
      'Try to pass the thorns at the Erdtree; Melina hands you the Rold Medallion',
      {
        kind: 'talk',
        done: any(
          talk(11009251, 'Medallion talk played'),
          has(8107, 'Rold Medallion'),
        ),
        evidence: 'script',
        requires: [needsGate(GATES.morgott)],
        where: { grace: ELDEN_THRONE },
        rewards: ['Rold Medallion'],
      },
    ),
    step('enia', 'Ask Enia at Roundtable Hold about the Medallion', {
      kind: 'talk',
      where: { grace: TABLE_OF_LOST_GRACE },
      flagTodo:
        'Talk to Finger Reader Enia after receiving the Rold Medallion; record the flag that flips',
    }),
    detour(
      'mountaintops',
      'Talk to Melina in the Mountaintops of the Giants',
      {
        reward:
          'Melina’s last conversations before the Forge (dialogue only, no item)',
      },
      [
        step('repose', 'Hear her at the Church of Repose', {
          kind: 'talk',
          done: talk(1054539211),
          evidence: 'observed',
          where: { grace: CHURCH_OF_REPOSE },
        }),
        step('first-church', 'Hear her at the First Church of Marika', {
          kind: 'talk',
          done: talk(1054559201),
          evidence: 'observed',
          where: { grace: FIRST_CHURCH_OF_MARIKA },
        }),
      ],
    ),
    choice('kindling', 'What burns the Erdtree', [
      path(
        'melina-kindles',
        'Let Melina become the kindling',
        [
          step(
            'forge',
            'Rest at the Forge of the Giants and tell Melina you are ready',
            {
              kind: 'talk',
              done: talk(1054539200, 'chose the Flame of the Giants'),
              evidence: 'script',
              requires: [needsGate(GATES.fireGiant)],
              lockedBy: [lockedByGate(GATES.frenziedFlame)],
              where: { grace: FORGE_OF_THE_GIANTS },
              unlocks: [
                'The burnt Erdtree, and the road to Crumbling Farum Azula',
              ],
            },
          ),
        ],
        { ending: 'Melina gave herself to the flame' },
      ),
      path(
        'frenzied-flame',
        'Take the Flame of Frenzy instead',
        [
          step(
            'frenzy-farewell',
            'Inherit the Frenzied Flame; Melina says goodbye and leaves you',
            {
              kind: 'event',
              done: talk(35009360, 'farewell after the Frenzied Flame'),
              evidence: 'observed',
              requires: [needsGate(GATES.frenziedFlame)],
              where: { note: 'Beneath the Subterranean Shunning-Grounds' },
            },
          ),
          step(
            'forge-frenzy',
            'Burn the Erdtree yourself at the Forge of the Giants',
            {
              kind: 'event',
              done: talk(1054539201, 'chose the Frenzied Flame'),
              evidence: 'script',
              requires: [needsGate(GATES.fireGiant)],
              where: { grace: FORGE_OF_THE_GIANTS },
            },
          ),
        ],
        { ending: 'Melina left you to the Frenzied Flame' },
      ),
    ]),
  ],
);
