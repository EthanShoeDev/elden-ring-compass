/**
 * `@elden-ring-compass/save-parser-ts` — pure-TypeScript, read-only Elden Ring save
 * parser. Drop-in replacement for the Rust/WASM parser: `parseSave(buffer)` returns an
 * Effect of the same lean DTO the website consumes (run it with `Effect.runSync`). See
 * `parse-save.ts` for the port notes.
 */
export { parseSave, SaveMagicMismatchError } from './parse-save.ts';
export type { SaveParseError } from './parse-save.ts';
export {
  BinaryReader,
  makeBinaryReader,
  SaveTruncatedError,
} from './binary-reader.ts';
export type { BinaryReaderApi } from './binary-reader.ts';
// `types.ts` exports each DTO as an effect `Schema` value paired with its derived type under
// the same name — re-export both (values + types) so consumers can validate as well as type.
export * from './types.ts';
