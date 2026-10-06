import { Schema } from 'effect';

export class ShareCodecError extends Schema.TaggedError<ShareCodecError>()('ShareCodecError', {
  cause: Schema.Defect(),
}) {}

// Every shared value is an integer read from the save except the player's position,
// facing and buff timers, which are f32s. JSON can't carry NaN, so those are Finite.
const Int2 = Schema.Tuple([Schema.Int, Schema.Int]);
const Int3 = Schema.Tuple([Schema.Int, Schema.Int, Schema.Int]);
const Int4 = Schema.Tuple([Schema.Int, Schema.Int, Schema.Int, Schema.Int]);
const Finite3 = Schema.Tuple([Schema.Finite, Schema.Finite, Schema.Finite]);
const Finite4 = Schema.Tuple([Schema.Finite, Schema.Finite, Schema.Finite, Schema.Finite]);

const ShareableStatsV1 = Schema.Struct({
  l: Schema.Int,
  v: Schema.Int,
  m: Schema.Int,
  e: Schema.Int,
  st: Schema.Int,
  d: Schema.Int,
  i: Schema.Int,
  f: Schema.Int,
  a: Schema.Int,
  r: Schema.Int,
  rm: Schema.Int,
});
type ShareableStatsV1 = typeof ShareableStatsV1.Type;

const ShareableProgressionV1 = Schema.Struct({
  v: Schema.Literal(1),
  n: Schema.String,
  s: ShareableStatsV1,
  g: Schema.Int,
  at: Schema.Int,
  wl: Schema.Int,
  ef: Schema.Array(Schema.Int),
  ur: Schema.Array(Schema.Int),
  inv: Schema.Array(Int2),
  ga: Schema.Array(Int2),
});
type ShareableProgressionV1 = typeof ShareableProgressionV1.Type;

const ShareableStatsV2 = Schema.Struct({
  ...ShareableStatsV1.fields,
  hp: Schema.Int,
  mhp: Schema.Int,
  bhp: Schema.Int,
  fp: Schema.Int,
  mfp: Schema.Int,
  bfp: Schema.Int,
  sta: Schema.Int,
  msta: Schema.Int,
  bsta: Schema.Int,
  b: Schema.Struct({
    p: Schema.Int,
    ro: Schema.Int,
    bl: Schema.Int,
    de: Schema.Int,
    fr: Schema.Int,
    sl: Schema.Int,
    ma: Schema.Int,
  }),
  vt: Schema.Int,
  gf: Schema.Int,
  tal: Schema.Int,
  ash: Schema.Int,
  fcf: Schema.Boolean,
  wcr: Schema.Boolean,
  bcr: Schema.Boolean,
  gr: Schema.Boolean,
  mcf: Schema.Int,
  mcef: Schema.Int,
});
type ShareableStatsV2 = typeof ShareableStatsV2.Type;

const ShareInventoryItems = Schema.Struct({
  c: Schema.Array(Int3),
  k: Schema.Array(Int3),
});

const ShareableProgressionV2 = Schema.Struct({
  v: Schema.Literal(2),
  n: Schema.String,
  s: ShareableStatsV2,
  g: Schema.Int,
  at: Schema.Int,
  wl: Schema.Int,
  ef: Schema.Array(Schema.Int),
  ur: Schema.Array(Schema.Int),
  mid: Int4,
  pc: Schema.Struct({
    c: Finite3,
    m: Int4,
    a: Finite4,
  }),
  ga: Schema.Array(Int3),
  ca: Schema.Struct({
    l: Int3,
    r: Int3,
    a: Int2,
    b: Int2,
    h: Schema.Int,
    c: Schema.Int,
    ar: Schema.Int,
    le: Schema.Int,
    t: Int4,
  }),
  aw: Schema.Struct({
    as: Schema.Int,
    l: Schema.Int,
    r: Schema.Int,
    la: Schema.Int,
    ra: Schema.Int,
    lb: Schema.Int,
    rb: Schema.Int,
  }),
  ei: ShareInventoryItems,
  si: ShareInventoryItems,
  eq: Schema.Struct({
    q: Schema.Array(Schema.Int),
    p: Schema.Array(Schema.Int),
  }),
  esp: Schema.Array(Schema.Int),
  eg: Schema.Array(Schema.Int),
  ges: Schema.Array(Schema.Int),
  eph: Int2,
  ap: Schema.Array(Schema.Int),
  se: Schema.Array(Schema.Tuple([Schema.Int, Schema.Finite])),
  sp: Schema.Int,
  d: Schema.Int,
  lr: Schema.Int,
  spe: Schema.Int,
  dlc: Schema.Struct({
    s: Schema.Boolean,
    p: Schema.Boolean,
    m: Schema.Boolean,
  }),
});
type ShareableProgressionV2 = typeof ShareableProgressionV2.Type;

export const ShareableProgressionSchema = Schema.Union([
  ShareableProgressionV1,
  ShareableProgressionV2,
]);
export type ShareableProgression = ShareableProgressionV1 | ShareableProgressionV2;

export const SHAREABLE_VERSION = 2 as const;
export const LEGACY_SHAREABLE_VERSION = 1 as const;
