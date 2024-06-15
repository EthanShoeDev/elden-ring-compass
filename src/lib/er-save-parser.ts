type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

function bufferEqual(a: TypedArray, b: TypedArray) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

const offsetSlotNames = [
  [0x1901d0e, 0x1901d0e + 32],
  [0x1901f5a, 0x1901f5a + 32],
  [0x19021a6, 0x19021a6 + 32],
  [0x19023f2, 0x19023f2 + 32],
  [0x190263e, 0x190263e + 32],
  [0x190288a, 0x190288a + 32],
  [0x1902ad6, 0x1902ad6 + 32],
  [0x1902d22, 0x1902d22 + 32],
  [0x1902f6e, 0x1902f6e + 32],
  [0x19031ba, 0x19031ba + 32],
];

const offsetSlotPointers = [
  [0x00000310, 0x0028030f + 1],
  [0x00280320, 0x050031f + 1],
  [0x500330, 0x78032f + 1],
  [0x780340, 0xa0033f + 1],
  [0xa00350, 0xc8034f + 1],
  [0xc80360, 0xf0035f + 1],
  [0xf00370, 0x118036f + 1],
  [0x1180380, 0x140037f + 1],
  [0x1400390, 0x168038f + 1],
  [0x16803a0, 0x190039f + 1],
];

const patternMarker = new Uint8Array([176, 173, 1, 0, 1, 255, 255, 255]);

function findPatternIdx(data: TypedArray, pattern: TypedArray) {
  for (let i = 0; i < data.byteLength; i++) {
    if (
      data[i] === pattern[0] &&
      bufferEqual(data.subarray(i, i + pattern.byteLength), pattern)
    )
      return i;
  }
}

function getInventoryBuffer(slot: TypedArray) {
  const patternIdx = findPatternIdx(slot, patternMarker);
  if (patternIdx === undefined) {
    throw new Error('Could not find inventory start pattern');
  }
  const inventoryStart = patternIdx + patternMarker.byteLength + 8;
  const inventoryEnd = findPatternIdx(
    slot.subarray(inventoryStart),
    new Uint8Array(50).fill(0)
  );
  if (inventoryEnd === undefined) {
    throw new Error('Could not find inventory end');
  }
  return slot.subarray(inventoryStart, inventoryEnd);
}

function split(list: TypedArray, chunkSize: number) {
  const splitted = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    splitted.push(chunk);
  }
  return splitted;
}

function decimalToHex(d: number, padding = 2) {
  let hex = Number(d).toString(16);
  while (hex.length < padding) {
    hex = '0' + hex;
  }
  return hex;
}
function reversedId(id: TypedArray) {
  return [...id.slice(0, 4)]
    .reverse()
    .map((d) => decimalToHex(d))
    .join('');
}

export function parseEldenRingFile(file: File) {
  return new Promise<ReturnType<typeof parseEldenRingData>>(
    (resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result;
        if (buffer instanceof ArrayBuffer) {
          try {
            const slotNames = parseEldenRingData(buffer);
            resolve(slotNames);
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  );
}
export async function parseEldenRingUrl(url: string) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  try {
    return parseEldenRingData(buffer);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export function parseEldenRingData(saveData: ArrayBuffer) {
  const header = new Int8Array(saveData.slice(0, 4));

  if (!bufferEqual(header, new Int8Array([66, 78, 68, 52]))) {
    throw new Error('Invalid save file header');
  }

  const decoder = new TextDecoder('utf-8');

  const slotNames = offsetSlotNames.map(([start, end]) =>
    decoder
      .decode(
        new Int8Array(Array.from(new Uint16Array(saveData.slice(start, end))))
      )
      .replaceAll('\x00', '')
  );

  const saveDataUint8Array = new Uint8Array(saveData);
  const slotListData = offsetSlotPointers.map(([start, end]) =>
    saveDataUint8Array.subarray(start, end)
  );

  slotListData.forEach((slotData) => {
    const inventoryBuffer = getInventoryBuffer(slotData);
    const idList = split(inventoryBuffer, 16).map((rawId) => reversedId(rawId));
  });

  return { slotNames };
}
