import { Array as Arr, Effect, Option, Predicate } from 'effect';

import { PipelineContext } from '../domain/context.ts';
import { findOodleDll } from '../external/oodle.ts';
import { loadArchetypes } from '../game/archetypes.ts';
import { loadBosses } from '../game/bosses.ts';
import { loadGraces } from '../game/graces.ts';
import { loadMapFragments } from '../game/map-fragments.ts';
import { loadRegions } from '../game/regions.ts';

/**
 * Stage 5 — event flags. Both halves derive from the install (no curated
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
    const dlcGraces = Arr.filter(graces, (g) => g.areaNo === 61).length;
    const regions = new Set(
      Arr.filter(
        Arr.map(graces, (g) => g.region),
        Predicate.isTruthy,
      ),
    ).size;
    yield* Effect.logInfo(
      `graces — ${graces.length} (DLC overworld: ${dlcGraces}) across ${regions} regions`,
    );
    const first = Arr.findFirst(graces, (g) => g.flagId === 76101);
    if (Option.isSome(first))
      yield* Effect.logInfo(
        `grace sample — flag ${first.value.flagId} = "${first.value.name}" [${first.value.region}]`,
      );

    const bosses = yield* loadBosses(params, ctx.gameRoot, oo2core);
    const named = Arr.filter(
      bosses,
      (b) => b.name !== null && b.name !== '',
    ).length;
    yield* Effect.logInfo(
      `boss defeat flags — ${bosses.length} arenas (GameAreaParam), ${named} named via EMEVD`,
    );
    // DLC proof: Messmer's defeat flag + name resolve from the event scripts.
    const messmer = Arr.findFirst(bosses, (b) => b.defeatFlagId === 21010800);
    yield* Effect.logInfo(
      Option.match(messmer, {
        onNone: () => 'Messmer defeat flag not found',
        onSome: (m) =>
          `DLC boss sample — flag ${m.defeatFlagId} "${m.name ?? '(unnamed)'}" @ ${m.mapId}`,
      }),
    );

    const { regions: playRegions, matchmakingRegionIds } = yield* loadRegions(
      params,
      graces,
      bosses,
    );
    const openWorld = Arr.filter(playRegions, (r) => r.isOpenWorld).length;
    const interior = Arr.filter(playRegions, (r) => r.isDungeon).length;
    yield* Effect.logInfo(
      `regions — ${playRegions.length} placed (${openWorld} open-world, ` +
        `${interior} interior); ` +
        `${matchmakingRegionIds.length} matchmaking siblings (areaNo=0) ignored`,
    );

    const mapFragments = yield* loadMapFragments(params, ctx.gameRoot, oo2core);
    const namedFragments = Arr.filter(
      mapFragments,
      (m) => m.name !== null && m.name !== '',
    ).length;
    yield* Effect.logInfo(
      `map fragments — ${mapFragments.length} pieces (WorldMapPieceParam), ` +
        `${namedFragments} with a coarse PlaceName`,
    );

    const archetypes = yield* loadArchetypes(ctx.gameRoot, oo2core);
    yield* Effect.logInfo(
      `archetypes — ${archetypes.length} starting classes (GR_MenuText)`,
    );

    return {
      graces,
      bosses,
      regions: playRegions,
      matchmakingRegionIds,
      mapFragments,
      archetypes,
    };
  });
