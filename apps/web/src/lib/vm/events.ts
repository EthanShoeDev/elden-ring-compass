import { BOSSES, eventFlagOffset, GRACES } from '@elden-ring-compass/data';

import { Slot } from '../save-dto';
import { bossFlagToPixel, graceFlagToPixel } from './map-pins';

function get_bit(byte: number, bit_pos: number) {
  return (byte & (1 << bit_pos)) != 0;
}

type EventType = 'grace' | 'boss';
// `subtitle` is shown under the name in the map popup (a grace's region, etc.).
type BaseEvent = { id: number; name: string; type: EventType; subtitle?: string };

/**
 * Flag-driven world progress (Sites of Grace + bosses) — `on` is read from the save's
 * event-flag bitfield via `eventFlagOffset`. Built once from the install-derived datasets.
 * `id` is the event-flag id (so the table's ID column matches the legacy behavior).
 *
 * Map fragments, cookbooks and whetblades used to live here too, but to the user those are
 * just items — they now appear in the Key Items / Tools inventory tables instead (see
 * lib/inventory-catalog.ts). Map-fragment *discovery* flags are still round-tripped by the
 * shared-progression link via lib/share/shareable-events.ts.
 */
const FLAG_EVENTS: ReadonlyArray<BaseEvent & { flagId: number }> = [
  ...new Map(
    [
      ...GRACES.map((g) => ({
        id: g.flagId,
        name: g.name,
        type: 'grace' as const,
        subtitle: g.region ?? undefined,
      })),
      ...BOSSES.filter((b): b is typeof b & { name: string } => b.name !== null).map((b) => ({
        id: b.defeatFlagId,
        name: b.name,
        type: 'boss' as const,
      })),
      // Starscourge Radahn (Caelid) has no standard arena flag in BOSSES; kept as the legacy did.
      { id: 310, name: 'Starscourge Radahn', type: 'boss' as const },
    ].map((e) => [e.id, e] as const), // dedupe by flag id (bosses can share a defeat flag)
  ).values(),
].map((e) => ({ ...e, flagId: e.id }));

export function eventsDbView(slot?: Readonly<Slot>) {
  const isFlagOn = (flagId: number) => {
    if (!slot) return false;
    const offset = eventFlagOffset(flagId);
    if (!offset) return false;
    return get_bit(slot.event_flags.flags[offset[0]] ?? 0, offset[1]);
  };

  // Install-derived overworld pixel (graces / field bosses), keyed by flag id.
  // `undefined` for dungeon markers (need WorldMapLegacyConvParam).
  const pixelFor = (e: BaseEvent, flagId: number) =>
    e.type === 'grace' ? graceFlagToPixel.get(flagId) : bossFlagToPixel.get(flagId);

  return FLAG_EVENTS.map(({ flagId, ...e }) => ({
    ...e,
    on: isFlagOn(flagId),
    pixel: pixelFor(e, flagId),
  }));
}
