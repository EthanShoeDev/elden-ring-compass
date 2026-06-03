import { BOSSES, eventFlagOffset, GRACES, MAP_FRAGMENTS, GOODS } from '@elden-ring-compass/data';

import { MAP_DB_ITEMS } from '../map-db';
import { Slot } from '../wasm-wrapper';
import { inventoryDbView } from './inventory';

function get_bit(byte: number, bit_pos: number) {
  return (byte & (1 << bit_pos)) != 0;
}

export type EventType = 'grace' | 'boss' | 'map' | 'cookbook' | 'whetblade';
type BaseEvent = { id: number; name: string; type: EventType };

/**
 * Flag-driven events (graces, bosses, map fragments) — `on` is read from the save's
 * event-flag bitfield via `eventFlagOffset`. Built once from the install-derived datasets.
 * `id` is the event-flag id (so the table's ID column matches the legacy behavior).
 */
const FLAG_EVENTS: ReadonlyArray<BaseEvent & { flagId: number }> = [
  ...new Map(
    [
      ...GRACES.map((g) => ({ id: g.flagId, name: g.name, type: 'grace' as const })),
      ...BOSSES.filter((b): b is typeof b & { name: string } => b.name !== null).map((b) => ({
        id: b.defeatFlagId,
        name: b.name,
        type: 'boss' as const,
      })),
      // Starscourge Radahn (Caelid) has no standard arena flag in BOSSES; kept as the legacy did.
      { id: 310, name: 'Starscourge Radahn', type: 'boss' as const },
      ...MAP_FRAGMENTS.filter((m): m is typeof m & { name: string } => m.name !== null).map(
        (m) => ({
          id: m.openEventFlagId,
          name: m.name,
          type: 'map' as const,
        }),
      ),
    ].map((e) => [e.id, e] as const), // dedupe by flag id (bosses can share a defeat flag)
  ).values(),
].map((e) => ({ ...e, flagId: e.id }));

/**
 * Ownership-driven collectibles (cookbooks, whetblades). These have no install-derivable
 * unlock flag (the legacy flag ids were hand-RE'd), so "obtained" is tracked via save
 * inventory ownership instead — the items + names come from `GOODS`. `id` is the item id.
 */
const COLLECTIBLE_EVENTS: ReadonlyArray<BaseEvent> = GOODS.filter(
  (g) => (g.category === 'Key Item' && g.name.includes('Cookbook')) || g.name.includes('Whetblade'),
).map((g) => ({
  id: g.id,
  name: g.name,
  type: g.name.includes('Whetblade') ? ('whetblade' as const) : ('cookbook' as const),
}));

export function eventsDbView(slot?: Readonly<Slot>) {
  const isFlagOn = (flagId: number) => {
    if (!slot) return false;
    const offset = eventFlagOffset(flagId);
    if (!offset) return false;
    return get_bit(slot.event_flags.flags[offset[0]] ?? 0, offset[1]);
  };

  const ownedItemIds = new Set<number>();
  if (slot) {
    for (const item of inventoryDbView(slot).items) {
      if (item.quantity > 0) ownedItemIds.add(item.item_id);
    }
  }

  const withMapData = <T extends BaseEvent>(e: T, on: boolean) => ({
    ...e,
    on,
    map_data: MAP_DB_ITEMS.get(e.name)
      ?.filter((m) => m.category != 'Locations')
      .filter((m) => (e.type == 'grace' ? m.category == 'Site of Grace' : true))
      .filter((m) => (e.type == 'boss' ? m.category == 'Bosses' : true)),
  });

  return [
    ...FLAG_EVENTS.map(({ flagId, ...e }) => withMapData(e, isFlagOn(flagId))),
    ...COLLECTIBLE_EVENTS.map((e) => withMapData(e, ownedItemIds.has(e.id))),
  ];
}
