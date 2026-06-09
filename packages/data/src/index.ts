// Public entry point for @elden-ring-compass/data.
//
// All data under ./generated is emitted by `@elden-ring-compass/extractor`
// (run `bun run extract` against an Elden Ring install). Do not hand-edit the
// generated files — regenerate them instead. This package is the single source
// of truth the web app consumes.
export * from './generated/index.ts';
