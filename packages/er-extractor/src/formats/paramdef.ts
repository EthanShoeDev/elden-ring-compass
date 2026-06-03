import { Data, Effect } from 'effect';

/**
 * PARAMDEF — the field layout for a PARAM, used to decode row bytes into named
 * values. We read the community Paramdex XML defs (vendored under
 * ../vendor/paramdex), pulling each field's `Def` attribute (e.g. "f32 weight",
 * "u8 isFlag:1", "dummy8 pad[3]"). Decoding rules are ported from SoulsFormats
 * `PARAM.Row.ReadCells` / `ParamUtil`.
 */

export class ParamdefError extends Data.TaggedError('ParamdefError')<{
  readonly detail: string;
}> {}

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
    const paramType = xml.match(/<ParamType>([^<]+)<\/ParamType>/)?.[1]?.trim();
    if (!paramType) {
      return yield* new ParamdefError({ detail: 'no <ParamType> in def XML' });
    }
    const dataVersion = Number(
      xml.match(/<DataVersion>(\d+)<\/DataVersion>/)?.[1] ?? -1,
    );
    const fields: ParamdefField[] = [];
    // Each field is "<Field Def=\"...\" ...>"; the Def attribute carries the layout.
    for (const m of xml.matchAll(/<Field\s+Def="([^"]+)"/g)) {
      const def = m[1]!.trim();
      const parsed = DEF_RE.exec(def);
      if (!parsed)
        return yield* new ParamdefError({ detail: `unparseable Def "${def}"` });
      const [, type, name, arr, bits] = parsed;
      if (!DEF_TYPES.has(type!)) {
        return yield* new ParamdefError({
          detail: `unknown field type "${type}" in "${def}"`,
        });
      }
      fields.push({
        type: type as DefType,
        name: name!,
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
): Effect.Effect<Paramdef, ParamdefError> =>
  Effect.gen(function* () {
    const defName = DEF_FILENAME_ALIASES[paramType] ?? paramType;
    const url = new URL(
      `../vendor/paramdex/ER/Defs/${defName}.xml`,
      import.meta.url,
    );
    const xml = yield* Effect.tryPromise({
      try: () => Bun.file(url).text(),
      catch: (cause) =>
        new ParamdefError({
          detail: `reading def ${paramType}: ${String(cause)}`,
        }),
    });
    return yield* parseParamdefXml(xml);
  });
