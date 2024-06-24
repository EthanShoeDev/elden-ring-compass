import { parse_save_wasm } from './wasm-wrapper';

export function fileToArrBuffer(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result;
      if (buffer instanceof ArrayBuffer) {
        try {
          resolve(buffer);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };
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

export function parseEldenRingData(rawSaveData: Readonly<ArrayBuffer>) {
  const save = new Uint8Array(rawSaveData);
  const saveData = parse_save_wasm(save);
  return saveData;
}
