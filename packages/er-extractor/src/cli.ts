import { Command, Options } from '@effect/cli';
import { Path } from '@effect/platform';
import { Effect } from 'effect';

import { PipelineContext } from './domain/context.ts';
import { runPipeline } from './pipeline.ts';

// `--clean`: re-extract the dvdbnd archives from scratch — restore backups and
// delete previously-unpacked dirs first (e.g. to refresh after a game patch).
const clean = Options.boolean('clean').pipe(
  Options.withDefault(false),
  Options.withDescription(
    'Re-extract from scratch: restore backups + delete previously-unpacked dirs.',
  ),
);

// `--game-dir` / `-g`: the Elden Ring install folder (the one containing `Game/`),
// e.g. `C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING`.
const gameDir = Options.directory('game-dir', { exists: 'yes' }).pipe(
  Options.withAlias('g'),
  Options.withDescription(
    'Path to the Elden Ring install folder (the directory containing Game/).',
  ),
);

// `--out` / `-o`: where extracted artifacts (and the generated data files) land.
const outDir = Options.directory('out', { exists: 'either' }).pipe(
  Options.withAlias('o'),
  Options.withDefault('.er-extractor-out'),
  Options.withDescription('Directory to write extracted artifacts into.'),
);

const extract = Command.make(
  'extract',
  { gameDir, outDir, clean },
  ({ gameDir, outDir, clean }) =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      yield* runPipeline.pipe(
        Effect.provideService(PipelineContext, {
          gameDir,
          gameRoot: path.join(gameDir, 'Game'),
          outDir,
          clean,
        }),
      );
    }),
);

const root = Command.make('er-extractor').pipe(
  Command.withSubcommands([extract]),
);

export const cli = Command.run(root, {
  name: 'Elden Ring data extractor',
  version: '0.0.0',
});
