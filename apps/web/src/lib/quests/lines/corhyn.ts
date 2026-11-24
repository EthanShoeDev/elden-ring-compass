import { all, any, flag, has, pickup, talk, world } from '../cond';
import { GATES } from '../gates';
import {
  defineQuest,
  detour,
  lockedByGate,
  needsGate,
  statusBlock,
  step,
} from '../model';

const TABLE_OF_LOST_GRACE = 71190;
const ALTUS_HIGHWAY_JUNCTION = 76303;
const FOREST_SPANNING_GREATBRIDGE = 76304;
const ERDTREE_SANCTUARY = 71101;
const ANCIENT_SNOW_VALLEY_RUINS = 76503;
const LEYNDELL_CAPITAL_OF_ASH = 71123;

/**
 * Brother Corhyn and the Noble Goldmask. Corhyn's status is 4200 (`キャラ状態フラグ_351_金仮面の従者`,
 * "Goldmask's attendant"); Goldmask (112 `金仮面の探究者`) has no status block of his own. Neither
 * has a named per-flag talk block in the eventparam dump, only map-local ranges (Corhyn:
 * 11109850, 1040529250, 1040549200, 11009450, 1051569350, 11059200; Goldmask: 1040549250,
 * 11009550, 1051569450, 11059300). Individual talk flags come from the community flag log.
 *
 * Stage machine (`common.evs.py` `Event_4219`): 4205 Roundtable → 4206 Altus Highway Junction on
 * 11109859 (his "I'm leaving to find Goldmask" talk) → 4207 beside Goldmask on the Greatbridge on
 * 1040529259 (told him where Goldmask is) → 4208 Leyndell on 1040549205 (first talk beside
 * Goldmask) → 4209 Mountaintops on 11009555 (Goldmask told the answer) → 4210 (or 4211, if
 * 1051569361) Ashen Capital once Maliketh falls (9116). Talking to him there (11059207) and
 * reloading sets him dead: the questline's normal end.
 */
