import { ARMOR, GOODS } from '@elden-ring-compass/data';
import { itemIconUrl } from '@elden-ring-compass/data/images';
import { Array as Arr, String as Str } from 'effect';
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

import { useSelectedSlot } from '@/stores/slot-selection-store';

import { rewardBossFlags } from './boss-meta';
import { type DlcScope, inDlcScope } from './dlc';
import { useDlcScope } from './dlc-scope';
import { type InventoryRow, useInventoryTables } from './inventory-catalog';
import type { Slot } from './save-dto';
import { equipmentDbView } from './vm/equipement';
import { eventsDbView, isEventFlagOn } from './vm/events';
import { goodsQuantityById } from './vm/inventory';

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

const pct = (owned: number, total: number) =>
  total > 0 ? Math.round((owned / total) * 100) : 0;

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
    owned: Arr.filter(anyOwned.values(), Boolean).length,
  };
}

const armorIconById = new Map(Arr.map(ARMOR, (a) => [a.id, a.icon]));

/** Icon url for the character's equipped helm (the completion ring's center), or undefined if bareheaded. */
export function equippedHelmIconUrl(slot?: Readonly<Slot>): string | undefined {
  if (!slot) return undefined;
  const headId = equipmentDbView(slot).head.id;
  if (!headId) return undefined;
  const icon = armorIconById.get(headId);
  return icon !== undefined ? (itemIconUrl(icon) ?? undefined) : undefined;
}

type Good = (typeof GOODS)[number];

// A Great Rune is held in one of two forms: unrestored (a "Key Item" of the same name,
// 8148–8153) until it's restored at its Divine Tower (the "Great Rune" category, 191–196).
const unrestoredGreatRuneIdByName = new Map(
  Arr.map(
    Arr.filter(GOODS, (g) => g.category === 'Key Item'),
    (g) => [g.name, g.id],
  ),
);

// Curated "collect them all" sets — clean GOODS categories (counts verified 2026-06-07).
// `collected` decides one good given what's held; the default is "held at all".
const MILESTONE_SETS: ReadonlyArray<{
  key: string;
  label: string;
  category: string;
  collected: (
    good: Good,
    held: (id: number) => boolean,
    slot: Readonly<Slot>,
  ) => boolean;
}> = [
  {
    key: 'greatRunes',
    label: 'Great Runes',
    category: 'Great Rune',
    collected: (g, held) =>
      held(g.id) || held(unrestoredGreatRuneIdByName.get(g.name) ?? -1),
  },
  {
    key: 'remembrances',
    label: 'Remembrances',
    category: 'Remembrance',
    // Traded-in Remembrances leave the inventory; the boss kill still proves collection.
    collected: (g, held, slot) =>
      held(g.id) ||
      Arr.some(rewardBossFlags(g.id), (flag) => isEventFlagOn(slot, flag)),
  },
];

/** Great Rune / Remembrance trophy progress for a save slot (0 owned without one), within `scope`. */
export function completionMilestones(
  slot: Readonly<Slot> | undefined,
  scope: DlcScope = 'all',
): Milestone[] {
  const goodsQuantities = slot
    ? goodsQuantityById(slot)
    : new Map<number, number>();
  const held = (id: number) => (goodsQuantities.get(id) ?? 0) > 0;
  return Arr.map(MILESTONE_SETS, ({ key, label, category, collected }) => {
    const set = Arr.filter(
      GOODS,
      (g) =>
        g.category === category &&
        !Str.startsWith('[ERROR]')(g.name) &&
        inDlcScope(scope, g.isDlc),
    );
    return {
      key,
      label,
      total: set.length,
      owned: slot ? Arr.filter(set, (g) => collected(g, held, slot)).length : 0,
    };
  });
}

export function useCompletion(): CompletionModel {
  const slot = useSelectedSlot();
  const tables = useInventoryTables();
  const { scope } = useDlcScope();

  return useMemo(() => {
    const events = eventsDbView(slot, scope);
    const bosses = Arr.filter(events, (e) => e.type === 'boss');
    const graces = Arr.filter(events, (e) => e.type === 'grace');

    // Weapons: collapse affinity variants by their shared base id (affinityIndex 0 sibling).
    const weapons = collapse(
      tables.armaments.items,
      (r) => (r as { baseId?: number }).baseId ?? r.id,
    );
    // Armor: collapse "(Altered)" tailor variants by base name.
    const armor = collapse(tables.armor.items, (r) =>
      Str.replace(/\s*\(Altered\)\s*$/, '')(r.name),
    );

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
      cat(
        'bosses',
        'Bosses',
        Arr.filter(bosses, (e) => e.on).length,
        bosses.length,
        { to: '/bosses' },
      ),
      cat(
        'graces',
        'Sites of Grace',
        Arr.filter(graces, (e) => e.on).length,
        graces.length,
      ),
      cat('weapons', 'Weapons', weapons.owned, weapons.total, {
        categorySlug: 'weapons-shields',
      }),
      cat('armor', 'Armor', armor.owned, armor.total, {
        categorySlug: 'armor',
      }),
      cat(
        'talismans',
        'Talismans',
        tables.talismans.ownedCount,
        tables.talismans.items.length,
        {
          categorySlug: 'talismans',
        },
      ),
      cat(
        'spells',
        'Sorceries & Incantations',
        tables.spells.ownedCount,
        tables.spells.items.length,
        {
          categorySlug: 'spells',
        },
      ),
      cat(
        'spirits',
        'Spirit Ashes',
        tables.spirits.ownedCount,
        tables.spirits.items.length,
        {
          categorySlug: 'spirit-ashes',
        },
      ),
      cat(
        'ashes',
        'Ashes of War',
        tables.ashes.ownedCount,
        tables.ashes.items.length,
        {
          categorySlug: 'ashes-of-war',
        },
      ),
      // Gestures are owned when unlocked in the save's gesture table (joined in `inventoryTables`).
      cat(
        'gestures',
        'Gestures',
        tables.gestures.ownedCount,
        tables.gestures.items.length,
        {
          categorySlug: 'gestures',
        },
      ),
    ];

    // Overall = equal-weight mean of category percentages (so weapons' large count doesn't dominate).
    const overallPct =
      categories.length > 0
        ? Math.round(
            Arr.reduce(categories, 0, (s, c) => s + c.pct) / categories.length,
          )
        : 0;

    return {
      hasSave: !!slot,
      overallPct,
      categories,
      milestones: completionMilestones(slot, scope),
    };
  }, [slot, tables, scope]);
}
