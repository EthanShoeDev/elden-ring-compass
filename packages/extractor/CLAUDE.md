# `@elden-ring-compass/extractor` — conventions

This package is the **business logic for scraping data out of an installed copy of
Elden Ring**. It reads the game install (+ the verbatim constants in
`@elden-ring-compass/vendored-data`), joins them, and emits the clean, deterministic
datasets the website consumes into `@elden-ring-compass/data`. Read
`docs/projects/complete/reorganize-repo.md` for the package boundaries.

## The rules (these override convenience)

1. **No throwaway scripts for extraction work.** If you need to inspect or derive
   something from the install, do it **inside a stage** (or extend one) under
   `src/stages/`. Stages are the only place extraction logic lives. A `bun
   scripts/foo.ts` that pokes at the install is a smell — it rots and duplicates a
   stage. (We just deleted `scripts/req-bin.ts` for this reason.)

2. **Legitimate maintenance commands are named, not ad-hoc.** A vendor refresh or a
   one-shot key/dictionary regeneration gets a real `package.json` script **and** a
   PROVENANCE row in `@elden-ring-compass/vendored-data` (like `update-paramdex`).
   Loose files in `spike/` are not acceptable as the durable form.

3. **No big magic constants in stage logic.** Anything we ripped verbatim from another
   tool/wiki and can't derive from the install (keys, the BST table, paramdefs, EMEDF,
   the path dictionary) lives in `@elden-ring-compass/vendored-data` with a PROVENANCE
   entry — never inlined here. The extractor *depends on* vendored-data and joins it.

4. **Parsers are ours; content is theirs.** The DCX/BND4/FMG/PARAM/MSB/EMEVD parsers in
   `src/formats/` are our code; the bytes they read come from the install and refresh
   automatically on `bun run extract` against a patched game. Don't hardcode
   install-derived content (names/stats/markers) — extract it.

5. **`vendored-data` is build-time only; bake runtime needs into `data`.** Nothing the
   runtime (web / save parser) needs should be imported from `vendored-data` at
   runtime. If the site needs it (e.g. event-flag addressing → `eventFlagOffset`), the
   extractor emits it into `@elden-ring-compass/data`, which is the **sole** runtime
   data source.

6. **IO uses effect `FileSystem` / `Path`, not `node:fs`/`node:path`.** JSON is decoded
   through a real `Schema`, not `Unknown`. This is now uniform — the dvdbnd unpacker
   (`archive/dvdbnd.ts`) and the images stage are Effect-native too (the old "hot loop
   must stay off the Effect runtime" claim was wrong: Effect's per-`yield*` overhead is
   nanoseconds, negligible against real syscalls). The **only** remaining `Bun.file`
   exception is the *ranged* archive read — `Bun.file(bdt).slice(off, len).arrayBuffer()`
   for the multi-GB BHD/BDT slabs — because effect `FileSystem` has no ranged-read API;
   it stays wrapped in `Effect.promise`. (`Bun.write` / `Bun.file().text()` likewise stay,
   wrapped in `Effect.promise` — not lint-flagged.) `Bun.Glob` is fine.

7. **Native code is in-package.** The BCn→PNG codec is a Rust cdylib under
   `native/image-codec/`, built with `bun run build:image-codec` and loaded via
   `bun:ffi` (`src/external/image-codec.ts`). It is not a top-level workspace package.

## Logging

Use Effect's logger (`Effect.log*`), not `console`. In non-Effect contexts go through
the package's `ManagedRuntime`, not `Effect.runSync`.

## Known follow-up (not yet done)

Stages still thread their output to the next in memory (`runPipeline`), so you can't
re-run a single stage — which is *why* one-off scripts get written. The durable fix
(tracked in `docs/projects/complete/reorganize-repo.md` §"Make stages individually runnable"):
per-stage on-disk artifacts under `outDir/.cache/<stage>.json` + `--only`/`--from`/
`--to` CLI selection on `extract`, then fold `scripts/map-calibrate.ts` into a real
calibration stage. Until that lands, resist the urge to write a scratch script — extend
the stage instead.
