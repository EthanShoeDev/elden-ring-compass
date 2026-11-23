import { Effect, FileSystem, Path } from 'effect';

// Resolve the repo root by walking up for `turbo.jsonc`, NOT from `process.cwd()` or
// `import.meta.url`: the tests run both per-package (cwd = apps/web) and via the root
// vitest config (cwd = repo root), and in the jsdom env `import.meta.url` isn't a
// `file://` URL. Walking up to a known root marker is stable across all of these.
const repoRoot = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const isRoot = yield* fs.exists(path.join(dir, 'turbo.jsonc'));
    if (isRoot) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
});

/** Absolute path of the committed base-game `ER0000.sl2` fixture (5 characters). */
export const fixtureSavePath = Effect.gen(function* () {
  const path = yield* Path.Path;
  const root = yield* repoRoot;
  return path.join(
    root,
    'packages',
    'save-parser',
    'test',
    'fixtures',
    'ER0000.sl2',
  );
});

/** Read a save file into an exact-size ArrayBuffer (the FileSystem view may sit in a larger buffer). */
export const readSaveBuffer = Effect.fnUntraced(function* (absPath: string) {
  const fs = yield* FileSystem.FileSystem;
  const bytes = yield* fs.readFile(absPath);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
});

/** The committed `ER0000.sl2` fixture as an exact-size ArrayBuffer. */
export const readFixtureSave = Effect.flatMap(fixtureSavePath, readSaveBuffer);
