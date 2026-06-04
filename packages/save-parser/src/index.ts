/**
 * `@elden-ring-compass/save-parser-ts` — pure-TypeScript, read-only Elden Ring save
 * parser. Drop-in replacement for the Rust/WASM parser: `parseSave(buffer)` returns
 * the same lean DTO the website consumes. See `parse-save.ts` for the port notes.
 */
export { parseSave, SaveParseError } from './parse-save.ts';
export type * from './types.ts';
