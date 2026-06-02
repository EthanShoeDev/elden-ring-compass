import { createDecipheriv } from 'node:crypto';

import { Data, Effect } from 'effect';

import type { OodleError } from '../external/oodle.ts';
import { type Bnd4Error, parseBnd4 } from '../formats/bnd4.ts';
import { type DcxError, dcxDecompress } from '../formats/dcx.ts';
import { ER_REGULATION_KEY } from '../vendor/er-regulation-key.ts';

/**
 * Loads the param files from `regulation.bin`: AES-256-CBC decrypt (IV = first
 * 16 bytes, no padding) → `DCX_ZSTD` decompress → BND4 → `name → bytes` map
 * keyed by param name (e.g. "EquipParamWeapon"). The AES key is vendored
 * (see ../vendor/er-regulation-key.ts); the regulation already has DLC params
 * merged in.
 */

export class RegulationError extends Data.TaggedError('RegulationError')<{
  readonly detail: string;
}> {}

export const loadRegulationParams = (
  gameRoot: string,
  oo2corePath: string,
): Effect.Effect<
  Map<string, Uint8Array>,
  RegulationError | DcxError | OodleError | Bnd4Error
> =>
  Effect.gen(function* () {
    const enc = new Uint8Array(
      yield* Effect.promise(() =>
        Bun.file(`${gameRoot}/regulation.bin`).arrayBuffer(),
      ),
    );
    const decrypted = yield* Effect.try({
      try: () => {
        const decipher = createDecipheriv(
          'aes-256-cbc',
          ER_REGULATION_KEY,
          enc.subarray(0, 16),
        );
        decipher.setAutoPadding(false);
        return new Uint8Array(
          Buffer.concat([decipher.update(enc.subarray(16)), decipher.final()]),
        );
      },
      catch: (cause) =>
        new RegulationError({ detail: `AES decrypt failed: ${String(cause)}` }),
    });
    // The decrypted payload is DCX_ZSTD (no Oodle needed, but pass the path anyway).
    const bnd = yield* dcxDecompress(decrypted, oo2corePath);
    const entries = yield* parseBnd4(bnd);

    const params = new Map<string, Uint8Array>();
    for (const entry of entries) {
      const base = (entry.name ?? '').split(/[\\/]/).pop() ?? '';
      const match = base.match(/^(.+)\.param$/i);
      if (match) params.set(match[1]!, entry.bytes);
    }
    return params;
  });
