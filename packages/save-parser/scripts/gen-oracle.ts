/**
 * Generate a ground-truth oracle for the TS save parser by running the *verified*
 * WASM parser (the existing `@elden-ring-compass/save-parser` Rust build) against the
 * committed `ER0000.sl2` fixture and dumping its lean DTO to JSON. The TS port's
 * parity test diffs against this so we can iterate fast in Node/bun without the
 * browser. Re-run with `bun run gen-oracle` whenever the WASM parser changes.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import init, { parse_save } from '@elden-ring-compass/save-parser';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

const wasmPath = here(
  '../../elden-ring-save-parser/pkg/elden_ring_save_parser_bg.wasm',
);
const fixturePath = here('../../../apps/web/public/ER0000.sl2');
const outPath = here('../test/fixtures/oracle.er0000.json');

await init({ module_or_path: readFileSync(wasmPath) });

const save = new Uint8Array(readFileSync(fixturePath));
const result = parse_save(save) as {
  global_steam_id: string;
  character_steam_ids: string[];
  slots: Array<Record<string, unknown> & { event_flags: { flags: Uint8Array } }>;
};

// event_flags is a (large) Uint8Array; store length + SHA-256 so the oracle stays a
// small, committable JSON while still pinning the bitfield byte-for-byte.
const serialized = {
  ...result,
  slots: result.slots.map((slot) => ({
    ...slot,
    event_flags: {
      flags_length: slot.event_flags.flags.length,
      flags_sha256: createHash('sha256')
        .update(slot.event_flags.flags)
        .digest('hex'),
    },
  })),
};

writeFileSync(outPath, JSON.stringify(serialized, null, 2));
console.log(
  `Wrote oracle: ${result.slots.length} slot(s), global_steam_id=${result.global_steam_id}`,
);
for (const [i, slot] of result.slots.entries()) {
  const pgd = slot.player_game_data as { character_name: string; level: number };
  console.log(
    `  slot[${i}] name=${JSON.stringify(pgd.character_name)} level=${pgd.level} flags=${
      (slot.event_flags.flags as Uint8Array).length
    }B`,
  );
}
