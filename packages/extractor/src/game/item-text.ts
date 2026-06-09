import { Effect, FileSystem, PlatformError } from 'effect';

import { type Bnd4Error, parseBnd4 } from '../formats/bnd4.ts';
import { type DcxError, dcxDecompress } from '../formats/dcx.ts';
import { type FmgError, parseFmg } from '../formats/fmg.ts';
import type { OodleError } from '../external/oodle.ts';

/**
 * Assembles item/equipment TEXT tables from the game's message archives.
 *
 * Text lives in `msg/engus/item.msgbnd.dcx` (DCX → BND4 → many FMGs). DLC text
 * is in the separate `item_dlc01`/`item_dlc02.msgbnd`, which carry both the base
 * FMGs and DLC variants (`WeaponName_dlc01.fmg`, …). We merge every FMG of a
 * category — `WeaponName(.fmg|_dlc01.fmg|_dlc02.fmg)` — into one `id → text` map
 * so base + DLC text lands together (later files win on id collisions).
 *
 * Each item category has up to three FMG tables: `*Name` (name), `*Info`
 * (one-line summary), `*Caption` (full description). Goods additionally have
 * `GoodsInfo2` (spirit-ash summon name / crafting-material hint). Weapons have
 * no `*Info` summary in vanilla.
 */

export const ITEM_TEXT_CATEGORIES = [
  'WeaponName',
  'WeaponCaption',
  'ProtectorName',
  'ProtectorInfo',
  'ProtectorCaption',
  'AccessoryName',
  'AccessoryInfo',
  'AccessoryCaption',
  'GoodsName',
  'GoodsInfo',
  'GoodsInfo2',
  'GoodsCaption',
  'GemName', // Ashes of War (EquipParamGem)
  'GemInfo',
  'GemCaption',
  'ArtsName',
] as const;

export type ItemTextCategory = (typeof ITEM_TEXT_CATEGORIES)[number];
export type ItemText = Record<ItemTextCategory, Map<number, string>>;

// Read base + DLC message archives; later ones layer on top.
const MSGBNDS = [
  'item.msgbnd.dcx',
  'item_dlc01.msgbnd.dcx',
  'item_dlc02.msgbnd.dcx',
];

// "…/WeaponName_dlc01.fmg" → "WeaponName" ('_' is not in the name char class,
// so the lazy group stops before the optional "_dlcNN" suffix).
const categoryOf = (entryName: string | null): string | null => {
  if (!entryName) return null;
  const base = entryName.split(/[\\/]/).pop() ?? '';
  return base.match(/^([A-Za-z0-9]+?)(?:_dlc\d+)?\.fmg$/i)?.[1] ?? null;
};

export const loadItemText = (
  gameRoot: string,
  oo2corePath: string,
): Effect.Effect<
  ItemText,
  DcxError | OodleError | Bnd4Error | FmgError | PlatformError.PlatformError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const wanted = new Set<string>(ITEM_TEXT_CATEGORIES);
    const result = Object.fromEntries(
      ITEM_TEXT_CATEGORIES.map((c) => [c, new Map<number, string>()]),
    ) as ItemText;

    for (const rel of MSGBNDS) {
      const path = `${gameRoot}/msg/engus/${rel}`;
      if (!(yield* fs.exists(path))) continue;
      const dcx = yield* fs.readFile(path);
      const entries = yield* parseBnd4(yield* dcxDecompress(dcx, oo2corePath));
      for (const entry of entries) {
        const category = categoryOf(entry.name);
        if (!category || !wanted.has(category)) continue;
        const fmg = yield* parseFmg(entry.bytes);
        const target = result[category as ItemTextCategory];
        for (const [id, name] of fmg) target.set(id, name);
      }
    }
    return result;
  });
