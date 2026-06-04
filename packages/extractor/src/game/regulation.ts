import { createDecipheriv } from 'node:crypto';

import { ER_REGULATION_KEY } from '@elden-ring-compass/vendored-data';
import { Data, Effect, FileSystem } from 'effect';

import type { OodleError } from '../external/oodle.ts';
import { type Bnd4Error, parseBnd4 } from '../formats/bnd4.ts';
import { type DcxError, dcxDecompress } from '../formats/dcx.ts';

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
  RegulationError | DcxError | OodleError | Bnd4Error,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const enc = yield* fs
      .readFile(`${gameRoot}/regulation.bin`)
      .pipe(
        Effect.mapError(
          (cause) =>
            new RegulationError({ detail: `reading regulation.bin: ${cause}` }),
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
