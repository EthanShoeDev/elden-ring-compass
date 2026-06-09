// Completion model — the data behind the Overview "how close am I to 100%?" tracker.
//
// The denominator is CURATED, not the raw catalog (see docs/projects/overview-completion-tracker.md):
//  - Weapons collapse their affinity variants (Bleed Dagger ← Dagger via Ash of War) to one base.
//  - Armor collapses its "(Altered)" variants (Boc the tailor) to one base.
//  - Talismans (+1/+2 are separate world pickups), spells, spirit ashes, ashes of war and gestures
//    count every row — each is a distinct collectible, not a transform of another.
// `[ERROR]Type N` placeholder rows are already filtered out at the catalog source
// (inventory-catalog.ts), so the counts here are clean.
import { useMemo } from 'react';

import { ARMOR, GOODS } from '@elden-ring-compass/data';
import { itemIconUrl } from '@elden-ring-compass/data/images';

import { useSelectedSlot } from '@/stores/slot-selection-store';
import { type InventoryRow, useInventoryTables } from './inventory-catalog';
import { Slot } from './save-dto';
import { eventsDbView } from './vm/events';
import { equipmentDbView } from './vm/equipement';
import { inventoryDbView } from './vm/inventory';

/** One progress row in the breakdown. `categorySlug` deep-links into the matching inventory table. */
export type CompletionCategory = {
  key: string;
  label: string;
  owned: number;
  total: number;
  pct: number;
  /** `/inventory/$category` slug to jump to (Missing-filtered), when this maps to a table. */
  categorySlug?: string;
  /** A non-inventory destination (bosses / graces routes). */
  to?: string;
};

/** A small "collect them all" set, rendered as a trophy chip. */
export type Milestone = {
  key: string;
  label: string;
  owned: number;
  total: number;
};

export type CompletionModel = {
  hasSave: boolean;
  overallPct: number;
  categories: CompletionCategory[];
  milestones: Milestone[];
};

const pct = (owned: number, total: number) => (total > 0 ? Math.round((owned / total) * 100) : 0);

/** Group rows where several catalog rows are transforms of one collectible (weapons, armor). */
function collapse(
  items: ReadonlyArray<InventoryRow>,
  keyOf: (row: InventoryRow) => string | number,
) {
  const anyOwned = new Map<string | number, boolean>();
  for (const it of items) {
    const k = keyOf(it);
    anyOwned.set(k, (anyOwned.get(k) ?? false) || it.quantity > 0);
  }
  return {
    total: anyOwned.size,
    owned: [...anyOwned.values()].filter(Boolean).length,
  };
}

const armorIconById = new Map(ARMOR.map((a) => [a.id, a.icon]));

/** Icon url for the character's equipped helm (the completion ring's center), or undefined if bareheaded. */
export function equippedHelmIconUrl(slot?: Readonly<Slot>): string | undefined {
  if (!slot) return undefined;
  const headId = equipmentDbView(slot).head.id;
  if (!headId) return undefined;
  const icon = armorIconById.get(headId);
  return icon != null ? (itemIconUrl(icon) ?? undefined) : undefined;
}

// Curated "collect them all" sets — clean GOODS categories (counts verified 2026-06-07).
const MILESTONE_SETS: ReadonlyArray<{
  key: string;
  label: string;
  category: string;
}> = [
  { key: 'greatRunes', label: 'Great Runes', category: 'Great Rune' },
  { key: 'remembrances', label: 'Remembrances', category: 'Remembrance' },
];

export function useCompletion(): CompletionModel {
  const slot = useSelectedSlot();
  const tables = useInventoryTables();

  return useMemo(() => {
    const events = eventsDbView(slot);
    const bosses = events.filter((e) => e.type === 'boss');
    const graces = events.filter((e) => e.type === 'grace');

    // Weapons: collapse affinity variants by their shared base id (affinityIndex 0 sibling).
    const weapons = collapse(
      tables.armaments.items,
      (r) => (r as { baseId?: number }).baseId ?? r.id,
    );
    // Armor: collapse "(Altered)" tailor variants by base name.
    const armor = collapse(tables.armor.items, (r) => r.name.replace(/\s*\(Altered\)\s*$/, ''));

    // Gestures aren't inventory items (no quantity) — they live in the save's 64-slot gesture
    // unlock table (`0` / `0xFFFFFFFE` mark empty slots), so count distinct learned gestures there.
    const ownedGestures = slot
      ? new Set(slot.gestures.filter((g) => g !== 0 && g !== 0xfffffffe)).size
      : 0;

    const cat = (
      key: string,
      label: string,
      owned: number,
      total: number,
      extra?: Partial<CompletionCategory>,
    ): CompletionCategory => ({
      key,
      label,
      owned,
      total,
      pct: pct(owned, total),
      ...extra,
    });

    // `ownedCount` on the inventory tables already counts distinct rows with quantity > 0.
    const categories: CompletionCategory[] = [
      cat('bosses', 'Bosses', bosses.filter((e) => e.on).length, bosses.length, { to: '/bosses' }),
      cat('graces', 'Sites of Grace', graces.filter((e) => e.on).length, graces.length),
      cat('weapons', 'Weapons', weapons.owned, weapons.total, {
        categorySlug: 'weapons-shields',
      }),
      cat('armor', 'Armor', armor.owned, armor.total, {
        categorySlug: 'armor',
      }),
      cat('talismans', 'Talismans', tables.talismans.ownedCount, tables.talismans.items.length, {
        categorySlug: 'talismans',
      }),
      cat(
        'spells',
        'Sorceries & Incantations',
        tables.spells.ownedCount,
        tables.spells.items.length,
        {
          categorySlug: 'spells',
        },
      ),
      cat('spirits', 'Spirit Ashes', tables.spirits.ownedCount, tables.spirits.items.length, {
        categorySlug: 'spirit-ashes',
      }),
      cat('ashes', 'Ashes of War', tables.ashes.ownedCount, tables.ashes.items.length, {
        categorySlug: 'ashes-of-war',
      }),
      cat('gestures', 'Gestures', ownedGestures, tables.gestures.items.length, {
        categorySlug: 'gestures',
      }),
    ];

    // Overall = equal-weight mean of category percentages (so weapons' large count doesn't dominate).
    const overallPct = categories.length
      ? Math.round(categories.reduce((s, c) => s + c.pct, 0) / categories.length)
      : 0;

    const ownedIds = new Set<number>();
    if (slot)
      for (const it of inventoryDbView(slot).items) if (it.quantity > 0) ownedIds.add(it.item_id);
    const milestones: Milestone[] = MILESTONE_SETS.map(({ key, label, category }) => {
      const set = GOODS.filter((g) => g.category === category && !g.name.startsWith('[ERROR]'));
      return {
        key,
        label,
        total: set.length,
        owned: set.filter((g) => ownedIds.has(g.id)).length,
      };
    });

    return { hasSave: !!slot, overallPct, categories, milestones };
  }, [slot, tables]);
}
