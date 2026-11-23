import {
  Array as Arr,
  Effect,
  FileSystem,
  PlatformError,
  Record as Rec,
  String as Str,
} from 'effect';

import type { OodleError } from '../external/oodle.ts';
import { type Bnd4Error, parseBnd4 } from '../formats/bnd4.ts';
import { type DcxError, dcxDecompress } from '../formats/dcx.ts';
import { type FmgError, parseFmg } from '../formats/fmg.ts';

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
export type ItemText = Record<ItemTextCategory, Map<number, string>> & {
  /**
   * Per category, the ids whose text exists ONLY in a `_dlcNN` FMG — the items
   * Shadow of the Erdtree added. The DLC msgbnds re-ship every base FMG too, so
   * an id counts as DLC only when no base (unsuffixed) FMG has text for it; that
   * keeps a DLC-era text fix to a base item (one talisman on 2.7.1) as base game.
   */
  readonly dlcIds: Record<ItemTextCategory, ReadonlySet<number>>;
};

// Read base + DLC message archives; later ones layer on top.
const MSGBNDS = [
  'item.msgbnd.dcx',
  'item_dlc01.msgbnd.dcx',
  'item_dlc02.msgbnd.dcx',
];

// "…/WeaponName_dlc01.fmg" → { category: "WeaponName", dlc: true } ('_' is not in
// the name char class, so the lazy group stops before the optional "_dlcNN").
const categoryOf = (
  entryName: string | null,
): { readonly category: string; readonly dlc: boolean } | null => {
  if (entryName === null) return null;
  const base = Arr.lastNonEmpty(Str.split(entryName, /[\\/]/));
  const m = /^([A-Za-z0-9]+?)(_dlc\d+)?\.fmg$/i.exec(base);
  return m?.[1] === undefined
    ? null
    : { category: m[1], dlc: m[2] !== undefined };
};

const emptySets = () =>
  Rec.fromEntries(
    Arr.map(ITEM_TEXT_CATEGORIES, (c) => [c, new Set<number>()] as const),
  ) as Record<ItemTextCategory, Set<number>>;

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
    const text = Rec.fromEntries(
      Arr.map(
        ITEM_TEXT_CATEGORIES,
        (c) => [c, new Map<number, string>()] as const,
      ),
    ) as Record<ItemTextCategory, Map<number, string>>;
    // Ids with non-blank text, split by whether the FMG was a `_dlcNN` one.
    const baseIds = emptySets();
    const dlcFileIds = emptySets();

    for (const rel of MSGBNDS) {
      const path = `${gameRoot}/msg/engus/${rel}`;
      if (!(yield* fs.exists(path))) continue;
      const dcx = yield* fs.readFile(path);
      const bnd = yield* dcxDecompress(dcx, oo2corePath);
      const entries = yield* parseBnd4(bnd);
      for (const entry of entries) {
        const file = categoryOf(entry.name);
        if (file === null || !wanted.has(file.category)) continue;
        const category = file.category as ItemTextCategory;
        const fmg = yield* parseFmg(entry.bytes);
        const seen = (file.dlc ? dlcFileIds : baseIds)[category];
        for (const [id, name] of fmg) {
          text[category].set(id, name);
          if (Str.isNonEmpty(Str.trim(name))) seen.add(id);
        }
      }
    }
    const dlcIds = Rec.map(
      dlcFileIds,
      (ids, category) =>
        new Set(Arr.filter([...ids], (id) => !baseIds[category].has(id))),
    );
    return { ...text, dlcIds };
  });
