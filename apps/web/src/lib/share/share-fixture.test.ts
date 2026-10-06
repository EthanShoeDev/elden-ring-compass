import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { Effect, FileSystem } from 'effect';
import { expect } from 'vitest';
import { parseEldenRingData } from '../er-save-parser';
import { decodeFromUrl } from './decode';
import { encodeToUrl, slotToShareableProgression } from './encode';

// The share schema marks every value `Schema.Int` except the f32 position, facing and buff
// timers (`Schema.Finite`). Round-tripping every character in the committed fixture save
// proves the split matches what real saves produce: a wrong `Int` would fail encode here.

const REPO_ROOT = (() => {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'turbo.jsonc'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
})();

it.layer(NodeServices.layer)('share links from real saves', (it) => {
  it.effect('every fixture character round-trips through a share link', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const bytes = yield* fs.readFile(
        join(REPO_ROOT, 'packages', 'save-parser', 'test', 'fixtures', 'ER0000.sl2'),
      );
      const save = parseEldenRingData(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      );
      expect(save.slots).toHaveLength(5);
      for (const slot of save.slots) {
        const progression = slotToShareableProgression(slot);
        const decoded = decodeFromUrl(yield* encodeToUrl(progression));
        expect(decoded, slot.player_game_data.character_name).toStrictEqual(progression);
      }
    }),
  );
});
