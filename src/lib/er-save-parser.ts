// import { ELDEN_RING_COLLECTIBLES, ELDEN_RING_DATA } from './er-static-data';

import { ELDEN_RING_COLLECTIBLES } from './er-static-data';

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
  if (a.length > 50) throw new Error('Buffer too long');
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
  const startPatternMarkIdx = findPatternIdx(slot, patternMarker);
  if (startPatternMarkIdx === undefined) {
    throw new Error('Could not find inventory start pattern');
  }
  const inventoryStart = startPatternMarkIdx + patternMarker.byteLength + 8;
  const endPatternMarkIdx = findPatternIdx(
    slot.subarray(inventoryStart, slot.byteLength),
    new Uint8Array(50).fill(0)
  );
  if (endPatternMarkIdx === undefined) {
    throw new Error('Could not find inventory end');
  }
  const inventoryEnd = endPatternMarkIdx + inventoryStart + 6;
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

export function parseEldenRingData(rawSaveData: Readonly<ArrayBuffer>) {
  const header = new Int8Array(rawSaveData.slice(0, 4));

  if (!bufferEqual(header, new Int8Array([66, 78, 68, 52]))) {
    throw new Error('Invalid save file header');
  }

  const decoder = new TextDecoder('utf-8');

  const slotNamesAndIdx: (readonly [string, number])[] = offsetSlotNames
    .map(
      ([start, end], idx) =>
        [
          decoder
            .decode(
              new Int8Array(
                Array.from(new Uint16Array(rawSaveData.slice(start, end)))
              )
            )
            .replaceAll('\x00', ''),
          idx,
        ] as const
    )
    .filter(([name]) => name);

  const saveDataUint8Array = new Uint8Array(rawSaveData);
  const slotListData = offsetSlotPointers.map(([start, end]) =>
    saveDataUint8Array.subarray(start, end)
  );

  return {
    slots: Object.fromEntries(
      slotNamesAndIdx.map(([slotName, slotIdx]) => {
        const slotData = slotListData[slotIdx];
        const inventoryBuffer = getInventoryBuffer(slotData);
        const idList = split(inventoryBuffer, 16).map((rawId) =>
          reversedId(rawId)
        );

        const collectibles = ELDEN_RING_COLLECTIBLES.map((c) => ({
          ...c,
          count: slotData.find((_, i) => {
            if (i < 4) return false;
            const id = slotData[i - 4];
            if (id !== c.id[0]) return false;
            const id2 = slotData[i - 3];
            if (id2 !== c.id[1]) return false;
            if (slotData[i - 2] !== 0) return false;
            if (slotData[i - 1] !== 176) return false;
            return true;
          }),
        }));

        // ELDEN_RING_COLLECTIBLES === quantifiableItems
        // ELDEN_RING_DATA === itemsData

        // function findItemQuantities(slot) {
        //   const result = new Array(quantifiableItems.length).fill(0);
        //   for (let i = 0; i < slot.byteLength - 4; i++) {
        //     for (let j = 0; j < quantifiableItems.length; j++) {
        //       const item = quantifiableItems[j];
        //       if (
        //         slot[i] === item.id[0] &&
        //         slot[i + 1] === item.id[1] &&
        //         slot[i + 2] === 0 &&
        //         slot[i + 3] === 176
        //       ) {
        //         result[j] = slot[i + 4];
        //       }
        //     }
        //   }
        //   return result;
        // }

        //Fetch collectibles quantities
        // const itemsQuantities = findItemQuantities(slots[selected_slot]);
        // lastQuantities = itemsQuantities;
        // let globalCounter = 0;
        // let globalTotal = 0;
        // const itemsFound = itemsQuantities.reduce((prev, cur) => prev + cur, 0);
        // const totalItems = quantifiableItems.reduce(
        //   (prev, cur) => prev + cur.places.length,
        //   0
        // );
        // globalCounter += itemsFound;
        // globalTotal += totalItems;

        return [slotName, { idList, collectibles }];
      })
    ),
  };
}
