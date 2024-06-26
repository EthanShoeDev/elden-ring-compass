import { CLEAN_ELDEN_RING_DB } from '../elden-ring-raw-db/er-raw-db';
import { Slot } from '../wasm-wrapper';

export function regionsDbView(slot: Readonly<Slot>) {
  const regionIdMap = new Map(
    CLEAN_ELDEN_RING_DB.regions.map((r) => [r.eventId, r])
  );
  const unlockedRegionSet = new Set();
  for (let i = 0; i < slot.regions.unlocked_regions_count; i++) {
    const key = slot.regions.unlocked_regions[i];
    const region = regionIdMap.get(key);
    if (region) {
      unlockedRegionSet.add(region.eventId);
    }
  }

  const checkIfEventIsOn = <T>(e: T & { eventId: number }) => {
    return {
      ...e,
      found: unlockedRegionSet.has(e.eventId),
    };
  };

  return CLEAN_ELDEN_RING_DB.regions.map(checkIfEventIsOn);
}
