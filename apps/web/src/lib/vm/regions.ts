import { REGIONS } from '@elden-ring-compass/data';

import { Slot } from '../wasm-wrapper';

export function regionsDbView(slot?: Readonly<Slot>) {
  const unlockedRegionSet = new Set<number>();
  if (slot) {
    for (let i = 0; i < slot.regions.unlocked_regions_count; i++) {
      const key = slot.regions.unlocked_regions[i];
      if (key === undefined) break;
      unlockedRegionSet.add(key);
    }
  }

  return REGIONS.map((r) => ({
    id: r.id,
    name: r.name,
    map: r.area,
    isOpenWorld: r.isOpenWorld,
    isDungeon: r.isDungeon,
    found: unlockedRegionSet.has(r.id),
  }));
}
