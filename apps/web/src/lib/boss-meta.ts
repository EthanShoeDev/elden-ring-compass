/**
 * Curated boss knowledge that can't be (cleanly) derived from the extracted data:
 * the wiki-accurate Demigod / Shardbearer / Legend categorization, each Legend
 * boss's Remembrance reward, and the progression-ordered story-boss gallery.
 *
 * Sources (verified against the official wikis): a boss is a **Demigod** if it
 * descends from Marika/Radagon (a bloodline label), a **Shardbearer** if it holds
 * a Great Rune (Godrick, Radahn, Rykard, Morgott, Mohg, Malenia — plus Rennala's
 * Great Rune of the Unborn, which exists but does NOT count toward the 2-rune gate
 * into Leyndell), and a **Legend** boss if it drops a Remembrance. These overlap
 * but are distinct — e.g. Maliketh is neither a Demigod nor a Shardbearer; Rennala
 * is a Shardbearer but not a Demigod; Godfrey is a Demigod but holds no rune.
 *   https://eldenring.wiki.fextralife.com/Demigods
 *   https://eldenring.wiki.fextralife.com/Great+Runes
 *   https://eldenring.wiki.fextralife.com/Remembrance
 *
 * Keys are boss DEFEAT event-flag ids (the same ids in `BOSSES.defeatFlagId`, and
 * the bits the save records). A few gallery-only bosses aren't arena rows in
 * `BOSSES` (Starscourge Radahn, Radagon/Elden Beast, the Scadutree Avatar), so
 * their flags are curated here too — matching the existing gallery's approach.
 */
import { GOODS, REGIONS } from '@elden-ring-compass/data';
import { itemIconUrl } from '@elden-ring-compass/data/images';

export type BossBadge =
  | 'demigod'
  | 'shardbearer'
  | 'legend'
  | 'great-enemy'
  | 'field'
  | 'dungeon';

/** Boss defeat-flag → the good id it rewards (a Remembrance, or Heart of Bayle). */
const BOSS_REWARD_GOOD_BY_FLAG: ReadonlyMap<number, number> = new Map([
  // Base game — Remembrances (goods 2950–2964).
  [10000800, 2950], // Godrick the Grafted
  [11000800, 2952], // Morgott, the Omen King
  [11050800, 2957], // Godfrey / Hoarah Loux
  [12030850, 2960], // Lichdragon Fortissax
  [12040800, 2964], // Astel, Naturalborn of the Void
  [12050800, 2955], // Mohg, Lord of Blood
  [12090800, 2962], // Regal Ancestor Spirit
  [13000800, 2956], // Maliketh, the Black Blade
  [13000830, 2958], // Dragonlord Placidusax
  [14000800, 2959], // Rennala, Queen of the Full Moon
  [15000800, 2954], // Malenia, Blade of Miquella
  [16000800, 2953], // Rykard, Lord of Blasphemy
  [19000800, 2963], // Elden Beast (arena flag)
  [1052520800, 2961], // Fire Giant
  [1252380800, 2951], // Starscourge Radahn (Wailing Dunes arena, m60_52_38)
  // Gallery-only flags (no GameAreaParam arena row).
  [19000810, 2963], // Radagon / Elden Beast (gallery flag)
  // Shadow of the Erdtree — Remembrances (goods 2002900–2002910).
  [20000800, 2002905], // Divine Beast Dancing Lion
  [20010800, 2002907], // Promised Consort Radahn
  [20020800, 2002902], // Scadutree Avatar
  [21010800, 2002901], // Messmer the Impaler
  [22000800, 2002910], // Putrescent Knight
  [25000800, 2002909], // Metyr, Mother of Fingers
  [28000800, 2002908], // Midra, Lord of Frenzied Flame
  [2044450800, 2002904], // Romina, Saint of the Bud
  [2048440800, 2002903], // Rellana, Twin Moon Knight
  [2049480800, 2002900], // Commander Gaius
  [2054390800, 2008011], // Bayle the Dread → Heart of Bayle (Legend drop, not a Remembrance)
]);

/** Demigods (descendants of Marika/Radagon). A bloodline label, not a tier. */
const DEMIGOD_FLAGS: ReadonlySet<number> = new Set([
  10000800, // Godrick
  11000800, // Morgott
  11050800, // Godfrey / Hoarah Loux
  12050800, // Mohg, Lord of Blood
  16000800, // Rykard
  15000800, // Malenia
  1252380800, // Starscourge Radahn
  21010800, // Messmer
  20010800, // Promised Consort Radahn (Radahn + Miquella)
]);

/** Shardbearers — hold a Great Rune. Rennala's (the Unborn) doesn't open Leyndell. */
const SHARDBEARER_FLAGS: ReadonlySet<number> = new Set([
  10000800, // Godrick
  1252380800, // Starscourge Radahn
  16000800, // Rykard
  11000800, // Morgott
  12050800, // Mohg, Lord of Blood
  15000800, // Malenia
  14000800, // Rennala (Great Rune of the Unborn)
]);

