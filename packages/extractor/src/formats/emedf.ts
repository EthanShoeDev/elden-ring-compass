import { erCommonEmedfUrl } from '@elden-ring-compass/vendored-data';
import { Data, Effect, FileSystem, Path, Schema } from 'effect';

import type { EmevdInstruction, EmevdParameter } from './emevd.ts';

/**
 * EMEDF — the EMEVD instruction dictionary. Soulstruct's `er-common.emedf.json`
 * (vendored) maps every instruction `(bank, id)` to a human name and a typed
 * argument layout, so we can turn an EMEVD instruction's raw packed bytes into
 * named, typed values (e.g. `Award Item Lot → { "Item Lot ID": 10000 }`).
 *
 * This is the **semantic layer** over `emevd.ts` (which only yields raw
 * `(bank, id, argData)`). It's the shared foundation for install-derived event
 * extraction that needs instruction meaning rather than a single known opcode —
 * map-treasure placements (#10b) and the quest compass both build on it.
 *
 * Arg packing (SoulsFormats EMEVD): values are laid out in order, **each aligned
 * to its own size** (a u32 starts on a 4-byte boundary, u16 on 2, …) relative to
 * the start of the arg block; the block is then padded to 4 bytes. We decode the
 * defined args in order, stopping if the data is shorter than the layout (callers
 * may omit trailing default args). Event-arg *substitution* (templated events) is
 * applied first via {@link applyParameters}.
 */

export class EmedfError extends Data.TaggedError('EmedfError')<{
  readonly detail: string;
}> {}

// soulstruct ArgType (base/events/emevd/emedf.py).
const ARG_SIZE: Record<number, number> = {
  0: 1, // u8
  1: 2, // u16
  2: 4, // u32
  3: 1, // s8
  4: 2, // s16
  5: 4, // s32
  6: 4, // f32
  8: 4, // fixstr (32-bit EMEVD string index)
};

export interface EmedfArg {
  readonly name: string;
  readonly type: number;
  readonly enumName: string | null;
}

export interface EmedfInstr {
  readonly bank: number;
  readonly id: number;
  readonly name: string;
  readonly args: readonly EmedfArg[];
}

export interface Emedf {
  /** `${bank},${id}` → instruction definition. */
  readonly byOpcode: ReadonlyMap<string, EmedfInstr>;
  /** lower-cased instruction name → definition (first match wins). */
  readonly byName: ReadonlyMap<string, EmedfInstr>;
}

export const opcodeKey = (bank: number, id: number): string => `${bank},${id}`;

// Schema for the vendored JSON (only the fields we read; excess keys — `default`,
// `min`, `format_string`, etc. — are ignored on decode). Drives runtime validation
// in `loadEmedf` so a malformed/renamed dictionary fails loudly, not silently.
const EmedfArgJson = Schema.Struct({
  name: Schema.String,
  type: Schema.Number,
  enum_name: Schema.NullOr(Schema.String),
});
const EmedfInstrJson = Schema.Struct({
  name: Schema.String,
  index: Schema.Number,
  args: Schema.Array(EmedfArgJson),
});
const EmedfClassJson = Schema.Struct({
  index: Schema.Number,
  instrs: Schema.Array(EmedfInstrJson),
});
const EmedfJson = Schema.Struct({
  main_classes: Schema.Array(EmedfClassJson),
});
/** The decoded EMEDF document shape (the fields we read), derived from the schema. */
export type EmedfJsonShape = typeof EmedfJson.Type;

const EMEDF_URL = erCommonEmedfUrl;

/** Index a parsed EMEDF document into opcode/name lookups. Pure (unit-testable). */
export const indexEmedf = (raw: EmedfJsonShape): Emedf => {
  const byOpcode = new Map<string, EmedfInstr>();
  const byName = new Map<string, EmedfInstr>();
  for (const cls of raw.main_classes) {
    for (const instr of cls.instrs) {
      const def: EmedfInstr = {
        bank: cls.index,
        id: instr.index,
        name: instr.name,
        args: instr.args.map((a) => ({
          name: a.name,
          type: a.type,
          enumName: a.enum_name,
        })),
      };
      byOpcode.set(opcodeKey(cls.index, instr.index), def);
      const lower = instr.name.toLowerCase();
      if (!byName.has(lower)) byName.set(lower, def);
    }
  }
  return { byOpcode, byName };
};

