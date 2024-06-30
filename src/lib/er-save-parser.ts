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
  console.log('saveData', saveData);
  const json = (o: object) =>
    JSON.stringify(
      o,
      (_, v) => (typeof v === 'bigint' ? v.toString() : (v as string)),
      2
    );
  void fetch('http://localhost:3000', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    mode: 'no-cors',
    body: json(saveData),
  });
  // console.log('json', json(saveData).length.toLocaleString());
  // console.log('slot0', json(saveData.slots[0]).length.toLocaleString());
  // console.log('slot1', json(saveData.slots[1]).length.toLocaleString());
  // console.log('slot2', json(saveData.slots[2]).length.toLocaleString());
  // console.log('slot3', json(saveData.slots[3]).length.toLocaleString());
  // console.log(
  //   'profileSum',
  //   json(saveData.profile_summaries[3]).length.toLocaleString()
  // );
  // console.log(
  //   'w/o slots',
  //   json({ ...saveData, slots: undefined }).length.toLocaleString()
  // );

  return saveData;
}
