import {
  BaseEvent,
  CLEAN_ELDEN_RING_DB,
  RAW_ELDEN_RING_DB,
} from '../elden-ring-raw-db/er-raw-db';
import { MAP_DB_ITEMS } from '../map-db';
import { Slot } from '../wasm-wrapper';

function get_bit(byte: number, bit_pos: number) {
  return (byte & (1 << bit_pos)) != 0;
}

export function eventsDbView(slot?: Readonly<Slot>) {
  const eventIdToOffsetMap = new Map(RAW_ELDEN_RING_DB.EVENT_FLAGS);

  const checkIfEventIsOn = <T>(e: T & BaseEvent) => {
    const eventFlagInfo = eventIdToOffsetMap.get(e.id);
    if (!eventFlagInfo) throw new Error('No event info');
    const on = slot
      ? get_bit(slot.event_flags.flags[eventFlagInfo[0]], eventFlagInfo[1])
      : false;
    return {
      ...e,
      on,
      map_data: MAP_DB_ITEMS.get(e.name)
        ?.filter((m) => m.category != 'Locations')
        .filter((m) =>
          e.type == 'grace' ? m.category == 'Site of Grace' : true
        )
        .filter((m) => (e.type == 'boss' ? m.category == 'Bosses' : true)),
    };
  };

  return CLEAN_ELDEN_RING_DB.events.map(checkIfEventIsOn);
}
