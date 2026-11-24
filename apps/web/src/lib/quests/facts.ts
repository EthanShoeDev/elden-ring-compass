import type { Slot } from '../save-dto';
import { isEventFlagOn } from '../vm/events';
import { goodsQuantityById } from '../vm/inventory';
import type { SaveFacts } from './cond';

/** Save facts read from a parsed slot. Goods are tallied lazily, only if a condition asks. */
export function slotFacts(slot: Readonly<Slot>): SaveFacts {
  let goods: Map<number, number> | undefined;
  return {
    flag: (id) => isEventFlagOn(slot, id),
    goodCount: (goodId) => {
      goods ??= goodsQuantityById(slot);
      return goods.get(goodId) ?? 0;
    },
  };
}

/** Facts for a save with exactly these flags on — for tests and the "no save loaded" guide. */
export function flagFacts(
  on: Iterable<number> = [],
  goods: ReadonlyMap<number, number> = new Map(),
): SaveFacts {
  const set = new Set(on);
  return {
    flag: (id) => set.has(id),
    goodCount: (goodId) => goods.get(goodId) ?? 0,
  };
}
