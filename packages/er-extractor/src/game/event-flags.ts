import { Effect, FileSystem, Path } from 'effect';

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

const BST_URL = new URL('../vendor/eventflag-bst.txt', import.meta.url);

/** The vendored `block,multiplier` table as sorted [block, multiplier] pairs. */
export const loadEventFlagBst = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fs.readFileString(yield* path.fromFileUrl(BST_URL));
  const out: Array<[number, number]> = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const comma = trimmed.indexOf(',');
    if (comma < 0) continue;
    out.push([
      Number(trimmed.slice(0, comma)),
      Number(trimmed.slice(comma + 1)),
    ]);
  }
  return out.sort((a, b) => a[0] - b[0]);
});
