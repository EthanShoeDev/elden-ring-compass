// Wire protocol for the save-parser Web Worker, shared by the worker (`er-save-parser.worker.ts`)
// and the client (`atoms/save.ts`). The client posts a `ParseRequest` (correlation id + buffer)
// and the worker replies with a `ParseResponse` (the lean DTO, or an error string).
//
// `ParseResponse` is an effect `Schema`: postMessage erases types across the worker boundary, so
// the client validates every reply with `Schema.decodeUnknownSync(ParseResponse)` before trusting
// it. The success payload is the parser package's `LeanSave` schema — the single source of truth
// for the DTO shape. This runs once per save load (a user action), not on the parse hot path.
import { LeanSave } from '@elden-ring-compass/save-parser-ts';
import { Schema } from 'effect';

/** Client → worker: a correlation id and the raw save bytes to parse. */
export type ParseRequest = { readonly id: number; readonly buffer: ArrayBuffer };

/** Worker → client: the parsed save (`ok: true`) or a human-readable error (`ok: false`). */
export const ParseResponse = Schema.Union([
  Schema.Struct({
    id: Schema.Number,
    ok: Schema.Literal(true),
    save: LeanSave,
  }),
  Schema.Struct({
    id: Schema.Number,
    ok: Schema.Literal(false),
    error: Schema.String,
  }),
]);
export type ParseResponse = typeof ParseResponse.Type;
