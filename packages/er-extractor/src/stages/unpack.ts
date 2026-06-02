import { Effect } from 'effect';

import type { PipelineContext } from '../domain/context.ts';

/**
 * Stage 1 — locate & unpack. Decrypt/decompress `regulation.bin` (DCX_ZSTD) and
 * unpack the needed `msgbnd`/`tpf`/`msb` (DCX_KRAK/Oodle via ../external/oodle).
 */
export const unpack = (ctx: PipelineContext) =>
  Effect.logInfo(
    `[1/8 unpack] TODO: zstd regulation.bin + Oodle game files from ${ctx.gameRoot}`,
  );
