import { CLEAN_ELDEN_RING_DB } from '../elden-ring-raw-db/er-raw-db';
import { MAP_DB_ITEMS } from '../map-db';
import { Slot } from '../wasm-wrapper';

export function regionsDbView(slot?: Readonly<Slot>) {
  const regionIdMap = new Map(
    CLEAN_ELDEN_RING_DB.regions.map((r) => [r.id, r])
  );
  const unlockedRegionSet = new Set();
  for (let i = 0; slot && i < slot.regions.unlocked_regions_count; i++) {
    const key = slot.regions.unlocked_regions[i];
    const region = regionIdMap.get(key);
    if (region) {
      unlockedRegionSet.add(region.id);
    }
  }

  const checkIfEventIsOn = <T>(e: T & { id: number; name: string }) => {
    return {
      ...e,
      found: unlockedRegionSet.has(e.id),
      map_data: MAP_DB_ITEMS.find((m) => m.name === e.name),
    };
  };

  return CLEAN_ELDEN_RING_DB.regions.map(checkIfEventIsOn);
}
