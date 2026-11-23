import { Array as Arr, Effect, Option, Schema, String as Str } from 'effect';

import { listArchivePaths } from '../archive/dvdbnd.ts';

export class MapArchivesError extends Schema.TaggedError<
  MapArchivesError,
  { readonly brand: unique symbol }
>()('MapArchivesError', { detail: Schema.String }) {}

/** The archive Shadow of the Erdtree's content ships in (`Game/DLC.bhd` + `.bdt`). */
const DLC_ARCHIVE = 'DLC';

// `/map/mapstudio/m61_44_45_00.msb.dcx` → 61
const MSB_AREA = /^\/map\/mapstudio\/m(\d{2})_\d{2}_\d{2}_\d{2}\.msb\.dcx$/;

const msbAreas = (paths: readonly string[]): Set<number> =>
  new Set(
    Arr.getSomes(
      Arr.map(paths, (p) =>
        Option.map(Option.fromNullishOr(MSB_AREA.exec(p)?.[1]), Number),
      ),
    ),
  );

/** The map area of a map id: `m61_44_45_00` → 61. */
export const mapAreaOf = (mapId: string): number =>
  Number(Str.slice(1, 3)(mapId));

/**
 * The map areas (`mAA_…`) that are Shadow of the Erdtree content, read from the
 * install: an area is DLC when its MSBs ship in `DLC.bdt` rather than the base
 * `Data*` archives. On 2.7.1 that is m20–m22, m25, m28, m40–m43 and m61 (the
 * Realm of Shadow); m45, the base-game colosseums, stays base.
 *
 * Fails if an area ships in both, because then the area alone no longer says
 * whether something is DLC and every `isDlc` derived from it would be suspect.
 */
export const loadDlcMapAreas = (gameRoot: string) =>
  Effect.gen(function* () {
    const byArchive = yield* listArchivePaths(gameRoot);
    const dlc = msbAreas(byArchive.get(DLC_ARCHIVE) ?? []);
    const base = msbAreas(
      Arr.flatMap(
        Arr.fromIterable(byArchive),
        ([archive, paths]): readonly string[] =>
          archive === DLC_ARCHIVE ? [] : paths,
      ),
    );
    const both = Arr.filter([...dlc], (area) => base.has(area));
    if (both.length > 0)
      return yield* MapArchivesError.make({
        detail: `map areas ship in both DLC and base archives: ${Arr.join(
          Arr.map(both, (a) => `m${a}`),
          ', ',
        )}`,
      });
    if (dlc.size === 0)
      yield* Effect.logWarning(
        'no DLC map files found — every boss and grace will be marked base game',
      );
    return dlc;
  });
