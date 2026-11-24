import { any, boss, type Cond, flag, world } from './cond';

/**
 * A world-progression milestone. Questlines reference gates in two ways: as a **requirement** (a
 * step can't happen until you've beaten Godrick) and as a **lock** (a step can never happen once
 * you've lit a grace in Liurnia). Shared, named gates let the UI group warnings by what the
 * player is about to do: "Before you light a grace in Liurnia: …".
 *
 * `label` is imperative ("Burn the Erdtree") so it reads both ways: "Do this before you burn the
 * Erdtree" and "Locked out: you burned the Erdtree".
 *
 * Add a gate here when more than one questline needs it; a gate only one questline uses can be
 * defined in that line's file with `defineGate`.
 */
export interface Gate {
  readonly id: string;
  readonly label: string;
  readonly cond: Cond;
}

export const defineGate = (id: string, label: string, cond: Cond): Gate => ({
  id,
  label,
  cond,
});

const bossGate = (id: string, name: string, defeatFlagId: number): Gate =>
  defineGate(id, `Defeat ${name}`, boss(defeatFlagId, name));

export const GATES = {
  // ── Region reached (Talk_Common `篝火1つでも点灯した_*`: at least one grace lit there) ──
  /** 3062 `_湖` ("lake"). Confirmed by `common.evs.py` Event_3719 (moves Roderika on it). */
  liurniaGrace: defineGate(
    'liurnia-grace',
    'Light any Site of Grace in Liurnia',
    world(3062, 'a Liurnia grace has been lit'),
  ),
  /** 3063 `_高山` ("highlands"): Altus Plateau, by the name. Verify before relying on it. */
  altusGrace: defineGate(
    'altus-grace',
    'Light any Site of Grace on the Altus Plateau',
    world(3063, 'an Altus Plateau grace has been lit'),
  ),
  /** 3065 `_雪山` ("snowy mountains"): Mountaintops of the Giants, by the name. Verify. */
  mountaintopsGrace: defineGate(
    'mountaintops-grace',
    'Light any Site of Grace in the Mountaintops of the Giants',
    world(3065, 'a Mountaintops grace has been lit'),
  ),

  // ── Story bosses (defeat flags from `BOSSES` / `lib/boss-meta.ts`) ──
  margit: bossGate('margit', 'Margit, the Fell Omen', 10000850),
  godrick: bossGate('godrick', 'Godrick the Grafted', 10000800),
  rennala: bossGate('rennala', 'Rennala, Queen of the Full Moon', 14000800),
  radahn: bossGate('radahn', 'Starscourge Radahn', 1252380800),
  rykard: bossGate('rykard', 'Rykard, Lord of Blasphemy', 16000800),
  morgott: bossGate('morgott', 'Morgott, the Omen King', 11000800),
  mohg: bossGate('mohg', 'Mohg, Lord of Blood', 12050800),
  malenia: bossGate('malenia', 'Malenia, Blade of Miquella', 15000800),
  fireGiant: bossGate('fire-giant', 'the Fire Giant', 1052520800),
  maliketh: bossGate('maliketh', 'Maliketh, the Black Blade', 13000800),
  godfrey: bossGate('godfrey', 'Godfrey, First Elden Lord', 11050800),
  eldenBeast: bossGate('elden-beast', 'the Elden Beast', 19000800),

  astel: bossGate('astel', 'Astel, Naturalborn of the Void', 12040800),
  magmaWyrmMakar: bossGate('magma-wyrm-makar', 'Magma Wyrm Makar', 39200800),

  // ── World events ──
  /**
   * 9410 `ラダーン祭：祭り準備` (festival announced): `common.evs.py` sets it once Sellen or Seluvis
   * tells you of Radahn (1044369223 / 1034499224) or an Altus grace is lit (3063). It is not on
   * from the start. 9411 (festival in session) follows on reaching Redmane Castle.
   */
  radahnFestival: defineGate(
    'radahn-festival',
    'Start the Radahn Festival (hear of Radahn from Sellen or Seluvis, or reach the Altus Plateau)',
    world(9410, 'the Radahn Festival has begun'),
  ),
  /**
   * 108 `狂い火を受領`: accepted the Frenzied Flame from the Three Fingers. It overrides every
   * ending but its own unless cured with Miquella's Needle (116, see `endings.ts`).
   */
  frenziedFlame: defineGate(
    'frenzied-flame',
    'Accept the Frenzied Flame from the Three Fingers',
    world(108, 'the Frenzied Flame was accepted'),
  ),
  /** Flag 110 `巨人の釜`; `common.evs.py` moves NPCs to their post-burning states on it. */
  erdtreeBurned: defineGate(
    'erdtree-burned',
    'Burn the Erdtree at the Forge of the Giants',
    world(110, 'the Erdtree has burned'),
  ),

  // ── Shadow of the Erdtree ──
  /**
   * Touching the cocoon in Mohg's palace (`m12_05_00_00` Event_12052500) turns on 62002 / 82002
   * before the warp; the Gravesite Plain grace (76800) is a fallback.
   */
  landOfShadow: defineGate(
    'land-of-shadow',
    'Enter the Land of Shadow (touch the cocoon in Mohg’s palace)',
    any(
      world(62002, 'the cocoon has been touched'),
      world(82002, 'the cocoon has been touched'),
      flag(76800, 'grace', 'the Gravesite Plain grace is lit'),
    ),
  ),
  /**
   * 4927: set by the region triggers `m61_48_46_00` Event_2048462490 (the Shadow Keep's front
   * gate) and `m61_51_44_00` Event_2051442490 (east past Bonny Village), with special effect
   * 20004230. The flowchart's "Miquella's Great Rune & Charm are broken".
   */
  miquellaCharmBroken: defineGate(
    'miquella-charm-broken',
    'Break Miquella’s charm (approach the Shadow Keep’s front gate, or head east past Bonny Village)',
    world(4927, 'Miquella’s charm is broken'),
  ),
  /** 330: burning the Sealing Tree with Messmer's Kindling (`common.evs.py` Event_916). */
  sealingTreeBurned: defineGate(
    'sealing-tree-burned',
    'Burn the Sealing Tree and enter Enir-Ilim',
    world(330, 'the Sealing Tree has burned'),
  ),
  /** 20010850: the fight against Needle Knight Leda and her allies in Enir-Ilim. */
  miquellasFaithful: bossGate(
    'miquellas-faithful',
    'Miquella’s Faithful (Leda and her allies) in Enir-Ilim',
    20010850,
  ),
  messmer: bossGate('messmer', 'Messmer the Impaler', 21010800),
  consortRadahn: bossGate(
    'consort-radahn',
    'Promised Consort Radahn',
    20010800,
  ),
} as const satisfies Record<string, Gate>;