const goodById = new Map(GOODS.map((g) => [g.id, g]));

/** The Remembrance/Legend reward a boss drops (name + icon), or undefined. */
export function bossReward(
  flag: number,
): { name: string; iconUrl: string | undefined; isRemembrance: boolean } | undefined {
  const goodId = BOSS_REWARD_GOOD_BY_FLAG.get(flag);
  if (goodId === undefined) return undefined;
  const good = goodById.get(goodId);
  if (!good) return undefined;
  return {
    name: good.name,
    iconUrl: itemIconUrl(good.icon),
    isRemembrance: good.category === 'Remembrance',
  };
}

/** A Legend boss is anything that drops a Remembrance (or is a Shardbearer/Demigod). */
const isLegend = (flag: number): boolean =>
  BOSS_REWARD_GOOD_BY_FLAG.has(flag) || DEMIGOD_FLAGS.has(flag) || SHARDBEARER_FLAGS.has(flag);

/**
 * The category badges for any boss, most-significant first. Demigod/Shardbearer/
 * Legend are wiki-accurate; the coarse "Field"/"Dungeon"/"Great Enemy" tier for
 * everything else is derived from the arena map id (overworld vs minor dungeon vs
 * legacy area) — a readable stand-in for the wiki's mini-boss tiers.
 */
export function bossBadges(flag: number, mapId: string): BossBadge[] {
  const badges: BossBadge[] = [];
  if (DEMIGOD_FLAGS.has(flag)) badges.push('demigod');
  if (SHARDBEARER_FLAGS.has(flag)) badges.push('shardbearer');
  // Legend is implied by Demigod/Shardbearer (all drop Remembrances); only surface
  // it on its own when the boss isn't already tagged with one of those.
  if (badges.length === 0 && isLegend(flag)) badges.push('legend');
  if (badges.length > 0) return badges;

  const area = Number(/^m(\d+)_/.exec(mapId)?.[1] ?? -1);
  if (area === 60 || area === 61) return ['field'];
  // Catacombs/caves/tunnels/etc. — the minor procedural-ish dungeons.
  if ([30, 31, 32, 34, 39, 40, 41, 43].includes(area)) return ['dungeon'];
  // Legacy/main areas (Stormveil, Leyndell, Raya Lucaria, …) → mid-tier boss.
  return ['great-enemy'];
}

export const BADGE_LABEL: Record<BossBadge, string> = {
  demigod: 'Demigod',
  shardbearer: 'Shardbearer',
  legend: 'Legend',
  'great-enemy': 'Great Enemy',
  field: 'Field Boss',
  dungeon: 'Dungeon Boss',
};

// --- map id → readable area name -------------------------------------------

/** `${area}_${block}` → readable place name, derived from REGIONS. */
const REGION_NAME_BY_BLOCK: ReadonlyMap<string, string> = (() => {
  // Group regions by their area+block (the first two map-id segments, encoded in
  // the region id as area*100000 + block*1000 + index).
  const byBlock = new Map<string, { name: string; area: string | null }[]>();
  for (const r of REGIONS) {
    const area = Math.floor(r.id / 100000);
    const block = Math.floor((r.id % 100000) / 1000);
    const key = `${area}_${block}`;
    const cur = byBlock.get(key);
    if (cur) cur.push({ name: r.name, area: r.area });
    else byBlock.set(key, [{ name: r.name, area: r.area }]);
  }
  const mode = (xs: (string | null)[]): string | undefined => {
    const counts = new Map<string, number>();
    for (const x of xs) if (x) counts.set(x, (counts.get(x) ?? 0) + 1);
    let best: string | undefined;
    let bestN = 0;
    for (const [k, n] of counts) {
      if (n > bestN) {
        best = k;
        bestN = n;
      }
    }
    return best;
  };
  const out = new Map<string, string>();
  for (const [key, regions] of byBlock) {
    const first = regions[0];
    if (!first) continue;
    const names = new Set(regions.map((r) => r.name));
    // A single-region block is a self-contained dungeon (e.g. a catacomb) — its
    // `name` IS the place. A multi-region block is a big legacy area (Stormveil,
    // Leyndell, …) whose shared `area` names the whole dungeon.
    const label =
      names.size === 1 ? first.name : (mode(regions.map((r) => r.area)) ?? first.name);
    out.set(key, label);
  }
  return out;
})();

/** Broad fallbacks for map areas with no REGIONS entry (the overworlds). */
const AREA_FALLBACK: Record<number, string> = {
  60: 'The Lands Between',
  61: 'Land of Shadow',
};

/** Turn an arena map id (`m10_00_00_00`) into a readable place ("Stormveil Castle"). */
export function bossMapName(mapId: string): string {
  const m = /^m(\d+)_(\d+)_/.exec(mapId);
  if (!m) return mapId;
  const area = Number(m[1]);
  const block = Number(m[2]);
  return REGION_NAME_BY_BLOCK.get(`${area}_${block}`) ?? AREA_FALLBACK[area] ?? mapId;
}

