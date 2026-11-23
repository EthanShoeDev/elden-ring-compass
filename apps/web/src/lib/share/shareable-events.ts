import {
  BOSSES,
  eventFlagOffset,
  GRACES,
  MAP_FRAGMENTS,
} from '@elden-ring-compass/data';
import { Array as Arr } from 'effect';

// The set of event-flag ids the shared-progression link round-trips: every grace, boss, and
// map-fragment flag the app tracks (matching what the events table reads). The collectible
// trackers (cookbooks/whetblades) are inventory-derived, not flags, and ride along in the
// shared `inv` payload instead. Replaces iterating the legacy precomputed `EVENT_FLAGS` list.
export const SHAREABLE_EVENT_IDS: ReadonlyArray<number> = [
  ...Arr.map(GRACES, (g) => g.flagId),
  ...Arr.map(BOSSES, (b) => b.defeatFlagId),
  310, // Starscourge Radahn — see lib/vm/events.ts
  ...Arr.map(MAP_FRAGMENTS, (m) => m.openEventFlagId),
];

// Largest byte offset any shareable flag maps to — used to size the reconstructed flag
// buffer so no high-offset flag is dropped (the old fixed 2048-byte buffer silently lost them).
export const MAX_EVENT_BYTE_OFFSET: number = Arr.reduce(
  SHAREABLE_EVENT_IDS,
  0,
  (max, id) => {
    const offset = eventFlagOffset(id);
    return offset ? Math.max(max, offset[0]) : max;
  },
);
