# Perf & memory testing (apps/web)

> Status: **infra built, 2 of 4 perf tests done, the trigger bug fixed & E2E-verified** (2026-06-04).
> Goal: catch performance/memory regressions before they ship — specifically the kind where a
> refactor makes parsing a save or filtering a data table lock up the browser. Prefer small,
> repeatable, subsection-scoped tests over flaky full-app E2E.
>
> **What kicked this off:** after the data-layer + WASM-parser refactors, parsing a save "lagged
> out the whole browser and nothing worked." We wanted automated perf/memory guards so this class
> of regression is caught early. Building those guards surfaced the actual cause (see _The bug_).

## Tooling decision — why Vitest browser mode (not Playwright CT, not full E2E)

The save parse already runs off the main thread (Comlink worker), so the freeze is downstream
main-thread work (rendering huge structures, filtering big tables). That split the goal into two:

- **Parse throughput / table-filter cost / memory** → mount a *subsection* in a **real browser** and
  measure. This is where regressions live and where we want repeatable, non-flaky guards.
- **Whole-app "does the worker path actually work"** → genuinely needs the real app driven end to
  end.

**Chosen: Vitest browser mode (Playwright provider, Chromium)** for the subsection tests, because it
gives a real engine (real V8, real WASM tiers, real DOM layout) while mounting a *component*, not the
whole app — no router/server/navigation, which is the flakiness surface the user wants to avoid. It
reuses the existing Vitest + `@effect/vitest` stack. Playwright **component testing** was rejected
(experimental, separate runner/config, Node↔browser serialization boundary). Full Playwright **E2E**
is reserved for the one thing Vitest browser mode genuinely can't do (the worker path — see below).

This matches the Vitest docs' own caveat: browser mode is *not* a drop-in E2E runner.

## How it's wired

Single combined config — **no separate `vitest.perf.config.ts`** (deliberate: `vite.config.ts` is
the one source). `defineConfig` is imported from `vitest/config` (not `vite`) so the `test` field —
incl. `projects`/`browser` — is typed natively without a `/// <reference>` shim, while staying a
valid Vite config for `vite dev`/`vite build`.

- `test.projects`:
  - **`unit`** — jsdom, the existing `*.{test,spec}.*` suite. `bun run test` / `test:run` (scoped
    to `--project unit` to stay fast).
  - **`perf`** — real Chromium via `@vitest/browser-playwright`, `*.perf.browser.{ts,tsx}` only,
    `fileParallelism: false` (parallel tabs contend for CPU and ruin timing). `bun run test:perf`.
- **App-server plugins excluded under test:** `tanstackStart`/`nitro`/`devtools` are only added when
  `process.env.VITEST` is unset. Vitest runs *root* plugin hooks even for standalone projects, and
  those plugins break browser mode (`react: module is not defined` during dep-scan + a process that
  won't exit). Trimming them at the root is what makes the browser run clean. Tests get
  `react + tailwind + wasm + erDataTiles` (the last serves `/map-tiles/...` so the map test can load
  real tiles).
- **`node:assert` → `assert` alias** (perf project resolve): `@effect/vitest`'s `utils.js` imports
  `node:assert`, which doesn't exist in the browser. This one alias is all it takes for `it.effect`
  to run in browser mode.
- **`erDataTiles` extracted** to `vite-plugins/er-data-tiles.ts` (was inline in `vite.config.ts`) so
  the trimmed perf plugin set can reuse just the tile middleware.
- **Memory via CDP:** Vitest exposes a real `cdp()` session (Playwright provider + Chromium, gated
  by `browser.api.allowWrite`+`allowExec`, both default-true on localhost). `src/test/perf/cdp-memory.ts`
  forces GC (`HeapProfiler.collectGarbage`) then reads `JSHeapUsedSize` (`Performance.getMetrics`,
  after `Performance.enable`). Forcing GC first is what makes memory numbers honest. **Measure JS
  heap, not total** — that's the figure that drives GC pressure / the freeze (and the thing an
  IndexedDB move would reduce).
- **Logging:** `it.effect` tests use `Effect.log`. (See `effect-logging-managedruntime` memory.)
- **Thresholds:** plain consts, set HIGH, ratchet down to your machine. No CI, local only — so
  absolute thresholds are fine and there's no machine-variance problem to design around.

