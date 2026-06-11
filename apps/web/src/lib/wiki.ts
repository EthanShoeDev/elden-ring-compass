/**
 * Links to the Fextralife Elden Ring wiki. We only ever LINK out — the wiki's
 * rules forbid scraping its content (docs/projects/elden-ring-wiki-integration.md),
 * so nothing here fetches or embeds wiki pages.
 *
 * Page URLs are the entity's display name with whitespace collapsed to `+`;
 * punctuation the wiki keeps verbatim (commas, colons, apostrophes) passes
 * through:
 *   "Margit, the Fell Omen"   → /Margit,+the+Fell+Omen
 *   "Ash of War: Storm Stomp" → /Ash+of+War:+Storm+Stomp
 * Game-text quirks the wiki normalizes out of its page names: the `+` of
 * upgrade suffixes ("Crimson Amber Medallion +1" → ".. Medallion 1" — only some
 * pages have a `++1` redirect), double quotes ("Prattling Pate \"Hello\"" →
 * "Prattling Pate Hello"), bracketed tiers ("Smithing Stone [4]" → "(4)"), and
 * typographic apostrophes (→ '). All of these — and the item-name rules below —
 * are validated against the live wiki by `scripts/wiki-link-check.ts`.
 */
export const WIKI_BASE_URL = 'https://eldenring.wiki.fextralife.com';

/** Catalog rows with no wiki page at all (placeholder/cut rows + two unlisted items). */
const NO_WIKI_PAGE = new Set([
  // Armaments placeholders.
  'Unarmed',
  'DLC dummy',
  // Armor placeholder slots.
  'Head',
  'Body',
  'Arms',
  'Legs',
  // Real items the wiki simply has no page for.
  'Phantom Recusant Finger',
  'Erdtree Prayerbook',
]);

/** Names whose wiki page is titled irregularly (no derivable rule). */
const WIKI_NAME_OVERRIDES = new Map([
  // Five spirit-ash rows whose dataset name omits the "Ashes" the wiki title has.
  ['Banished Knight Engvall', 'Banished Knight Engvall Ashes'],
  ['Blackflame Monk Amon', 'Blackflame Monk Amon Ashes'],
  ['Cleanrot Knight Finlay', 'Cleanrot Knight Finlay Ashes'],
  ['Depraved Perfumer Carmaan', 'Depraved Perfumer Carmaan Ashes'],
  ['Redmane Knight Ogha', 'Redmane Knight Ogha Ashes'],
  ["Zorayas's Letter", "Zorayas' Letter"],
]);

/**
 * The DLC's map fragments keep the game's colon form as their wiki title
 * ("Map: Gravesite Plain") — only the base game's are retitled "Map (X)".
 */
const DLC_MAP_FRAGMENTS = new Set([
  'Gravesite Plain',
  'Scadu Altus',
  'Southern Shore',
  'Rauh Ruins',
  'Abyss',
]);

/** Bosses whose wiki page is titled differently from the dataset name. */
const BOSS_WIKI_NAME_OVERRIDES = new Map([
  ['Fell Twin', 'Fell Twins'],
  ['Spiritcaller Snail', 'Spirit-Caller Snail'],
  ['Miranda Blossom', 'Miranda the Blighted Bloom'],
  ['Putrid Crystalian', 'Putrid Crystalians'],
]);

/**
 * The wiki page name for a boss. Weapon-variant disambiguators — "Cleanrot
 * Knight (Spear)" — aren't separate wiki pages; the shared enemy/boss page is.
 */
export function wikiNameForBoss(name: string): string {
  const base = name.replace(/ \([^)]+\)$/, '');
  return BOSS_WIKI_NAME_OVERRIDES.get(base) ?? base;
}

/**
 * The wiki page name an inventory row should link, or `null` when the wiki has
 * no page for it (linking nothing beats linking a 404).
 *
 * Affinity variants link their base weapon's page (`baseName` — the wiki has no
 * "Heavy Dagger" page), and a save-appended " +N" upgrade suffix is stripped —
 * it's transient save state, not part of the page name. Catalog-level "+1"
 * names (talismans) keep theirs: un-upgradeable rows always have
 * `weaponUpgradeLevel` 0. Flasks are the exception — their upgrade tiers ARE
 * catalog rows, but share one wiki page.
 */
export function wikiNameForItem(row: {
  name: string;
  baseName?: string;
  weaponUpgradeLevel?: number;
  category?: string;
}): string | null {
  // Individual gestures have no pages — they all live on the one Gestures page.
  if (row.category === 'Gesture') return 'Gestures';
  const name =
    row.baseName ??
    ((row.weaponUpgradeLevel ?? 0) > 0 ? row.name.replace(/ \+\d+$/, '') : row.name);
  if (NO_WIKI_PAGE.has(name)) return null;
  const override = WIKI_NAME_OVERRIDES.get(name);
  if (override !== undefined) return override;
  // Flask upgrade tiers ("Flask of Crimson Tears +4") share the base flask's page.
  if (/^Flask of .+ \+\d+$/.test(name)) return name.replace(/ \+\d+$/, '');
  // Map fragments: base-game "Map: Limgrave, West" is titled "Map (Limgrave, West)".
  const mapRegion = /^Map: (.+)$/.exec(name)?.[1];
  if (mapRegion !== undefined && !DLC_MAP_FRAGMENTS.has(mapRegion)) return `Map (${mapRegion})`;
  return name;
}

export function wikiPageUrl(name: string): string {
  const page = name
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/"/g, '')
    .replace(/\[(\d+)\]/g, '($1)')
    .replace(/\+(?=\d)/g, '')
    .replace(/\s+/g, '+');
  return `${WIKI_BASE_URL}/${encodeURI(page)}`;
}
