import {
  Array as Arr,
  Effect,
  Order,
  pipe,
  Record as Rec,
  String as Str,
} from 'effect';

import { PipelineContext } from './domain/context.ts';
import { resolveBossArenas } from './game/bosses.ts';
import { loadGameVersion } from './game/game-version.ts';
import { loadDlcMapAreas } from './game/map-archives.ts';
import { loadPlacements } from './game/placements.ts';
import { loadSpEffectLabels } from './game/sp-effect-labels.ts';
import { loadLegacyConv } from './game/world-map-legacy-conv.ts';
import { codegen } from './stages/codegen.ts';
import { flags } from './stages/flags.ts';
import { images } from './stages/images.ts';
import { join } from './stages/join.ts';
import { markers } from './stages/markers.ts';
import { params } from './stages/params.ts';
import { text } from './stages/text.ts';
import { unpack } from './stages/unpack.ts';

const byLocale: Order.Order<string> = (a, b) => Str.localeCompare(b)(a);

/**
 * The end-to-end extraction pipeline (plan §6). Stages are `Effect`s that pull
 * what they need from the `PipelineContext` tag (provided in cli.ts) — no `ctx`
 * is threaded through. Each step is wrapped with `Effect.annotateLogs('stage',
 * …)` so every log line it emits is tagged with its stage. Currently most stages
 * are stubs that log what they will do; they're sequenced here but, being
 * independent, can later fan out with `Effect.all({ concurrency })`.
 */
export const runPipeline = Effect.gen(function* () {
  const ctx = yield* PipelineContext;
  yield* Effect.logInfo(`install: ${ctx.gameRoot}`);
  yield* Effect.logInfo(`out (codegen artifacts): ${ctx.outDir}`);

  yield* unpack.pipe(Effect.annotateLogs('stage', '1-unpack'));
  const paramFiles = yield* params.pipe(
    Effect.annotateLogs('stage', '2-params'),
  );
  const names = yield* text.pipe(Effect.annotateLogs('stage', '3-text'));
  const {
    weapons,
    armor,
    talismans,
    goods,
    ashesOfWar,
    spells,
    spiritAshes,
    weaponScaling,
    reinforceTypes,
    attackElementCorrects,
    calcCorrectGraphs,
  } = yield* join(paramFiles, names).pipe(
    Effect.annotateLogs('stage', '4-join'),
  );
  const {
    graces,
    bosses,
    regions,
    matchmakingRegionIds,
    mapFragments,
    archetypes,
  } = yield* flags(paramFiles).pipe(Effect.annotateLogs('stage', '5-flags'));
  // markers runs after flags: it classifies entities using `graces` (the bonfire
  // entity→name join) and `paramFiles` (NpcParam → NpcName for named NPCs). It also
  // returns MSB Treasure events (placed-treasure Part coords ⨝ ItemLotParam_map).
  const { markers: markerEntities, treasures } = yield* markers(
    paramFiles,
    graces,
  ).pipe(Effect.annotateLogs('stage', '6-markers'));
  // dlc: which map areas ship in DLC.bdt. Settles boss arenas against the MSB
  // (needs markers) and flags DLC bosses + graces by area.
  const dlc = yield* Effect.gen(function* () {
    const dlcAreas = yield* loadDlcMapAreas(ctx.gameRoot);
    yield* Effect.logInfo(
      `DLC map areas — ${Arr.join(
        Arr.map(Arr.sort([...dlcAreas], Order.Number), (a) => `m${a}`),
        ' ',
      )}`,
    );
    const resolved = resolveBossArenas(bosses, markerEntities, dlcAreas);
    for (const o of resolved.overrides)
      yield* Effect.logInfo(`boss arena from MSB (param row disagrees): ${o}`);
    const tagged = Arr.map(graces, (g) => ({
      ...g,
      isDlc: dlcAreas.has(g.areaNo),
    }));
    yield* Effect.logInfo(
      `DLC — bosses ${Arr.filter(resolved.bosses, (b) => b.isDlc).length}/${resolved.bosses.length}, ` +
        `graces ${Arr.filter(tagged, (g) => g.isDlc).length}/${tagged.length}`,
    );
    return { bosses: resolved.bosses, graces: tagged };
  }).pipe(Effect.annotateLogs('stage', '6-dlc'));
  // placements: enemy/boss drops (npcParamId → NpcParam.itemLotId_enemy →
  // ItemLotParam_enemy, joined to enemy marker coords) PLUS map treasure (MSB
  // Treasure event Part coords → ItemLotParam_map).
  const placementRows = yield* loadPlacements(
    paramFiles,
    markerEntities,
    treasures,
    ctx.gameRoot,
  ).pipe(Effect.annotateLogs('stage', '7-placements'));
  const enemyCount = Arr.filter(
    placementRows,
    (p) => p.source === 'enemy',
  ).length;
  yield* Effect.logInfo(
    `placements — ${placementRows.length} item drops (enemy:${enemyCount} map:${placementRows.length - enemyCount})`,
  ).pipe(Effect.annotateLogs('stage', '7-placements'));
  // legacy-conv: WorldMapLegacyConvParam → per-dungeon overworld projection offset.
  const legacyConv = yield* loadLegacyConv(paramFiles).pipe(
    Effect.annotateLogs('stage', '7-legacy-conv'),
  );
  const convDungeons = new Set(Arr.map(legacyConv, (c) => c.srcMapId)).size;
  const byMaster = Arr.reduce(
    legacyConv,
    Rec.empty<string, number>(),
    (acc, c) => {
      acc[c.master] = (acc[c.master] ?? 0) + 1;
      return acc;
    },
  );
  const masterCounts = pipe(
    Rec.toEntries(byMaster),
    Arr.sortWith(([m]) => m, byLocale),
    Arr.map(([m, n]) => `${m}:${n}`),
    Arr.join(' '),
  );
  yield* Effect.logInfo(
    `legacy-conv — ${legacyConv.length} base points across ${convDungeons} dungeons (${masterCounts})`,
  ).pipe(Effect.annotateLogs('stage', '7-legacy-conv'));
  // sp-effect labels: invert item→SpEffect refs so a save's active sp_effects[]
  // can be named (consumables/spells/talismans/gear). Partial coverage by design.
  const spEffects = yield* loadSpEffectLabels(paramFiles, names).pipe(
    Effect.annotateLogs('stage', '8-sp-effects'),
  );
  yield* Effect.logInfo(`sp-effect labels — ${spEffects.length}`).pipe(
    Effect.annotateLogs('stage', '8-sp-effects'),
  );

  const gameVersion = yield* loadGameVersion(ctx.gameRoot).pipe(
    Effect.annotateLogs('stage', '8-game-version'),
  );

  yield* images.pipe(Effect.annotateLogs('stage', '8-images'));
  yield* codegen({
    graces: dlc.graces,
    bosses: dlc.bosses,
    regions,
    matchmakingRegionIds,
    mapFragments,
    archetypes,
    weapons,
    armor,
    talismans,
    goods,
    ashesOfWar,
    spells,
    spiritAshes,
    weaponScaling,
    reinforceTypes,
    attackElementCorrects,
    calcCorrectGraphs,
    markers: markerEntities,
    placements: placementRows,
    legacyConv,
    spEffects,
    names,
    gameVersion,
  }).pipe(Effect.annotateLogs('stage', '9-codegen'));

  yield* Effect.logInfo('Done.');
});