// --- the progression-ordered story gallery ---------------------------------

export interface GalleryBoss {
  /** Defeat event-flag id (read straight from the save bitfield). */
  flag: number;
  name: string;
  badges: BossBadge[];
  /** On the critical path to an ending (vs. optional/side). */
  required: boolean;
  /** Short qualifier under the name (e.g. "Great Rune", "Final boss"). */
  note?: string;
}

export interface GalleryGroup {
  title: string;
  subtitle: string;
  bosses: GalleryBoss[];
}

export const BOSS_GALLERY: readonly GalleryGroup[] = [
  {
    title: 'Shardbearers — claim two Great Runes',
    subtitle:
      'Any two Great Runes open Leyndell — none of these Shardbearers is individually required, and you can even skip Stormveil (and Godrick) to claim your two elsewhere.',
    bosses: [
      { flag: 10000800, name: 'Godrick the Grafted', badges: ['demigod', 'shardbearer'], required: false, note: 'Great Rune' },
      { flag: 14000800, name: 'Rennala, Queen of the Full Moon', badges: ['shardbearer'], required: false, note: 'Rune unlocks respec' },
      { flag: 1252380800, name: 'Starscourge Radahn', badges: ['demigod', 'shardbearer'], required: false, note: 'Great Rune' },
      { flag: 16000800, name: 'Praetor Rykard', badges: ['demigod', 'shardbearer'], required: false, note: 'Great Rune' },
    ],
  },
  {
    title: 'Leyndell & the Mountaintops',
    subtitle: 'Through the Royal Capital to the Forge of the Giants.',
    bosses: [
      { flag: 11000800, name: 'Morgott, the Omen King', badges: ['demigod', 'shardbearer'], required: true, note: 'Great Rune' },
      { flag: 1052520800, name: 'Fire Giant', badges: ['legend'], required: true },
    ],
  },
  {
    title: 'The Ashen Endgame',
    subtitle: 'Crumbling Farum Azula to the foot of the Erdtree.',
    bosses: [
      { flag: 13000800, name: 'Maliketh, the Black Blade', badges: ['legend'], required: true },
      { flag: 11050800, name: 'Hoarah Loux, Godfrey', badges: ['demigod', 'legend'], required: true },
      { flag: 19000810, name: 'Radagon / Elden Beast', badges: ['legend'], required: true, note: 'Final boss' },
    ],
  },
  {
    title: 'Optional Legends',
    subtitle: 'Major Remembrance bosses off the critical path.',
    bosses: [
      { flag: 12050800, name: 'Mohg, Lord of Blood', badges: ['demigod', 'shardbearer'], required: false, note: 'Opens the DLC' },
      { flag: 15000800, name: 'Malenia, Blade of Miquella', badges: ['demigod', 'shardbearer'], required: false, note: 'Haligtree' },
      { flag: 12030850, name: 'Lichdragon Fortissax', badges: ['legend'], required: false },
      { flag: 12040800, name: 'Astel, Naturalborn of the Void', badges: ['legend'], required: false },
      { flag: 13000830, name: 'Dragonlord Placidusax', badges: ['legend'], required: false },
      { flag: 12090800, name: 'Regal Ancestor Spirit', badges: ['legend'], required: false },
    ],
  },
  {
    title: 'Shadow of the Erdtree — the main path',
    subtitle:
      'Enter through Mohg’s arena after felling Radahn and Mohg, then raise your Scadutree Blessing as you go.',
    bosses: [
      { flag: 20000800, name: 'Divine Beast Dancing Lion', badges: ['legend'], required: false },
      { flag: 2048440800, name: 'Rellana, Twin Moon Knight', badges: ['legend'], required: true },
      { flag: 21010800, name: 'Messmer the Impaler', badges: ['demigod', 'legend'], required: true },
      { flag: 2044450800, name: 'Romina, Saint of the Bud', badges: ['legend'], required: true },
      { flag: 20010800, name: 'Promised Consort Radahn', badges: ['demigod', 'legend'], required: true, note: 'DLC final boss' },
    ],
  },
  {
    title: 'Shadow of the Erdtree — optional Remembrances',
    subtitle: 'Powerful side bosses scattered across the Realm of Shadow.',
    bosses: [
      { flag: 2054390800, name: 'Bayle the Dread', badges: ['legend'], required: false },
      { flag: 28000800, name: 'Midra, Lord of Frenzied Flame', badges: ['legend'], required: false },
      { flag: 25000800, name: 'Metyr, Mother of Fingers', badges: ['legend'], required: false },
      { flag: 2049480800, name: 'Commander Gaius', badges: ['legend'], required: false },
      { flag: 22000800, name: 'Putrescent Knight', badges: ['legend'], required: false },
      { flag: 20020800, name: 'Scadutree Avatar', badges: ['legend'], required: false },
    ],
  },
];
