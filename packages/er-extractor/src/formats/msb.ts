import { Data, Effect } from 'effect';

import { BinaryReader } from './binary-reader.ts';

/**
 * MSB (Map Studio Binary) — From's per-map layout file (`mapstudio/m*.msb`,
 * MSBE variant for Elden Ring). A full MSB describes every model, event, region,
 * route and part placed in a map; SoulsFormats' MSBE is ~8k lines across six
 * files because it round-trips every subtype's fields.
 *
 * We only need world coordinates + entity IDs for placed things, so this is a
 * SCOPED reader: it walks the six param lists (Models, Events, Regions, Routes,
 * Layers, Parts) using the common container mechanics, then decodes only the
 * shared header of Part and Region entries (name, position, entity id) and skips
 * every subtype-specific struct via the entry offsets. Layouts ported from
 * SoulsFormatsNEXT MSBE: `MSBE.cs` (header + Param.Read), `PartsParam.cs`
 * (Part base), `PointParam.cs` (Region base). ER MSBs are little-endian with
 * 64-bit offsets.
 */

export class MsbError extends Data.TaggedError('MsbError')<{
  readonly detail: string;
}> {}

/** A placed Part or Region with its world position and (raw) entity id. */
export interface MsbMarker {
  readonly kind: 'part' | 'region';
  readonly type: number; // subtype discriminator (PartType / RegionType)
  readonly name: string;
  readonly entityID: number; // raw u32; 0 or 0xFFFFFFFF mean "unset"
  readonly x: number;
  readonly y: number;
  readonly z: number;
  // Enemy/DummyEnemy parts only: the EquipParam-style NpcParam row id
  // (`NPCParamID`), the link to a character's stats + name. null otherwise.
  readonly npcParamId: number | null;
}

// PartType values (PartsParam.cs) whose type data starts with the EnemyBase
// struct, so NPCParamID sits at typeDataOffset + 0x0C.
const ENEMY_TYPES = new Set([2 /* Enemy */, 10 /* DummyEnemy */]);

export interface MsbMarkers {
  readonly parts: MsbMarker[];
  readonly regions: MsbMarker[];
}

// MSB header is 16 bytes; the first param list begins immediately after it.
const HEADER_SIZE = 0x10;

interface ParamList {
  readonly name: string;
  readonly entryOffsets: number[];
  readonly nextParamOffset: number;
}

/** Read one param-list container header (`MSBE.Param.Read`) at the cursor. */
const readParamList = (r: BinaryReader): ParamList => {
  r.i32(); // version
  const offsetCount = r.i32();
  const nameOffset = r.i64();
  const entryOffsets: number[] = [];
  for (let i = 0; i < offsetCount - 1; i++) entryOffsets.push(r.i64());
  const nextParamOffset = r.i64();
  const name = r.getUTF16(nameOffset);
  return { name, entryOffsets, nextParamOffset };
};

/** Decode the shared header of a Part entry (PartsParam.cs `Part` base). */
const readPart = (r: BinaryReader, start: number): MsbMarker => {
  const nameOffset = r.getI64(start + 0x00);
  const type = r.getU32(start + 0x0c);
  const x = r.getF32(start + 0x20);
  const y = r.getF32(start + 0x24);
  const z = r.getF32(start + 0x28);
  const entityDataOffset = r.getI64(start + 0x60);
  const entityID = r.getU32(start + entityDataOffset);
  const name = r.getUTF16(start + nameOffset);
  // Enemy type data (EnemyBase.ReadTypeData): int32 0, int32 0, ThinkParamID,
  // NPCParamID — so NPCParamID is at typeDataOffset + 0x0C.
  let npcParamId: number | null = null;
  if (ENEMY_TYPES.has(type)) {
    const typeDataOffset = r.getI64(start + 0x68);
    if (typeDataOffset > 0)
      npcParamId = r.getU32(start + typeDataOffset + 0x0c);
  }
  return { kind: 'part', type, name, entityID, x, y, z, npcParamId };
};

/** Decode the shared header of a Region entry (PointParam.cs `Region` base). */
const readRegion = (r: BinaryReader, start: number): MsbMarker => {
  const nameOffset = r.getI64(start + 0x00);
  const type = r.getU32(start + 0x08);
  const x = r.getF32(start + 0x14);
  const y = r.getF32(start + 0x18);
  const z = r.getF32(start + 0x1c);
  // baseDataOffset3 points at { ActivationPartIndex i32, EntityID u32, ... }.
  const baseDataOffset3 = r.getI64(start + 0x50);
  const entityID = r.getU32(start + baseDataOffset3 + 4);
  const name = r.getUTF16(start + nameOffset);
  return { kind: 'region', type, name, entityID, x, y, z, npcParamId: null };
};

/**
 * Parse an MSBE file into placed Parts + Regions with world coordinates.
 * `data` is the decompressed `.msb` (run `dcxDecompress` on `.msb.dcx` first).
 */
export const parseMsb = (
  data: Uint8Array,
): Effect.Effect<MsbMarkers, MsbError> =>
  Effect.gen(function* () {
    if (data.length < HEADER_SIZE) {
      return yield* new MsbError({
        detail: `MSB too short (${data.length} bytes)`,
      });
    }
    const r = new BinaryReader(data);
    r.little = true;
    const magic = r.ascii(4);
    if (magic !== 'MSB ') {
      return yield* new MsbError({ detail: `bad MSB magic "${magic}"` });
    }

    // Params are written in a fixed order: Models, Events, Regions, Routes,
    // Layers, Parts. We chain through them by nextParamOffset and pick out the
    // two we decode (matching on the param's own name string).
    r.pos = HEADER_SIZE;
    const parts: MsbMarker[] = [];
    const regions: MsbMarker[] = [];

    for (let i = 0; i < 6; i++) {
      const listStart = r.pos;
      const list = yield* Effect.try({
        try: () => readParamList(r),
        catch: (cause) =>
          new MsbError({
            detail: `param list @0x${listStart.toString(16)}: ${String(cause)}`,
          }),
      });

      if (list.name === 'PARTS_PARAM_ST') {
        for (const off of list.entryOffsets) {
          parts.push(
            yield* Effect.try({
              try: () => readPart(r, off),
              catch: (cause) =>
                new MsbError({
                  detail: `part @0x${off.toString(16)}: ${String(cause)}`,
                }),
            }),
          );
        }
      } else if (list.name === 'POINT_PARAM_ST') {
        for (const off of list.entryOffsets) {
          regions.push(
            yield* Effect.try({
              try: () => readRegion(r, off),
              catch: (cause) =>
                new MsbError({
                  detail: `region @0x${off.toString(16)}: ${String(cause)}`,
                }),
            }),
          );
        }
      }

      if (list.nextParamOffset === 0) break;
      r.pos = list.nextParamOffset;
    }

    return { parts, regions };
  });
