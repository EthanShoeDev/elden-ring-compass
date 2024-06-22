import {
  CLEAN_ELDEN_RING_DB,
  RAW_ELDEN_RING_DB,
} from '../elden-ring-raw-db/er-raw-db';
import { Slot } from '../wasm-wrapper';

function get_bit(byte: number, bit_pos: number) {
  return (byte & (1 << bit_pos)) != 0;
}

export function eventsDbView(slot: Readonly<Slot>) {
  const eventIdToOffsetMap = new Map(RAW_ELDEN_RING_DB.EVENT_FLAGS);

  const checkIfEventIsOn = <T>(e: T & { eventId: number }) => {
    const eventFlagInfo = eventIdToOffsetMap.get(e.eventId);
    const on = eventFlagInfo
      ? get_bit(slot.event_flags.flags[eventFlagInfo[0]], eventFlagInfo[1])
        ? 'on'
        : 'off'
      : 'unknown';
    return {
      ...e,
      on,
    };
  };

  return CLEAN_ELDEN_RING_DB.events.map(checkIfEventIsOn);
}
