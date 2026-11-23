import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { expect } from 'vitest';

import { readFixtureSave } from '@/test/fixture-save';

import { parseEldenRingData } from '../er-save-parser';
import { decodeFromUrl } from './decode';
import { encodeToUrl, slotToShareableProgression } from './encode';

// The share schema marks every value `Schema.Int` except the f32 position, facing and buff
// timers (`Schema.Finite`). Round-tripping every character in the committed fixture save
// proves the split matches what real saves produce: a wrong `Int` would fail encode here.

it.layer(NodeServices.layer)('share links from real saves', (it) => {
  it.effect('every fixture character round-trips through a share link', () =>
    Effect.gen(function* () {
      const buffer = yield* readFixtureSave;
      const save = parseEldenRingData(buffer);
      expect(save.slots).toHaveLength(5);
      for (const slot of save.slots) {
        const progression = slotToShareableProgression(slot);
        const encoded = yield* encodeToUrl(progression);
        const decoded = decodeFromUrl(encoded);
        expect(decoded, slot.player_game_data.character_name).toStrictEqual(
          progression,
        );
      }
    }),
  );
});
