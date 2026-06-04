import { Effect, FileSystem, PlatformError } from 'effect';

import { type Bnd4Error, parseBnd4 } from '../formats/bnd4.ts';
import { type DcxError, dcxDecompress } from '../formats/dcx.ts';
import { type FmgError, parseFmg } from '../formats/fmg.ts';
import type { OodleError } from '../external/oodle.ts';

/**
 * Loads one logical FMG `id → string` table out of the game's message archives,
 * merging the base FMG with its DLC siblings. A "table" like `PlaceName` is split
 * across `PlaceName.fmg`, `PlaceName_dlc01.fmg`, `PlaceName_dlc02.fmg` (and the
 * DLC msgbnds also re-ship the base FMGs), so we read every msgbnd given, take
 * every FMG whose name matches `^<name>(_dlcNN)?\.fmg$`, and merge — later files
 * win on id collisions. Missing msgbnds are skipped (pre-DLC installs).
 *
 * `item.msgbnd` holds content text (PlaceName, *Name, *Caption); `menu.msgbnd`
 * holds UI text (GR_MenuText, …).
 */

export const ITEM_MSGBNDS = [
  'item.msgbnd.dcx',
  'item_dlc01.msgbnd.dcx',
  'item_dlc02.msgbnd.dcx',
];
export const MENU_MSGBNDS = [
  'menu.msgbnd.dcx',
  'menu_dlc01.msgbnd.dcx',
  'menu_dlc02.msgbnd.dcx',
];

export const loadFmgTable = (
  gameRoot: string,
  oo2corePath: string,
  msgbnds: readonly string[],
  fmgName: string,
): Effect.Effect<
  Map<number, string>,
  DcxError | OodleError | Bnd4Error | FmgError | PlatformError.PlatformError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const wanted = new RegExp(`^${fmgName}(_dlc\\d+)?\\.fmg$`, 'i');
    const table = new Map<number, string>();
    for (const rel of msgbnds) {
      const path = `${gameRoot}/msg/engus/${rel}`;
      if (!(yield* fs.exists(path))) continue;
      const dcx = yield* fs.readFile(path);
      const entries = yield* parseBnd4(yield* dcxDecompress(dcx, oo2corePath));
      for (const e of entries) {
        const base = (e.name ?? '').split(/[\\/]/).pop() ?? '';
        if (!wanted.test(base)) continue;
        for (const [id, name] of yield* parseFmg(e.bytes)) {
          if (name && name.trim() && name !== '[ERROR]') table.set(id, name);
        }
      }
    }
    return table;
  });
