import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { Effect, FileSystem } from 'effect';
import { expect } from 'vitest';

import { cleanInstall } from './dvdbnd.ts';

// File mtimes as epoch seconds (what `utimes` takes for a number).
const JAN = 1_768_780_800; // 2026-01-19 — the original install
const SEP = 1_788_739_200; // 2026-09-07 — a later game patch

// A game root with a backed-up `sd/` archive plus loose files a previous unpack
// wrote next to it, and one unpacked top-level dir (`chr/`).
const makeInstall = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: 'er-clean-' });
  yield* fs.makeDirectory(`${root}/_backup/sd`, { recursive: true });
  yield* fs.makeDirectory(`${root}/sd/wem`, { recursive: true });
  yield* fs.makeDirectory(`${root}/chr`, { recursive: true });
  yield* fs.writeFileString(`${root}/_backup/sd/sd.bdt`, 'original');
  yield* fs.utimes(`${root}/_backup/sd/sd.bdt`, JAN, JAN);
  yield* fs.writeFileString(`${root}/sd/wem/1.wem`, 'unpacked');
  yield* fs.writeFileString(`${root}/sd/a.bnk`, 'unpacked');
  yield* fs.writeFileString(`${root}/chr/c0000.dcx`, 'unpacked');
  return root;
});

const listSd = (root: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return (yield* fs.readDirectory(`${root}/sd`)).toSorted();
  });

it.layer(NodeServices.layer)('cleanInstall', (it) => {
  it.effect('restores sd/ from an up-to-date backup', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* makeInstall;
      // Same size + mtime as the backup: unpatched (the content differs only so
      // the assertion below proves the backup copy was restored).
      yield* fs.writeFileString(`${root}/sd/sd.bdt`, 'live-sd!');
      yield* fs.utimes(`${root}/sd/sd.bdt`, JAN, JAN);

      yield* cleanInstall(root);

      expect(yield* listSd(root)).toEqual(['sd.bdt']);
      expect(yield* fs.readFileString(`${root}/sd/sd.bdt`)).toBe('original');
      expect(yield* fs.exists(`${root}/_backup`)).toBe(false);
      expect(yield* fs.exists(`${root}/chr`)).toBe(false);
    }).pipe(Effect.scoped),
  );

  it.effect('keeps patched sd/ archives instead of a stale backup', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* makeInstall;
      // A game patch rewrote the live archive after the backup was taken.
      yield* fs.writeFileString(`${root}/sd/sd.bdt`, 'patched!');
      yield* fs.utimes(`${root}/sd/sd.bdt`, SEP, SEP);

      yield* cleanInstall(root);

      expect(yield* listSd(root)).toEqual(['sd.bdt']);
      expect(yield* fs.readFileString(`${root}/sd/sd.bdt`)).toBe('patched!');
      expect(yield* fs.exists(`${root}/_backup`)).toBe(false);
      expect(yield* fs.exists(`${root}/chr`)).toBe(false);
    }).pipe(Effect.scoped),
  );
});
