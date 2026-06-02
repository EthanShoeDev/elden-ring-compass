import { Effect } from 'effect';

import type { PipelineContext } from './domain/context.ts';
import { codegen } from './stages/codegen.ts';
import { flags } from './stages/flags.ts';
import { images } from './stages/images.ts';
import { join } from './stages/join.ts';
import { markers } from './stages/markers.ts';
import { params } from './stages/params.ts';
import { text } from './stages/text.ts';
import { unpack } from './stages/unpack.ts';

/**
 * The end-to-end extraction pipeline (plan §6). Every stage is currently a
 * stub that logs what it will do; fill them in per the phased plan. Stages are
 * sequenced here, but most are independent and can later fan out with
 * `Effect.all({ concurrency })` once they return real artifacts.
 */
export const runPipeline = (ctx: PipelineContext) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`er-extractor — game: ${ctx.gameRoot}`);
    yield* Effect.logInfo(`er-extractor — out:  ${ctx.outDir}`);

    yield* unpack(ctx);
    yield* params(ctx);
    yield* text(ctx);
    yield* join(ctx);
    yield* markers(ctx);
    yield* flags(ctx);
    yield* images(ctx);
    yield* codegen(ctx);

    yield* Effect.logInfo('Done (scaffold — every stage is a stub).');
  });
