import { paramdexDefsUrl } from '@elden-ring-compass/vendored-data';
import { Effect, FileSystem, Path, Schema, String as Str } from 'effect';

/**
 * PARAMDEF — the field layout for a PARAM, used to decode row bytes into named
 * values. We read the community Paramdex XML defs (vendored under
 * ../vendor/paramdex), pulling each field's `Def` attribute (e.g. "f32 weight",
 * "u8 isFlag:1", "dummy8 pad[3]"). Decoding rules are ported from SoulsFormats
 * `PARAM.Row.ReadCells` / `ParamUtil`.
 */

export class ParamdefError extends Schema.TaggedError<
  ParamdefError,
  { readonly brand: unique symbol }
>()('ParamdefError', { detail: Schema.String }) {}

export type DefType =
  | 's8'
  | 'u8'
  | 's16'
  | 'u16'
  | 's32'
  | 'u32'
  | 'b32'
  | 'f32'
  | 'angle32'
  | 'f64'
  | 'fixstr'
  | 'fixstrW'
  | 'dummy8';

export interface ParamdefField {
  readonly type: DefType;
  readonly name: string;
  readonly arrayLength: number; // for fixstr/fixstrW/dummy8/u8 arrays (default 1)
  readonly bitSize: number; // -1 when not a bitfield
}

export interface Paramdef {
  readonly paramType: string;
  readonly dataVersion: number; // <DataVersion>; compared against the PARAM's to catch drift
  readonly fields: ParamdefField[];
}

const DEF_TYPES = new Set<string>([
  's8',
  'u8',
  's16',
  'u16',
  's32',
  'u32',
  'b32',
  'f32',
  'angle32',
  'f64',
  'fixstr',
  'fixstrW',
  'dummy8',
]);

// "f32 weight" | "dummy8 pad[3]" | "u8 isDeposit:1" | "s32 id = -1"
const DEF_RE = /^([A-Za-z0-9]+)\s+([A-Za-z_]\w*)(?:\[(\w+)\])?(?::(\d+))?/;

/** Parse a Paramdex def XML string into an ordered field layout. */
export const parseParamdefXml = (
  xml: string,
): Effect.Effect<Paramdef, ParamdefError> =>
  Effect.gen(function* () {
    const paramType = Str.trim(
      /<ParamType>([^<]+)<\/ParamType>/.exec(xml)?.[1] ?? '',
    );
    if (paramType === '') {
      return yield* ParamdefError.make({ detail: 'no <ParamType> in def XML' });
    }
    const dataVersion = Number(
      /<DataVersion>(\d+)<\/DataVersion>/.exec(xml)?.[1] ?? -1,
    );
    const fields: ParamdefField[] = [];
    // Each field is "<Field Def=\"...\" ...>"; the Def attribute carries the layout.
    for (const m of Str.matchAll(/<Field\s+Def="([^"]+)"/g)(xml)) {
      const group = m[1];
      if (group === undefined) continue;
      const def = Str.trim(group);
      const parsed = DEF_RE.exec(def);
      if (!parsed)
        return yield* ParamdefError.make({
          detail: `unparseable Def "${def}"`,
        });
      const [, type, name, arr, bits] = parsed;
      if (type === undefined || name === undefined) {
        return yield* ParamdefError.make({
          detail: `unparseable Def "${def}"`,
        });
      }
      if (!DEF_TYPES.has(type)) {
        return yield* ParamdefError.make({
          detail: `unknown field type "${type}" in "${def}"`,
        });
      }
      fields.push({
        type: type as DefType,
        name,
        arrayLength: arr === undefined ? 1 : Number(arr),
        bitSize: bits === undefined ? -1 : Number(bits),
      });
    }
    return { paramType, dataVersion, fields };
  });

// A few regulation param names don't match their Paramdex def filename.
const DEF_FILENAME_ALIASES: Record<string, string> = {
  SpEffectParam: 'SpEffect',
  Magic: 'MagicParam',
};

/** Load + parse a vendored Paramdex def by ParamType (e.g. "EquipParamWeapon"). */
export const loadParamdef = (
  paramType: string,
): Effect.Effect<Paramdef, ParamdefError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const defName = DEF_FILENAME_ALIASES[paramType] ?? paramType;
    const url = new URL(`${defName}.xml`, paramdexDefsUrl);
    const xml = yield* path.fromFileUrl(url).pipe(
      Effect.flatMap((filePath) => fs.readFileString(filePath)),
      Effect.mapError((cause) =>
        ParamdefError.make({
          detail: `reading def ${paramType}: ${String(cause)}`,
        }),
      ),
    );
    return yield* parseParamdefXml(xml);
  });
