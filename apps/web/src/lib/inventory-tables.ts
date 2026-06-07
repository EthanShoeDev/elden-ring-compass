import type { InventoryTableType } from './inventory-catalog';

export type InventoryTableMeta = {
  key: InventoryTableType;
  /** Public URL form of the key — the `/inventory/$category` param. */
  slug: string;
  label: string;
};

/**
 * Order + URL slug + display label for each inventory table. Single source of
 * truth shared by the sidebar nav, the `/inventory/$category` route, and the
 * inventory card's category picker — so the three never drift. Type-only import
 * of `InventoryTableType` keeps this module free of the heavy data deps that
 * `inventory-catalog` pulls in, so the shell can import it cheaply.
 */
export const INVENTORY_TABLES: readonly InventoryTableMeta[] = [
  { key: 'armaments', slug: 'weapons-shields', label: 'Weapons & Shields' },
  { key: 'ammo', slug: 'ammunition', label: 'Ammunition' },
  { key: 'armor', slug: 'armor', label: 'Armor' },
  { key: 'talismans', slug: 'talismans', label: 'Talismans' },
  { key: 'ashes', slug: 'ashes-of-war', label: 'Ashes of War' },
  { key: 'spells', slug: 'spells', label: 'Spells' },
  { key: 'spirits', slug: 'spirit-ashes', label: 'Spirit Ashes' },
  { key: 'tools', slug: 'tools', label: 'Tools' },
  { key: 'craftingMaterials', slug: 'crafting-materials', label: 'Crafting Materials' },
  { key: 'upgradeMaterials', slug: 'bolstering-materials', label: 'Bolstering Materials' },
  { key: 'keyItems', slug: 'key-items', label: 'Key Items' },
  { key: 'infoItems', slug: 'info-items', label: 'Info Items' },
  { key: 'gestures', slug: 'gestures', label: 'Gestures' },
];

/** The default category landed on at bare `/inventory`. */
export const DEFAULT_INVENTORY_SLUG = INVENTORY_TABLES[0]!.slug;

export const TABLE_LABEL = Object.fromEntries(
  INVENTORY_TABLES.map((t) => [t.key, t.label]),
) as Record<InventoryTableType, string>;

export const SLUG_TO_TYPE = Object.fromEntries(
  INVENTORY_TABLES.map((t) => [t.slug, t.key]),
) as Record<string, InventoryTableType | undefined>;

export const TYPE_TO_SLUG = Object.fromEntries(
  INVENTORY_TABLES.map((t) => [t.key, t.slug]),
) as Record<InventoryTableType, string>;
