import { Effect } from 'effect';

import { PipelineContext } from './domain/context.ts';
import { codegen } from './stages/codegen.ts';
import { flags } from './stages/flags.ts';
import { images } from './stages/images.ts';
import { join } from './stages/join.ts';
import { markers } from './stages/markers.ts';
import { params } from './stages/params.ts';
import { text } from './stages/text.ts';
import { unpack } from './stages/unpack.ts';

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
  const { weapons, armor, talismans, goods, ashesOfWar, spells, spiritAshes } =
    yield* join(paramFiles, names).pipe(Effect.annotateLogs('stage', '4-join'));
  const markerEntities = yield* markers.pipe(
    Effect.annotateLogs('stage', '5-markers'),
  );
  const { graces, bosses } = yield* flags(paramFiles).pipe(
    Effect.annotateLogs('stage', '6-flags'),
  );
  yield* images.pipe(Effect.annotateLogs('stage', '7-images'));
  yield* codegen({
    graces,
    bosses,
    weapons,
    armor,
    talismans,
    goods,
    ashesOfWar,
    spells,
    spiritAshes,
    markers: markerEntities,
    names,
  }).pipe(Effect.annotateLogs('stage', '8-codegen'));

  yield* Effect.logInfo('Done.');
});
