/**
 * Parity test: the pure-TS parser must reproduce the verified WASM parser's lean DTO
 * byte-for-byte on the committed `ER0000.sl2` fixture (5 active slots). The oracle is a
 * FROZEN golden file: it was generated from the (now-retired) verified Rust/WASM parser, so it
 * is the independent source of truth captured before that parser was deleted. The event-flag
 * bitfield is pinned by length + SHA-256. If the DTO shape ever changes intentionally, update
 * the golden by hand (or temporarily restore the WASM parser to regenerate).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseSave } from '../src/index.ts';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

const fixture = readFileSync(here('../../../apps/web/public/ER0000.sl2'));
const arrayBuffer = fixture.buffer.slice(
  fixture.byteOffset,
  fixture.byteOffset + fixture.byteLength,
);

type OracleSlot = Record<string, unknown> & {
  event_flags: { flags_length: number; flags_sha256: string };
};
const oracle = JSON.parse(
  readFileSync(here('./fixtures/oracle.er0000.json'), 'utf8'),
) as {
  global_steam_id: string;
  character_steam_ids: string[];
  slots: OracleSlot[];
};

const parsed = parseSave(arrayBuffer);

const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

/** Replace the parser's Uint8Array flags with the oracle's {length, sha256} form. */
const normalize = (slot: (typeof parsed.slots)[number]) => ({
  ...slot,
  event_flags: {
    flags_length: slot.event_flags.flags.length,
    flags_sha256: sha256(slot.event_flags.flags),
  },
});

describe('TS save parser parity with WASM oracle (ER0000.sl2)', () => {
  it('matches account-level fields', () => {
    expect(parsed.global_steam_id).toBe(oracle.global_steam_id);
    expect(parsed.character_steam_ids).toEqual(oracle.character_steam_ids);
    expect(parsed.slots).toHaveLength(oracle.slots.length);
  });

  for (let i = 0; i < oracle.slots.length; i++) {
    it(`slot[${i}] matches the oracle byte-for-byte`, () => {
      expect(normalize(parsed.slots[i]!)).toEqual(oracle.slots[i]);
    });
  }
});
