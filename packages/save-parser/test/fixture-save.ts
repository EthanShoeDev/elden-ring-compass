import { fileURLToPath } from 'node:url';

import { NodeFileSystem } from '@effect/platform-node';
import { Effect, FileSystem } from 'effect';

const fixturePath = fileURLToPath(
  new URL('fixtures/ER0000.sl2', import.meta.url),
);

/** The committed `ER0000.sl2` fixture as an exact-size ArrayBuffer (the read view may sit in a larger buffer). */
export const loadFixtureSave = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const bytes = yield* fs.readFile(fixturePath);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}).pipe(Effect.provide(NodeFileSystem.layer));
