import { eventFlagBstUrl } from '@elden-ring-compass/vendored-data';
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Order,
  Path,
  String as Str,
} from 'effect';

/**
 * Event-flag addressing table, vendored from ER-Save-Lib (`src/res/eventflag_bst.txt`).
 *
 * The save stores event flags as a packed bitfield. A flag id maps to a (byte, bit)
 * by: `block = id / 1000`, `index = id % 1000`; the block is looked up in this table
 * for a byte-offset multiplier, then `byteOffset = mult * 125 + index / 8`,
 * `bitPos = 7 - (index % 8)` (ER-Save-Lib `api/event_flags.rs`). This block→multiplier
 * map is the reverse-engineered part of the save layout (not derivable from the game
 * files), so we vendor it verbatim and re-emit it for the web app to read any flag —
 * graces/bosses today, arbitrary quest flags later.
 */

/** The vendored `block,multiplier` table as sorted [block, multiplier] pairs. */
export const loadEventFlagBst = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const bstPath = yield* path.fromFileUrl(eventFlagBstUrl);
  const text = yield* fs.readFileString(bstPath);
  const out: Array<[number, number]> = [];
  for (const line of Str.split(text, '\n')) {
    const trimmed = Str.trim(line);
    if (trimmed.length === 0) continue;
    const comma = Str.indexOf(',')(trimmed);
    if (Option.isNone(comma)) continue;
    out.push([
      Number(Str.slice(0, comma.value)(trimmed)),
      Number(Str.slice(comma.value + 1)(trimmed)),
    ]);
  }
  return Arr.sort(
    out,
    Order.mapInput(Order.Number, ([block]: readonly [number, number]) => block),
  );
});
