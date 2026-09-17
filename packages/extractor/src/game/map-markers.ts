import { Data, Effect, FileSystem } from 'effect';

import type { OodleError } from '../external/oodle.ts';
import { type DcxError, dcxDecompress } from '../formats/dcx.ts';
import {
  type MsbError,
  type MsbMarker,
  type MsbTreasure,
  parseMsb,
} from '../formats/msb.ts';

/**
 * Loads every map's placed entities from the unpacked `map/mapstudio/*.msb.dcx`.
 * Each MSB is a single map (legacy dungeon `mXX_*`, Lands Between overworld tile
 * `m60_XX_YY_LL`, or DLC overworld tile `m61_*`); we decode the Parts + Regions
 * and keep those that carry an entity id (the meaningful, addressable markers:
 * bosses, NPCs, graces, assets, trigger regions — map-piece geometry has none).
 *
 * Positions here are LOCAL to each MSB. Turning them into Lands-Between world
 * coordinates (and then the site's map projection) is a separate join against
 * `WorldMapLegacyConvParam` + the affine transform in `interactive-map.tsx`.
 */

export class MapMarkersError extends Data.TaggedError('MapMarkersError')<{
  readonly detail: string;
}> {}

/** A placed entity in a specific map, with its local coordinates. */
export interface MapEntity extends MsbMarker {
  readonly mapId: string; // e.g. "m10_00_00_00", "m60_42_36_00"
}

/** A placed-treasure pickup in a specific map (`ItemLotParam_map` ⨝ a Part's coords). */
export interface MapTreasure extends MsbTreasure {
  readonly mapId: string;
}

export interface MapMarkers {
  readonly entities: MapEntity[];
  readonly treasures: MapTreasure[];
  readonly mapCount: number;
}

/** "none" sentinels FromSoft uses for an unset entity id. */
const hasEntityId = (id: number): boolean => id !== 0 && id !== 0xffffffff;

export const loadMapMarkers = (
  gameRoot: string,
  oo2corePath: string,
): Effect.Effect<
  MapMarkers,
  MapMarkersError | DcxError | OodleError | MsbError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const dir = `${gameRoot}/map/mapstudio`;
    // glob has no effect-native equivalent (FileSystem only lists/watches); Bun.Glob stays.
    const glob = new Bun.Glob('*.msb.dcx');
    const paths = yield* Effect.tryPromise({
      try: async () => {
        const out: string[] = [];
        for await (const p of glob.scan({ cwd: dir, absolute: true }))
          out.push(p);
        return out.toSorted();
      },
      catch: (cause) =>
        new MapMarkersError({ detail: `scanning ${dir}: ${String(cause)}` }),
    });
    if (paths.length === 0) {
      return yield* new MapMarkersError({
        detail: `no MSBs under ${dir} — run the unpack stage first`,
      });
    }

    const entities: MapEntity[] = [];
    const treasures: MapTreasure[] = [];
    for (const path of paths) {
      const mapId = (path.split(/[\\/]/).pop() ?? '').replace(
        /\.msb\.dcx$/i,
        '',
      );
      const dcx = yield* fs.readFile(path).pipe(
        Effect.mapError(
          (cause) =>
            new MapMarkersError({
              detail: `reading ${path}: ${String(cause)}`,
            }),
        ),
      );
      const raw = yield* dcxDecompress(dcx, oo2corePath);
      const msb = yield* parseMsb(raw);
      for (const m of [...msb.parts, ...msb.regions]) {
        if (hasEntityId(m.entityID)) entities.push({ ...m, mapId });
      }
      for (const t of msb.treasures) treasures.push({ ...t, mapId });
    }

    return { entities, treasures, mapCount: paths.length };
  });
