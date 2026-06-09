import { Effect, FileSystem, Path, PlatformError } from 'effect';

import type { OodleError } from '../external/oodle.ts';
import type { Bnd4Error } from '../formats/bnd4.ts';
import type { DcxError } from '../formats/dcx.ts';
import type { FmgError } from '../formats/fmg.ts';
import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import { ITEM_MSGBNDS, loadFmgTable } from './fmg-tables.ts';

/**
 * Map fragments — the world-map sub-region pieces the player collects to reveal
 * each area of the overworld map. Install-derived (no curated overlay):
 *   - `WorldMapPieceParam`     — one row per fragment; `openEventFlagId` is the
 *     save flag set when the piece is revealed (== the legacy MAPS tracking flag),
 *     `acquisitionEventFlagId` the pickup-cutscene flag.
 *   - `WorldMapPlaceNameParam` — links a piece (`worldMapPieceId`) to a coarse
 *     `PlaceName` FMG `textId` plus its map `areaNo`/grid cell.
 *
 * NOTE the game only ships ~9 *coarse* region names ("Limgrave", "Liurnia of the
 * Lakes", …) in `WorldMapPlaceNameParam` (10 rows). The fine directional labels the
 * legacy table carried ("Limgrave, East", "Mountaintops of the Giants, North") are
 * NOT in the install — they were wiki-scraped, so we deliberately drop them rather
 * than vendor them. Tracking is by `openEventFlagId`, which IS complete.
 */

export interface MapFragment {
  readonly pieceId: number; // WorldMapPieceParam rowId
  readonly openEventFlagId: number; // save flag set when the piece is revealed
  readonly acquisitionEventFlagId: number; // pickup-cutscene flag
  readonly name: string | null; // coarse region name (PlaceName FMG), where present
  readonly areaNo: number; // map area byte (0 if no PlaceNameParam row)
  readonly gridX: number;
  readonly gridZ: number;
}

type MapFragmentErrors =
  | ParamError
  | ParamdefError
  | DcxError
  | OodleError
  | Bnd4Error
  | FmgError
  | PlatformError.PlatformError;

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

export const loadMapFragments = (
  params: Map<string, Uint8Array>,
  gameRoot: string,
  oo2corePath: string,
): Effect.Effect<
  MapFragment[],
  MapFragmentErrors,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const pieceBytes = params.get('WorldMapPieceParam');
    const pnBytes = params.get('WorldMapPlaceNameParam');
    if (!pieceBytes || !pnBytes) {
      yield* Effect.logWarning(
        'no WorldMapPiece/PlaceName params; skipping map fragments',
      );
      return [];
    }

    const placeName = yield* loadFmgTable(
      gameRoot,
      oo2corePath,
      ITEM_MSGBNDS,
      'PlaceName',
    );

    // pieceId → its place-name row (coarse name + area/grid), where one exists.
    const pn = yield* parseParam(pnBytes);
    const pnDef = yield* loadParamdef('WorldMapPlaceNameParam');
    const placeByPiece = new Map<
      number,
      { name: string | null; areaNo: number; gridX: number; gridZ: number }
    >();
    for (const r of pn.rows) {
      const f = decodeRow(pnBytes, r.dataOffset, pnDef, pn.little);
      const pieceId = num(f, 'worldMapPieceId');
      if (pieceId < 0) continue;
      const textId = num(f, 'textId');
      placeByPiece.set(pieceId, {
        name: textId >= 0 ? (placeName.get(textId) ?? null) : null,
        areaNo: num(f, 'areaNo'),
        gridX: num(f, 'gridXNo'),
        gridZ: num(f, 'gridZNo'),
      });
    }

    const piece = yield* parseParam(pieceBytes);
    const pieceDef = yield* loadParamdef('WorldMapPieceParam');
    const out: MapFragment[] = [];
    for (const r of piece.rows) {
      const f = decodeRow(pieceBytes, r.dataOffset, pieceDef, piece.little);
      const openEventFlagId = num(f, 'openEventFlagId');
      if (openEventFlagId <= 0) continue; // un-trackable / blank rows
      const place = placeByPiece.get(r.id);
      out.push({
        pieceId: r.id,
        openEventFlagId,
        acquisitionEventFlagId: num(f, 'acquisitionEventFlagId'),
        name: place?.name ?? null,
        areaNo: place?.areaNo ?? 0,
        gridX: place?.gridX ?? 0,
        gridZ: place?.gridZ ?? 0,
      });
    }
    return out;
  });
