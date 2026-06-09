import { Data, Effect, FileSystem, Path, PlatformError } from 'effect';

import type { OodleError } from '../external/oodle.ts';
import type { Bnd4Error } from '../formats/bnd4.ts';
import type { DcxError } from '../formats/dcx.ts';
import type { FmgError } from '../formats/fmg.ts';
import { decodeRow, type ParamError, parseParam } from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import { ITEM_MSGBNDS, loadFmgTable, MENU_MSGBNDS } from './fmg-tables.ts';

/**
 * Derives every Site of Grace (base + DLC) entirely from the install — no curated
 * overlay. `BonfireWarpParam` is the in-game warp menu's data; each row is a
 * grace. We join three game sources:
 *   - `eventflagId`  → the save event flag set when the grace is discovered
 *     (this is the id the save parser checks; matches the legacy GRACES.ts ids).
 *   - `textId1`      → `PlaceName` FMG → the grace's display name.
 *   - `bonfireSubCategoryId` → `BonfireWarpSubCategoryParam.textId` → `GR_MenuText`
 *     FMG → the region label the warp menu groups it under (e.g. "Limgrave",
 *     "Gravesite Plain").
 * Self-updating: a patched install with new graces flows through unchanged (only
 * a Paramdex refresh is needed if the paramdef layout itself changes).
 */

export class GracesError extends Data.TaggedError('GracesError')<{
  readonly detail: string;
}> {}

export interface Grace {
  readonly flagId: number; // BonfireWarpParam.eventflagId — the save flag
  readonly name: string; // PlaceName FMG
  readonly region: string | null; // BonfireWarpSubCategoryParam → GR_MenuText
  readonly bonfireEntityId: number; // MSB entity id of the bonfire
  readonly areaNo: number; // map area byte (60 = Lands Between, 61 = DLC overworld)
}

type GraceErrors =
  | GracesError
  | ParamError
  | ParamdefError
  | DcxError
  | OodleError
  | Bnd4Error
  | FmgError
  | PlatformError.PlatformError;

export const loadGraces = (
  params: Map<string, Uint8Array>,
  gameRoot: string,
  oo2corePath: string,
): Effect.Effect<Grace[], GraceErrors, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const bwpBytes = params.get('BonfireWarpParam');
    const subBytes = params.get('BonfireWarpSubCategoryParam');
    if (!bwpBytes || !subBytes) {
      return yield* new GracesError({
        detail: 'BonfireWarp params missing from regulation',
      });
    }

    const placeName = yield* loadFmgTable(
      gameRoot,
      oo2corePath,
      ITEM_MSGBNDS,
      'PlaceName',
    );
    const grMenu = yield* loadFmgTable(
      gameRoot,
      oo2corePath,
      MENU_MSGBNDS,
      'GR_MenuText',
    );

    // Subcategory rowId → region label.
    const subParam = yield* parseParam(subBytes);
    const subDef = yield* loadParamdef('BonfireWarpSubCategoryParam');
    const subRegion = new Map<number, string>();
    for (const r of subParam.rows) {
      const f = decodeRow(subBytes, r.dataOffset, subDef, subParam.little);
      const region = grMenu.get(Number(f.get('textId')));
      if (region) subRegion.set(r.id, region);
    }

    const bwp = yield* parseParam(bwpBytes);
    const def = yield* loadParamdef('BonfireWarpParam');

    const graces: Grace[] = [];
    for (const r of bwp.rows) {
      const f = decodeRow(bwpBytes, r.dataOffset, def, bwp.little);
      const flagId = Number(f.get('eventflagId'));
      const name = placeName.get(Number(f.get('textId1')));
      if (!name || flagId <= 0) continue; // non-grace warp slots / blank rows
      graces.push({
        flagId,
        name,
        region: subRegion.get(Number(f.get('bonfireSubCategoryId'))) ?? null,
        bonfireEntityId: Number(f.get('bonfireEntityId')),
        areaNo: Number(f.get('areaNo')),
      });
    }
    return graces;
  });
