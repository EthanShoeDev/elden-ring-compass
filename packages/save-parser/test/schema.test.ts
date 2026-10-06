/**
 * The web worker boundary validates every parse result against `LeanSave`, so the schema's
 * Int / raw-f32 split must accept what the parser actually produces. Each numeric field is
 * `Schema.Int` (an integer read) except the f32 reads (`RawF32`), which stay unrestricted so
 * one NaN coordinate can't reject a whole save.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Effect, Exit, Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import { LeanSave, parseSave } from '../src/index.ts';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const fixture = readFileSync(here('./fixtures/ER0000.sl2'));
const save = Effect.runSync(
  parseSave(
    fixture.buffer.slice(
      fixture.byteOffset,
      fixture.byteOffset + fixture.byteLength,
    ),
  ),
);
const decode = Schema.decodeUnknownExit(LeanSave);

describe('LeanSave schema', () => {
  it('accepts every slot the parser produces', () => {
    expect(save.slots).toHaveLength(5);
    expect(Exit.isSuccess(decode(save))).toBe(true);
  });

  it('passes a non-finite f32 through instead of rejecting the save', () => {
    const [slot] = save.slots;
    expect(slot).toBeDefined();
    const nanSave = {
      ...save,
      slots: [
        {
          ...slot,
          player_coords: {
            ...slot?.player_coords,
            player_coords: [Number.NaN, 0, 0],
          },
        },
      ],
    };
    expect(Exit.isSuccess(decode(nanSave))).toBe(true);
  });

  it('rejects a fractional value in an integer field', () => {
    const [slot] = save.slots;
    expect(slot).toBeDefined();
    const badSave = {
      ...save,
      slots: [{ ...slot, deaths: 1.5 }],
    };
    expect(Exit.isFailure(decode(badSave))).toBe(true);
  });
});
