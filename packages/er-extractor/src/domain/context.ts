import { Context } from 'effect';

/**
 * Resolved paths/flags for an extraction run.
 *
 * `gameDir`  — the install folder the user pointed at (contains `Game/`).
 * `gameRoot` — `<gameDir>/Game`, where `regulation.bin`, the dvdbnd archives,
 *              and the `oo2core_*.dll` Oodle decoder live (also the unpack target).
 * `outDir`   — scratch + artifact output directory (used by the codegen stage).
 * `clean`    — re-extract from scratch (restore backups + delete unpacked dirs).
 * `imageFormat`/`imageQuality` — output encoding for the images stage
 *              (webp/png/jpeg/avif; quality 1–100, ignored for png).
 */
export type ImageFormat = 'webp' | 'png' | 'jpeg' | 'avif';

export interface PipelineContextValue {
  readonly gameDir: string;
  readonly gameRoot: string;
  readonly outDir: string;
  readonly clean: boolean;
  readonly imageFormat: ImageFormat;
  readonly imageQuality: number;
}

/**
 * Effect context tag for the run config. Stages depend on it by `yield*`-ing the
 * tag rather than taking a `ctx` parameter; `cli.ts` provides it once at the top
 * via `Effect.provideService`.
 */
export class PipelineContext extends Context.Tag(
  'er-extractor/PipelineContext',
)<PipelineContext, PipelineContextValue>() {}
