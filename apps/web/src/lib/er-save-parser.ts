import { parseSave } from '@elden-ring-compass/save-parser-ts';

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
  rawSaveData: Readonly<ArrayBuffer>,
): WasmEldenRingSave {
  return parseSave(rawSaveData as ArrayBuffer) as unknown as WasmEldenRingSave;
}
