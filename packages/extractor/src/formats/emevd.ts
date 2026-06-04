import { Data, Effect } from 'effect';

import { BinaryReader } from './binary-reader.ts';

/**
 * EMEVD — From's compiled event scripts (`event/m*.emevd`, `common*.emevd`).
 * Each file is a list of Events; each Event is a list of Instructions; each
 * Instruction is (bank, id, packed arg bytes). The actual game logic — "when
 * boss X dies, set flag Y" — lives here, expressed as instructions whose
 * semantics are defined by EMEDF. We don't need EMEDF for boss-flag linking:
 * boss handling is set up by `Initialize(Common)Event` calls in the init event,
 * whose literal args carry both the boss entity id and its defeat flag together.
 *
 * Ported from SoulsFormatsNEXT `Formats/EMEVD/{EMEVD,Event,Instruction}.cs`.
 * Elden Ring uses the Sekiro layout: little-endian, 64-bit offsets (varint = 8
 * bytes), header version 0xCD. We read events/instructions, each instruction's
 * raw arg bytes, and the per-event Parameter (arg-substitution) records; layers
 * and the string blob are skipped (not needed).
 */

export class EmevdError extends Data.TaggedError('EmevdError')<{
  readonly detail: string;
}> {}

export interface EmevdInstruction {
  readonly bank: number;
  readonly id: number;
  readonly argData: Uint8Array; // raw packed args, 4-byte aligned
}

/**
 * Event-arg substitution: copy `byteCount` bytes from the event's input args
 * (the values passed by the Initialize* call, starting at `sourceStartByte`)
 * into `instructions[instructionIndex].argData` at `targetStartByte`. This is
 * how a reusable template event (e.g. a boss handler in common_func) gets its
 * per-boss entity/name without hardcoding them in the instruction.
 */
export interface EmevdParameter {
  readonly instructionIndex: number;
  readonly targetStartByte: number;
  readonly sourceStartByte: number;
  readonly byteCount: number;
}

export interface EmevdEvent {
  readonly id: number;
  readonly instructions: EmevdInstruction[];
  readonly parameters: EmevdParameter[];
}

export interface Emevd {
  readonly events: EmevdEvent[];
}

export const parseEmevd = (
  data: Uint8Array,
): Effect.Effect<Emevd, EmevdError> =>
  Effect.try({
    try: () => readEmevd(data),
    catch: (cause) => new EmevdError({ detail: String(cause) }),
  });

function readEmevd(data: Uint8Array): Emevd {
  const r = new BinaryReader(data);
  r.little = true;

  const magic = r.ascii(4);
  if (magic !== 'EVD\0') throw new Error(`bad EMEVD magic "${magic}"`);
  const bigEndian = r.u8() !== 0;
  const is64Bit = r.i8() === -1;
  r.u8(); // unk06
  r.i8(); // unk07
  if (bigEndian || !is64Bit)
    throw new Error('expected little-endian 64-bit EMEVD (Elden Ring)');
  r.little = true;
  r.varintLong = true;

  const version = r.i32();
  if (version !== 0xcc && version !== 0xcd)
    throw new Error(`unexpected EMEVD version 0x${version.toString(16)}`);
  r.i32(); // file size

  const eventCount = r.varint();
  const eventsOffset = r.varint();
  r.varint(); // instruction count
  const instructionsOffset = r.varint();
  r.varint(); // unknown struct count (always 0)
  r.varint(); // unknown struct offset
  r.varint(); // layer count
  r.varint(); // layers offset
  r.varint(); // parameter count
  const emevdParametersOffset = r.varint(); // parameters region offset
  r.varint(); // linked file count
  r.varint(); // linked files offset
  r.varint(); // argument data length
  const argumentsOffset = r.varint();
  r.varint(); // strings length
  r.varint(); // strings offset

  const events: EmevdEvent[] = [];
  r.pos = eventsOffset;
  for (let i = 0; i < eventCount; i++) {
    const id = r.varint();
    const instructionCount = r.varint();
    const instrOffset = r.varint();
    const parameterCount = r.varint();
    const parametersOffset = r.varint();
    r.u32(); // rest behavior
    r.i32(); // padding

    const instructions: EmevdInstruction[] = [];
    if (instructionCount > 0) {
      r.stepIn(instructionsOffset + instrOffset);
      for (let j = 0; j < instructionCount; j++) {
        const bank = r.i32();
        const insId = r.i32();
        const argsLength = r.varint();
        const argsOffset = r.varint();
        r.i64(); // layer offset (DS3+/Sekiro: int64), skipped
        const argData =
          argsLength > 0
            ? r.getBytes(argumentsOffset + argsOffset, argsLength)
            : new Uint8Array(0);
        instructions.push({ bank, id: insId, argData });
      }
      r.stepOut();
    }

    const parameters: EmevdParameter[] = [];
    if (parameterCount > 0) {
      r.stepIn(emevdParametersOffset + parametersOffset);
      for (let j = 0; j < parameterCount; j++) {
        const instructionIndex = r.varint();
        const targetStartByte = r.varint();
        const sourceStartByte = r.varint();
        const byteCount = r.i32();
        r.i32(); // UnkID
        parameters.push({
          instructionIndex,
          targetStartByte,
          sourceStartByte,
          byteCount,
        });
      }
      r.stepOut();
    }
    events.push({ id, instructions, parameters });
  }

  return { events };
}

/**
 * Unpack an instruction's arg bytes as a sequence of int32s (4-byte aligned).
 * Event/flag ids are always 32-bit, so this surfaces them even without the
 * per-instruction EMEDF arg layout (floats/sub-int args misparse, but we only
 * scan for exact int matches to known flag/entity ids).
 */
export const argInts = (argData: Uint8Array): number[] => {
  const out: number[] = [];
  const dv = new DataView(
    argData.buffer,
    argData.byteOffset,
    argData.byteLength,
  );
  for (let o = 0; o + 4 <= argData.length; o += 4)
    out.push(dv.getInt32(o, true));
  return out;
};