## The bug this surfaced (fixed)

Building the parse test proved save parsing was **doubly broken** on the `tanstack-start` branch —
the WASM-parser rewrite was never runtime-verified:

1. The Comlink worker (`save.ts` → `new Worker(...) + Comlink.wrap`) **never called `expose()`** → every
   parse hangs forever (the wrapped caller's message is never answered).
2. The `--target web` WASM was **never `init()`-ed** → `__wbindgen_malloc` is undefined → `parse_save`
   throws.

**Fix:**
- New dedicated `src/lib/er-save-parser.worker.ts` — imports the wasm as `?url`, `init({ module_or_path })`,
  then `Comlink.expose({ parseEldenRingData })`. (Kept separate from `er-save-parser.ts` so the Node
  unit test can still import the pure parse fns; the worker file uses browser-/Vite-only constructs.)
- `save.ts` points the worker at `er-save-parser.worker.ts`.
- `@elden-ring-compass/save-parser` `package.json` gained an `exports` entry for
  `./elden_ring_save_parser_bg.wasm` so the `?url` import resolves.
- **Verified** by `e2e/save-parse.spec.ts` (Playwright): upload `ER0000.sl2` → worker → "Success!".

The direct (main-thread) parse path is also tested in `er-save-parser.perf.browser.ts` and passes,
proving the parser itself is fine once initialized.

## What exists

| File | What |
|---|---|
| `vite.config.ts` | combined config, `unit`+`perf` projects, VITEST plugin trimming |
| `vite-plugins/er-data-tiles.ts` | extracted tile-middleware plugin (shared by app + perf) |
| `src/test/perf/cdp-memory.ts` | `forceGcHeapUsedBytes()` + `mb()` via CDP |
| `src/test/perf/smoke.perf.browser.ts` | sanity: effect-vitest + cdp() work in browser mode |
| `src/lib/er-save-parser.perf.browser.ts` | parse perf — direct (passing) + worker (`it.effect.skip`, see below) |
| `src/components/data-table/data-table.perf.browser.tsx` | mounts real `DataTable` + full armaments catalog; mount + Name-filter time + heap |
| `e2e/save-parse.spec.ts`, `playwright.config.ts` | E2E for the real worker parse path |
| `src/lib/runtime/{client,server}.ts` | client/server `ManagedRuntime` (logging) |

Run: `bun run test` (unit) · `bun run test:perf` (Chromium perf) · `bun run test:e2e` (Playwright).

## What's left

- **Map perf + leak test** (`leaflet-map.perf.browser.tsx`) — **deferred** while `leaflet-map.tsx`
  tile-index edits are in flight (don't test a moving target). Plan: mount `LeafletMap` under
  `<RegistryProvider>` in a fixed-size div; measure mount/pan/zoom; **and a mount→unmount×N loop**
  with `forceGcHeapUsedBytes` asserting heap doesn't climb monotonically (Leaflet is a classic
  leak source — this is the highest-value map check). The trimmed perf config already serves tiles.
- **Memory A/B harness** (`memory.perf.browser.ts`) — write when starting the IndexedDB experiment:
  force-GC JS-heap before/after each storage strategy (in-memory vs IDB), optional `bench()`. NOTE:
  the committed data-layer direction is in-memory / NO IndexedDB — this harness is how you'd gather
  evidence to revisit that. Measure JS heap (what IDB reduces), not total bytes.
- **Worker parse perf test** — parked as `it.effect.skip` in `er-save-parser.perf.browser.ts`:
  `init()` stays pending inside a Vitest-browser module worker (it resolves fine on the main
  thread). This is the worker+`?url`-asset corner where Vitest browser mode is weakest. The app
  worker code is standard Vite and is validated by the Playwright E2E instead. Unskip if/when
  Vitest's worker story improves.

## Conventions for new perf tests

- File name `*.perf.browser.{ts,tsx}`, in the `perf` project.
- Mount app components under `<RegistryProvider>` (effect-atom needs it) — see the data-table test.
- Use `it.effect` + `Effect.log`; time with `performance.now()` inline (no measurement wrapper);
  memory with `forceGcHeapUsedBytes()` from `cdp-memory.ts`.
- Thresholds: HIGH consts to start, ratchet down. Feed real, full datasets (the catalog), not faker.
