import { Schema } from 'effect';

export class ShareCodecError extends Schema.TaggedError<ShareCodecError>()('ShareCodecError', {
  cause: Schema.Defect(),
}) {}

const Num2 = Schema.Tuple([Schema.Number, Schema.Number]);
const Num3 = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]);
const Num4 = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number, Schema.Number]);

const ShareableStatsV1 = Schema.Struct({
  l: Schema.Number,
  v: Schema.Number,
  m: Schema.Number,
  e: Schema.Number,
  st: Schema.Number,
  d: Schema.Number,
  i: Schema.Number,
  f: Schema.Number,
  a: Schema.Number,
  r: Schema.Number,
  rm: Schema.Number,
});
type ShareableStatsV1 = typeof ShareableStatsV1.Type;

const ShareableProgressionV1 = Schema.Struct({
  v: Schema.Literal(1),
  n: Schema.String,
  s: ShareableStatsV1,
  g: Schema.Number,
  at: Schema.Number,
  wl: Schema.Number,
  ef: Schema.Array(Schema.Number),
  ur: Schema.Array(Schema.Number),
  inv: Schema.Array(Num2),
  ga: Schema.Array(Num2),
});
type ShareableProgressionV1 = typeof ShareableProgressionV1.Type;

const ShareableStatsV2 = Schema.Struct({
  ...ShareableStatsV1.fields,
  hp: Schema.Number,
  mhp: Schema.Number,
  bhp: Schema.Number,
  fp: Schema.Number,
  mfp: Schema.Number,
  bfp: Schema.Number,
  sta: Schema.Number,
  msta: Schema.Number,
  bsta: Schema.Number,
  b: Schema.Struct({
    p: Schema.Number,
    ro: Schema.Number,
    bl: Schema.Number,
    de: Schema.Number,
    fr: Schema.Number,
    sl: Schema.Number,
    ma: Schema.Number,
  }),
  vt: Schema.Number,
  gf: Schema.Number,
  tal: Schema.Number,
  ash: Schema.Number,
  fcf: Schema.Boolean,
  wcr: Schema.Boolean,
  bcr: Schema.Boolean,
  gr: Schema.Boolean,
  mcf: Schema.Number,
  mcef: Schema.Number,
});
type ShareableStatsV2 = typeof ShareableStatsV2.Type;

const ShareInventoryItems = Schema.Struct({
  c: Schema.Array(Num3),
  k: Schema.Array(Num3),
});

const ShareableProgressionV2 = Schema.Struct({
  v: Schema.Literal(2),
  n: Schema.String,
  s: ShareableStatsV2,
  g: Schema.Number,
  at: Schema.Number,
  wl: Schema.Number,
  ef: Schema.Array(Schema.Number),
  ur: Schema.Array(Schema.Number),
  mid: Num4,
  pc: Schema.Struct({
    c: Num3,
    m: Num4,
    a: Num4,
  }),
  ga: Schema.Array(Num3),
  ca: Schema.Struct({
    l: Num3,
    r: Num3,
    a: Num2,
    b: Num2,
    h: Schema.Number,
    c: Schema.Number,
    ar: Schema.Number,
    le: Schema.Number,
    t: Num4,
  }),
  aw: Schema.Struct({
    as: Schema.Number,
    l: Schema.Number,
    r: Schema.Number,
    la: Schema.Number,
    ra: Schema.Number,
    lb: Schema.Number,
    rb: Schema.Number,
  }),
  ei: ShareInventoryItems,
  si: ShareInventoryItems,
  eq: Schema.Struct({
    q: Schema.Array(Schema.Number),
    p: Schema.Array(Schema.Number),
  }),
  esp: Schema.Array(Schema.Number),
  eg: Schema.Array(Schema.Number),
  ges: Schema.Array(Schema.Number),
  eph: Num2,
  ap: Schema.Array(Schema.Number),
  se: Schema.Array(Num2),
  sp: Schema.Number,
  d: Schema.Number,
  lr: Schema.Number,
  spe: Schema.Number,
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