export const corhyn = defineQuest(
  {
    id: 'corhyn',
    npc: 'Brother Corhyn & Goldmask',
    isDlc: false,
    blurb:
      'A Roundtable priest who follows the silent Goldmask in search of a flawless Golden Order.',
    status: { ...statusBlock(4200), diesAfter: 'mending-rune' },
    stages: {
      roundtable: 4205,
      junction: 4206,
      greatbridge: 4207,
      leyndell: 4208,
      mountaintops: 4209,
      ashen: 4210,
      ashenAlt: 4211,
      failed: 4217,
    },
    sources: [
      'soulsmods elden-ring-eventparam EFID_Talk_Common (status block, talk flag ranges)',
      'soulstruct common.evs.py Event_4219 (stage transitions); m60_51_56, m11_05 (late locations)',
      'er-save-manager quest_flags_db.py "Brother Corhyn" (observed talk / pickup flags)',
      'NPC Quests & Endings Guide v5 flowchart, Corhyn column (ordering)',
    ],
  },
  ({ stage }) => [
    step('meet', 'Meet Brother Corhyn at Roundtable Hold', {
      kind: 'talk',
      done: talk(11109855, 'first conversation'),
      evidence: 'observed',
      where: { grace: TABLE_OF_LOST_GRACE },
      rewards: ['Prayer'],
      unlocks: ['Corhyn’s incantation shop'],
    }),
    step('leaving', 'Hear Corhyn out: he means to leave and find Goldmask', {
      kind: 'talk',
      done: any(
        talk(11109858, 'leaving talk played'),
        talk(11109859, 'leaving talk finished'),
        stage('junction'),
      ),
      evidence: 'script',
      where: { grace: TABLE_OF_LOST_GRACE },
      requires: [needsGate(GATES.altusGrace)],
      reload: true,
      note: 'The new Talk option appears once you have reached the Altus Plateau.',
    }),
    step('junction', 'Talk to Corhyn north of the Altus Highway Junction', {
      kind: 'talk',
      done: talk(1040529255, 'first talk at the junction'),
      evidence: 'observed',
      where: { grace: ALTUS_HIGHWAY_JUNCTION },
    }),
    step(
      'find-goldmask',
      'Find Goldmask on the northern stretch of the Forest-Spanning Greatbridge',
      {
        kind: 'talk',
        // Goldmask stands there whether or not Corhyn has left the Hold: only count it once Corhyn
        // has been met at the junction.
        done: all(
          talk(1040549255, 'interacted with Goldmask'),
          talk(1040529255, 'met Corhyn at the junction'),
        ),
        evidence: 'observed',
        where: { grace: FOREST_SPANNING_GREATBRIDGE },
        note: 'Reached through the waygate beside the grace.',
      },
    ),
    step('tell-corhyn', 'Tell Corhyn where Goldmask is', {
      kind: 'talk',
      done: talk(1040529259, 'told him the whereabouts'),
      evidence: 'script',
      where: { grace: ALTUS_HIGHWAY_JUNCTION },
      reload: true,
    }),
    step('greatbridge', 'Talk to Corhyn beside Goldmask on the Greatbridge', {
      kind: 'talk',
      done: any(
        talk(1040549205, 'first talk beside Goldmask'),
        talk(1040549207, 'heard about Goldmask'),
      ),
      evidence: 'script',
      where: { grace: FOREST_SPANNING_GREATBRIDGE },
      reload: true,
      note: 'Afterwards the pair head for Leyndell.',
    }),
    step('colosseum', 'Talk to Corhyn near the Leyndell colosseum', {
      kind: 'talk',
      done: talk(11009460, 'first talk in Leyndell'),
      evidence: 'observed',
      where: { note: 'Leyndell, Royal Capital: outside the Royal Colosseum' },
      requires: [
        {
          cond: world(182, 'holds two Great Runes'),
          label: 'Hold two Great Runes and enter Leyndell',
        },
      ],
    }),
    step(
      'principia',
      'Take the Golden Order Principia from the rafters above the Erdtree Sanctuary',
      {
        kind: 'item',
        where: { grace: ERDTREE_SANCTUARY },
        rewards: ['Golden Order Principia'],
        unlocks: [
          'Law of Regression in Corhyn’s shop, once you hand him the book',
        ],
        note: 'Hand it to Corhyn (or Miriel) to buy Law of Regression.',
      },
    ),
    step(
      'regression',
      'Cast Law of Regression before Radagon’s statue outside the Sanctuary',
      {
        kind: 'action',
        done: talk(11009556, 'statue riddle solved'),
        evidence: 'observed',
        where: { grace: ERDTREE_SANCTUARY },
      },
    ),
    step(
      'totality',
      'Tell Goldmask the answer: Golden Order Totality gesture',
      {
        kind: 'talk',
        // Not the gesture flag (60848): gestures carry over into NG+.
        done: talk(11009555, 'Goldmask told the answer'),
        evidence: 'script',
        where: { note: 'Leyndell: Goldmask beside the colosseum' },
        rewards: ['Golden Order Totality'],
        // Burning the Erdtree first kills Corhyn (`Event_4219`: 110 ∧ ¬11009555 → dead 4203).
        lockedBy: [lockedByGate(GATES.erdtreeBurned)],
      },
    ),
    step('corhyn-after', 'Talk to Corhyn again: Immutable Shield for sale', {
      kind: 'talk',
      done: any(
        talk(11009455, 'post-riddle talk'),
        talk(11009459, 'last Leyndell talk'),
      ),
      evidence: 'observed',
      where: { note: 'Leyndell: beside the colosseum' },
      unlocks: ['Immutable Shield in Corhyn’s shop'],
    }),
    step(
      'mountaintops',
      'Talk to Corhyn and Goldmask on the bridge south of the Stargazers’ Ruins',
      {
        kind: 'talk',
        done: any(
          talk(1051569355, 'first talk in the Mountaintops'),
          talk(1051569455, 'Goldmask in the Mountaintops'),
        ),
        evidence: 'observed',
        where: { grace: ANCIENT_SNOW_VALLEY_RUINS },
        requires: [needsGate(GATES.mountaintopsGrace)],
        note: 'Exhaust Corhyn’s dialogue here.',
      },
    ),
    step(
      'mending-rune',
      'Find Goldmask’s body in the Capital of Ash: Mending Rune of Perfect Order',
      {
        kind: 'item',
        done: any(
          pickup(11055019, 'Mending Rune picked up'),
          has(8182, 'Mending Rune of Perfect Order'),
        ),
        evidence: 'observed',
        where: { grace: LEYNDELL_CAPITAL_OF_ASH },
        requires: [needsGate(GATES.maliketh)],
        rewards: ['Mending Rune of Perfect Order'],
        unlocks: ['The Age of Order ending'],
        note: 'Corhyn dies once you reload the area.',
      },
    ),
    detour(
      'belongings',
      'Collect what Corhyn and Goldmask left behind',
      {
        reward:
          'Corhyn’s Bell Bearing, Flail and robe; Goldmask’s rags, bracelets and waistwrap',
      },
      [
        step('belongings-pickup', 'Loot Corhyn’s and Goldmask’s remains', {
          kind: 'item',
          done: any(
            pickup(400370, 'Corhyn’s Bell Bearing'),
            pickup(400500, 'Goldmask’s set'),
          ),
          evidence: 'observed',
          where: { grace: LEYNDELL_CAPITAL_OF_ASH },
          rewards: [
            "Corhyn's Bell Bearing",
            'Flail',
            "Corhyn's Robe",
            "Goldmask's Rags",
            'Gold Bracelets',
            'Gold Waistwrap',
          ],
          requires: [
            {
              cond: flag(4203, 'status', 'Corhyn is dead'),
              label: 'Reload the area after taking the Mending Rune',
            },
          ],
        }),
      ],
    ),
  ],
);
