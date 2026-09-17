import { Effect, Path } from 'effect';
import { Command, Flag } from 'effect/unstable/cli';

import { type ImageFormat, PipelineContext } from './domain/context.ts';
import { runPipeline } from './pipeline.ts';

// `--clean`: re-extract the dvdbnd archives from scratch — restore backups and
// delete previously-unpacked dirs first (e.g. to refresh after a game patch).
const clean = Flag.Boolean('clean').pipe(
  Flag.withDefault(false),
  Flag.withDescription(
    'Re-extract from scratch: restore backups + delete previously-unpacked dirs.',
  ),
);

// `--game-dir` / `-g`: the Elden Ring install folder (the one containing `Game/`),
// e.g. `C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING`.
const gameDir = Flag.Directory('game-dir', { mustExist: true }).pipe(
  Flag.withAlias('g'),
  Flag.withDescription(
    'Path to the Elden Ring install folder (the directory containing Game/).',
  ),
);

// `--out` / `-o`: where extracted artifacts (and the generated data files) land.
const outDir = Flag.Directory('out').pipe(
  Flag.withAlias('o'),
  Flag.withDefault('.er-extractor-out'),
  Flag.withDescription('Directory to write extracted artifacts into.'),
);

// `--image-format` / `--image-quality`: encoding for the images stage. WebP at
// q80 keeps tiles small; png is lossless; avif is smallest but slowest.
const imageFormat = Flag.Literals('image-format', [
  'webp',
  'png',
  'jpeg',
  'avif',
]).pipe(
  Flag.withDefault('webp' as ImageFormat),
  Flag.withDescription('Output format for extracted images (default webp).'),
);
const imageQuality = Flag.Int('image-quality').pipe(
  Flag.withDefault(80),
  Flag.withDescription('Quality 1–100 for lossy image formats (default 80).'),
);

const extract = Command.make(
  'extract',
  { gameDir, outDir, clean, imageFormat, imageQuality },
  ({ gameDir, outDir, clean, imageFormat, imageQuality }) =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      yield* runPipeline.pipe(
        Effect.provideService(PipelineContext, {
          gameDir,
          gameRoot: path.join(gameDir, 'Game'),
          outDir,
          clean,
          imageFormat,
          imageQuality,
        }),
      );
    }),
);

const root = Command.make('er-extractor').pipe(
  Command.withSubcommands([extract]),
);

export const cli = Command.run(root, {
  version: '0.0.0',
});
