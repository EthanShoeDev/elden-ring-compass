import { Effect } from 'effect';

import { PipelineContext } from '../domain/context.ts';
import { findOodleDll } from '../external/oodle.ts';
import { loadArchetypes } from '../game/archetypes.ts';
import { loadBosses } from '../game/bosses.ts';
import { loadGraces } from '../game/graces.ts';
import { loadMapFragments } from '../game/map-fragments.ts';
import { loadRegions } from '../game/regions.ts';

/**
 * Stage 6 — event flags. Both halves derive from the install (no curated
 * overlay), so a patched game flows through unchanged:
 *   - Graces  — `BonfireWarpParam` ⨝ PlaceName/GR_MenuText FMGs → flag + name +
 *     region. Fully self-updating.
 *   - Bosses  — `GameAreaParam.defeatBossFlagId` → the boss DEFEAT flags
 *     (base + DLC), with names resolved from the EMEVD `EnableBossHealthBar`
 *     instruction (see boss-names.ts). Fully self-updating.
 *
 * Takes the regulation params from the `params` stage rather than re-loading.
 */
export const flags = (params: Map<string, Uint8Array>) =>
  Effect.gen(function* () {
    const ctx = yield* PipelineContext;
    const oo2core = yield* findOodleDll(ctx.gameRoot);

    const graces = yield* loadGraces(params, ctx.gameRoot, oo2core);
    const dlcGraces = graces.filter((g) => g.areaNo === 61).length;
    const regions = new Set(graces.map((g) => g.region).filter(Boolean)).size;
    yield* Effect.logInfo(
      `graces — ${graces.length} (DLC overworld: ${dlcGraces}) across ${regions} regions`,
    );
    const first = graces.find((g) => g.flagId === 76101);
    if (first)
      yield* Effect.logInfo(
        `grace sample — flag ${first.flagId} = "${first.name}" [${first.region}]`,
      );

    const bosses = yield* loadBosses(params, ctx.gameRoot, oo2core);
    const named = bosses.filter((b) => b.name).length;
    yield* Effect.logInfo(
      `boss defeat flags — ${bosses.length} arenas (GameAreaParam), ${named} named via EMEVD`,
    );
    // DLC proof: Messmer's defeat flag + name resolve from the event scripts.
    const messmer = bosses.find((b) => b.defeatFlagId === 21010800);
    yield* Effect.logInfo(
      messmer
        ? `DLC boss sample — flag ${messmer.defeatFlagId} "${messmer.name ?? '(unnamed)'}" @ ${messmer.mapId}`
        : 'Messmer defeat flag not found',
    );

    const playRegions = yield* loadRegions(params, graces);
    const openWorld = playRegions.filter((r) => r.isOpenWorld).length;
    yield* Effect.logInfo(
      `regions — ${playRegions.length} named via grace (${openWorld} open-world, ` +
        `${playRegions.filter((r) => r.isDungeon).length} interior)`,
    );

    const mapFragments = yield* loadMapFragments(params, ctx.gameRoot, oo2core);
    const namedFragments = mapFragments.filter((m) => m.name).length;
    yield* Effect.logInfo(
      `map fragments — ${mapFragments.length} pieces (WorldMapPieceParam), ` +
        `${namedFragments} with a coarse PlaceName`,
    );

    const archetypes = yield* loadArchetypes(ctx.gameRoot, oo2core);
    yield* Effect.logInfo(
      `archetypes — ${archetypes.length} starting classes (GR_MenuText)`,
    );

    return { graces, bosses, regions: playRegions, mapFragments, archetypes };
  });
