import { parseSave } from '@elden-ring-compass/save-parser-ts';
import { Effect } from 'effect';

import type { WasmEldenRingSave } from './save-dto';

export function fileToArrBuffer(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const buffer = reader.result;
      if (buffer instanceof ArrayBuffer) {
        resolve(buffer);
      }
    });
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Failed to read file'));
    });
    reader.readAsArrayBuffer(file);
  });
}

export async function parseEldenRingFile(file: File) {
  const rawSaveData = await fileToArrBuffer(file);
  return parseEldenRingData(rawSaveData);
}
export async function parseEldenRingUrl(url: string) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  try {
    return parseEldenRingData(buffer);
  } catch (err) {
    console.error(err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// Parses a save into the lean web DTO via the pure-TS parser
// (`@elden-ring-compass/save-parser-ts`). Its `LeanSave` is structurally identical to the
// app's `WasmEldenRingSave` (verified byte-for-byte vs the retired WASM parser); the cast
// keeps the historical type name the view-models import.
export function parseEldenRingData(
  rawSaveData: ArrayBuffer,
): WasmEldenRingSave {
  // `parseSave` is Effect-native; run it synchronously here so the worker's existing
  // try/catch (error -> string) path is unchanged. Typed parse failures are converted to
  // a readable `Error` before running, so `runSync` throws something the worker can format.
  // No cast: `parseSave` returns `LeanSave`, which IS `WasmEldenRingSave` (see save-dto.ts).
  return Effect.runSync(
    parseSave(rawSaveData).pipe(
      Effect.mapError((e) =>
        e._tag === 'save-parser/SaveMagicMismatchError'
          ? new Error(
              'Not a PC Elden Ring save (expected "BND4" magic). PS/Switch saves are not supported.',
            )
          : new Error(
              `Save data truncated: needed ${e.need} byte(s) at offset ${e.at} (buffer length ${e.length}).`,
            ),
      ),
      Effect.orDie,
    ),
  );
}
