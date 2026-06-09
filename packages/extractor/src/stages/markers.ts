import { Effect } from 'effect';

import { PipelineContext } from '../domain/context.ts';
import { findOodleDll } from '../external/oodle.ts';
import { decodeRow, parseParam, type RowValue } from '../formats/param.ts';
import { loadParamdef } from '../formats/paramdef.ts';
import { ITEM_MSGBNDS, loadFmgTable } from '../game/fmg-tables.ts';
import type { Grace } from '../game/graces.ts';
import {
  classifyMarker,
  type ClassifiedMarker,
} from '../game/marker-classify.ts';
import { loadMapMarkers } from '../game/map-markers.ts';

/**
 * Stage 6 — markers (MSB). Parses every `map/mapstudio/*.msb.dcx` (legacy
 * dungeons + m60 Lands Between / m61 DLC overworld tiles) via the ported scoped
 * MSB reader → placed Parts + Regions that carry an entity id, with their local
 * (x,y,z). Each entity is then **classified into a map layer + given an English
 * displayName** (see marker-classify.ts): graces via the bonfire-entity join,
 * named NPCs via `NpcParam.nameId → NpcName`, plus Part/Region subtype categories.
 *
 * Takes `params` (for `NpcParam`) and `graces` (for the grace entity→name join),
 * so it runs after the flags stage in the pipeline.
 */

const num = (row: ReadonlyMap<string, RowValue>, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

export const markers = (
  params: Map<string, Uint8Array>,
  graces: readonly Grace[],
) =>
  Effect.gen(function* () {
    const ctx = yield* PipelineContext;
    const oo2core = yield* findOodleDll(ctx.gameRoot);
    const { entities, treasures, mapCount } = yield* loadMapMarkers(
      ctx.gameRoot,
      oo2core,
    );

    // npcParamId → English name, for the named NPCs only (generic mobs have nameId<=0).
    const npcName = yield* loadFmgTable(
      ctx.gameRoot,
      oo2core,
      ITEM_MSGBNDS,
      'NpcName',
    );
    const npcNameByParamId = new Map<number, string>();
    const npcParamBytes = params.get('NpcParam');
    if (npcParamBytes) {
      const npcParam = yield* parseParam(npcParamBytes);
      const def = yield* loadParamdef('NpcParam');
      for (const r of npcParam.rows) {
        const row = decodeRow(
          npcParamBytes,
          r.dataOffset,
          def,
          npcParam.little,
        );
        const nameId = num(row, 'nameId');
        if (nameId <= 0) continue;
        const name = npcName.get(nameId);
        if (name && name.trim() && name !== '[ERROR]') {
          npcNameByParamId.set(r.id, name);
        }
      }
    }
    const graceNameByEntityId = new Map(
      graces.map((g) => [g.bonfireEntityId, g.name] as const),
    );

    const classified: ClassifiedMarker[] = entities.map((m) =>
      classifyMarker(m, { npcNameByParamId, graceNameByEntityId }),
    );

    const parts = entities.filter((e) => e.kind === 'part').length;
    const regions = entities.length - parts;
    yield* Effect.logInfo(
      `markers — ${entities.length} entities across ${mapCount} maps (parts:${parts} regions:${regions})`,
    );
    const byCategory = new Map<string, number>();
    for (const m of classified)
      byCategory.set(m.category, (byCategory.get(m.category) ?? 0) + 1);
    const named = classified.filter((m) => m.displayName !== null).length;
    yield* Effect.logInfo(
      `markers — classified: ${[...byCategory.entries()]
        .toSorted((a, b) => b[1] - a[1])
        .map(([c, n]) => `${c}:${n}`)
        .join(' ')}; ${named} with English labels`,
    );

    // DLC proof: m61 tiles are Shadow of the Erdtree; show a sample so a refresh
    // visibly picks up DLC content.
    const dlc = classified.filter((e) => e.mapId.startsWith('m61'));
    yield* Effect.logInfo(`DLC (m61) markers: ${dlc.length}`);
    const sample = dlc.find((e) => e.displayName !== null) ?? dlc[0];
    if (sample) {
      yield* Effect.logInfo(
        `DLC sample — ${sample.mapId} [${sample.category}] ` +
          `"${sample.displayName ?? sample.name}" eid=${sample.entityID} ` +
          `@ (${sample.x.toFixed(1)}, ${sample.y.toFixed(1)}, ${sample.z.toFixed(1)})`,
      );
    }

    yield* Effect.logInfo(
      `markers — ${treasures.length} MSB treasure pickups (ItemLotParam_map ⨝ Part coords)`,
    );
    return { markers: classified, treasures };
  });
