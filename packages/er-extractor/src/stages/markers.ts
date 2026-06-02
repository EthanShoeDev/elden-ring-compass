import { Effect } from 'effect';

import { PipelineContext } from '../domain/context.ts';
import { findOodleDll } from '../external/oodle.ts';
import { loadMapMarkers } from '../game/map-markers.ts';

/**
 * Stage 5 — markers (MSB). Parses every `map/mapstudio/*.msb.dcx` (legacy
 * dungeons + m60 Lands Between / m61 DLC overworld tiles) via the ported scoped
 * MSB reader → placed Parts + Regions that carry an entity id, with their local
 * (x,y,z). Turning these into the site's map projection is a later join against
 * `WorldMapLegacyConvParam` + the affine transform in `interactive-map.tsx`.
 */
export const markers = Effect.gen(function* () {
  const ctx = yield* PipelineContext;
  const oo2core = yield* findOodleDll(ctx.gameRoot);
  const { entities, mapCount } = yield* loadMapMarkers(ctx.gameRoot, oo2core);

  const parts = entities.filter((e) => e.kind === 'part').length;
  const regions = entities.length - parts;
  yield* Effect.logInfo(
    `markers — ${entities.length} entities across ${mapCount} maps (parts:${parts} regions:${regions})`,
  );

  // DLC proof: m61 tiles are Shadow of the Erdtree; show a sample so a refresh
  // visibly picks up DLC content.
  const dlc = entities.filter((e) => e.mapId.startsWith('m61'));
  yield* Effect.logInfo(`DLC (m61) markers: ${dlc.length}`);
  const sample = dlc[0];
  if (sample) {
    yield* Effect.logInfo(
      `DLC sample — ${sample.mapId} "${sample.name}" eid=${sample.entityID} ` +
        `@ (${sample.x.toFixed(1)}, ${sample.y.toFixed(1)}, ${sample.z.toFixed(1)})`,
    );
  }
  return entities;
});