/**
 * Load + index the vendored EMEDF dictionary via the effect `FileSystem` (no
 * `Bun.file`). The vendored JSON sits next to this module; `Path.fromFileUrl`
 * resolves the `import.meta.url`-relative path so it works under any runtime that
 * provides the platform services (Bun in the pipeline, Node under vitest).
 */
export const loadEmedf: Effect.Effect<
  Emedf,
  EmedfError,
  FileSystem.FileSystem | Path.Path
> = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const filePath = yield* path.fromFileUrl(EMEDF_URL);
  const text = yield* fs.readFileString(filePath);
  const raw = yield* Schema.decodeEffect(Schema.fromJsonString(EmedfJson))(
    text,
  );
  return indexEmedf(raw);
}).pipe(
  Effect.mapError(
    (cause) => new EmedfError({ detail: `loading EMEDF: ${String(cause)}` }),
  ),
);

const readValue = (dv: DataView, off: number, type: number): number => {
  switch (type) {
    case 0:
      return dv.getUint8(off);
    case 1:
      return dv.getUint16(off, true);
    case 2:
      return dv.getUint32(off, true);
    case 3:
      return dv.getInt8(off);
    case 4:
      return dv.getInt16(off, true);
    case 5:
    case 8:
      return dv.getInt32(off, true);
    case 6:
      return dv.getFloat32(off, true);
    default:
      return dv.getInt32(off, true);
  }
};

/**
 * Decode an instruction's packed arg bytes into `{ argName: value }` using its
 * EMEDF layout (self-aligned). Args whose bytes run past `argData` are omitted
 * (the call relied on their defaults).
 */
export const decodeArgs = (
  def: EmedfInstr,
  argData: Uint8Array,
): Record<string, number> => {
  const dv = new DataView(
    argData.buffer,
    argData.byteOffset,
    argData.byteLength,
  );
  const out: Record<string, number> = {};
  let off = 0;
  for (const arg of def.args) {
    const size = ARG_SIZE[arg.type] ?? 4;
    off = Math.ceil(off / size) * size; // align to the arg's own width
    if (off + size > argData.length) break;
    out[arg.name] = readValue(dv, off, arg.type);
    off += size;
  }
  return out;
};

export interface DecodedInstruction {
  readonly bank: number;
  readonly id: number;
  readonly name: string;
  readonly args: Record<string, number>;
}

/** Look up an instruction in the EMEDF and decode its args; null if unknown opcode. */
export const decodeInstruction = (
  emedf: Emedf,
  ins: EmevdInstruction,
): DecodedInstruction | null => {
  const def = emedf.byOpcode.get(opcodeKey(ins.bank, ins.id));
  if (!def) return null;
  return {
    bank: ins.bank,
    id: ins.id,
    name: def.name,
    args: decodeArgs(def, ins.argData),
  };
};

/**
 * Apply an event's arg-substitution records to one instruction's bytes, yielding
 * the effective `argData` for a templated (common-func) instruction. `eventArgs`
 * is the parameter blob the `Initialize(Common)Event` call passed in (the bytes
 * after its slot + event-id fields). Mirrors the resolution in `boss-names.ts`,
 * generalized so any EMEDF-decoded instruction can be read from a template.
 */
export const applyParameters = (
  ins: EmevdInstruction,
  instructionIndex: number,
  eventArgs: Uint8Array,
  parameters: readonly EmevdParameter[],
): Uint8Array => {
  const buf = new Uint8Array(ins.argData);
  for (const p of parameters) {
    if (p.instructionIndex !== instructionIndex) continue;
    for (let k = 0; k < p.byteCount; k++) {
      const src = eventArgs[p.sourceStartByte + k];
      if (src !== undefined) buf[p.targetStartByte + k] = src;
    }
  }
  return buf;
};
