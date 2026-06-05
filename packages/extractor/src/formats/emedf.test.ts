import { NodeServices } from '@effect/platform-node';
import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { expect } from 'vitest';

import {
  applyParameters,
  decodeArgs,
  decodeInstruction,
  type EmedfInstr,
  type EmedfJsonShape,
  indexEmedf,
  loadEmedf,
  opcodeKey,
} from './emedf.ts';

// An instruction mixing arg widths, to exercise self-alignment:
//   a u8  @0 → next free 1
//   b u32 @4 (aligned up from 1)
//   c u16 @8
//   d f32 @12 (aligned up from 10)
const mixed: EmedfInstr = {
  bank: 0,
  id: 0,
  name: 'Mixed',
  args: [
    { name: 'a', type: 0, enumName: null }, // u8
    { name: 'b', type: 2, enumName: null }, // u32
    { name: 'c', type: 1, enumName: null }, // u16
    { name: 'd', type: 6, enumName: null }, // f32
  ],
};

const mixedBytes = (): Uint8Array => {
  const buf = new Uint8Array(16);
  const dv = new DataView(buf.buffer);
  dv.setUint8(0, 7);
  dv.setUint32(4, 100_000, true);
  dv.setUint16(8, 513, true);
  dv.setFloat32(12, 1.5, true);
  return buf;
};

it.effect('decodeArgs: respects per-arg self-alignment', () =>
  Effect.sync(() => {
    expect(decodeArgs(mixed, mixedBytes())).toEqual({
      a: 7,
      b: 100_000,
      c: 513,
      d: 1.5,
    });
  }),
);

it.effect(
  'decodeArgs: omits args whose bytes run past the data (defaults)',
  () =>
    Effect.sync(() => {
      // Only 4 bytes: `a` fits at 0; `b` would need offset 4..8 → omitted (and the rest).
      expect(decodeArgs(mixed, mixedBytes().subarray(0, 4))).toEqual({ a: 7 });
    }),
);

it.effect('decodeArgs: decodes signed/typed values', () =>
  Effect.sync(() => {
    const instr: EmedfInstr = {
      bank: 0,
      id: 0,
      name: 'Signed',
      args: [{ name: 's', type: 5, enumName: null }], // s32
    };
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setInt32(0, -42, true);
    expect(decodeArgs(instr, buf)).toEqual({ s: -42 });
  }),
);

it.effect(
  'applyParameters: copies event-arg bytes into the targeted instruction only',
  () =>
    Effect.sync(() => {
      const ins = { bank: 0, id: 0, argData: new Uint8Array(8) };
      const eventArgs = Uint8Array.from([0, 0, 0xaa, 0xbb, 0xcc, 0xdd]);
      const params = [
        {
          instructionIndex: 2,
          targetStartByte: 4,
          sourceStartByte: 2,
          byteCount: 2,
        },
        // wrong instruction index → must be ignored
        {
          instructionIndex: 5,
          targetStartByte: 0,
          sourceStartByte: 0,
          byteCount: 2,
        },
      ];
      const out = applyParameters(ins, 2, eventArgs, params);
      expect([...out]).toEqual([0, 0, 0, 0, 0xaa, 0xbb, 0, 0]);
    }),
);

it.effect(
  'indexEmedf + decodeInstruction: opcode/name lookup and arg decode',
  () =>
    Effect.sync(() => {
      const doc: EmedfJsonShape = {
        main_classes: [
          {
            index: 2003,
            instrs: [
              {
                name: 'Award Item Lot',
                index: 4,
                args: [{ name: 'Item Lot ID', type: 5, enum_name: null }],
              },
            ],
          },
        ],
      };
      const emedf = indexEmedf(doc);
      expect(emedf.byOpcode.get(opcodeKey(2003, 4))?.name).toBe(
        'Award Item Lot',
      );
      expect(emedf.byName.get('award item lot')?.id).toBe(4);

      const argData = new Uint8Array(4);
      new DataView(argData.buffer).setInt32(0, 100_000, true);
      const dec = decodeInstruction(emedf, { bank: 2003, id: 4, argData });
      expect(dec?.name).toBe('Award Item Lot');
      expect(dec?.args['Item Lot ID']).toBe(100_000);

      // unknown opcode → null
      expect(
        decodeInstruction(emedf, {
          bank: 9,
          id: 9,
          argData: new Uint8Array(0),
        }),
      ).toBeNull();
    }),
);

// Integration: load the real vendored dictionary through the effect FileSystem.
it.layer(NodeServices.layer)('loadEmedf (vendored EMEDF)', (it) => {
  it.effect('loads the dictionary and resolves a known instruction', () =>
    Effect.gen(function* () {
      const emedf = yield* loadEmedf;
      expect(emedf.byOpcode.size).toBeGreaterThan(300);
      const award = emedf.byName.get('award item lot');
      if (award === undefined) throw new Error('byName missing "award item lot"');
      expect(opcodeKey(award.bank, award.id)).toBe('2003,4');
    }),
  );
});
