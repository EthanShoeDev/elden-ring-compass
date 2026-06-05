# Perf & memory testing (apps/web)

> **CLOSED — moved to `complete/` 2026-06-05.** The one remaining open item (the idle-heap
> re-render regression guard, _What's left_ §1) is now **obsolete**, not deferred. Two later
> refactors removed the class of bug it would have guarded:
>
> - **Per-slice state selectors on effect-atom** — the table-state atom is now read through
>   per-table `Atom.family` slices that dedupe on `Object.is`, so the identity-churn loop that
>   caused bug #2 (fresh `[]`/`{}` every render → `autoResetPageIndex` → setState loop) is
>   structurally gone, not just patched. A re-render-loop guard would be testing a shape the code
>   no longer has.
> - **The pure-TS save-parser port** ([[ts-save-parser-port]]) deleted the WASM/Comlink-worker
>   stack entirely, which was the source of bug #1 (the `expose` race) and the original "parsing
>   locked up the browser" report. The worker-path E2E and the worker `init()` race it guarded no
>   longer have a subject.
>
> The infra (Vitest browser-mode `perf` project, CDP heap, Playwright E2E) **stays** and is still
> green — it's the harness any future perf test reuses (see [[perf-testing-setup]]). What's
> retired is the single unwritten guard; the bugs it would have caught can't recur in the current
> architecture. The deprioritized map-leak / memory-A/B / worker-parse items remain
> nice-to-haves, unblocked, to pick up only if a concrete perf question reopens them.
>
> ---
>
> Status: **infra built; perf/unit/E2E green; THREE pre-existing bugs found & fixed** (2026-06-04):
> the parse hang (a worker `expose` race), the freeze/sluggishness/OOM (a data-table re-render
> loop), and tables over-rendering each other. All validated in a real browser via CDP.
> Goal: catch performance/memory regressions before they ship — specifically the kind where a
> refactor makes parsing a save or filtering a data table lock up the browser. Prefer small,
> repeatable, subsection-scoped tests over flaky full-app E2E.
>
> **What kicked this off:** after the data-layer + WASM-parser refactors, parsing a save "lagged
> out the whole browser and nothing worked," and later the map went sluggish + interacting with a
> table or opening a facet froze/crashed the tab. We wanted automated perf/memory guards so this
> class of regression is caught early. Building + running those guards surfaced the real causes
> (see _Bugs found & fixed_) — none of which were the parse compute, the datasets (smaller than
> `main`), the map, or the faceted filters per se.

## Tooling decision — why Vitest browser mode (not Playwright CT, not full E2E)

The save parse already runs off the main thread (Comlink worker), so the freeze is downstream
main-thread work (rendering huge structures, filtering big tables). That split the goal into two:

- **Parse throughput / table-filter cost / memory** → mount a _subsection_ in a **real browser** and
  measure. This is where regressions live and where we want repeatable, non-flaky guards.
- **Whole-app "does the worker path actually work"** → genuinely needs the real app driven end to
  end.

**Chosen: Vitest browser mode (Playwright provider, Chromium)** for the subsection tests, because it
gives a real engine (real V8, real WASM tiers, real DOM layout) while mounting a _component_, not the
whole app — no router/server/navigation, which is the flakiness surface the user wants to avoid. It
reuses the existing Vitest + `@effect/vitest` stack. Playwright **component testing** was rejected
(experimental, separate runner/config, Node↔browser serialization boundary). Full Playwright **E2E**
is reserved for the one thing Vitest browser mode genuinely can't do (the worker path — see below).

This matches the Vitest docs' own caveat: browser mode is _not_ a drop-in E2E runner.

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
  `process.env.VITEST` is unset. Vitest runs _root_ plugin hooks even for standalone projects, and
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

## Bugs found & fixed (all pre-existing, all validated)

Building and _running_ these guards surfaced four distinct pre-existing bugs. Commits: `d7358323`
(worker init/expose + infra), `d2763f3e` (the rest).

### 1. Save parse hung — WASM never init'd, worker never exposed, then an `expose` **race**

The WASM-parser rewrite was never runtime-verified. Three layers, fixed in order:

- The `--target web` WASM was **never `init()`-ed** → `__wbindgen_malloc` undefined → `parse_save` throws.
- The Comlink worker **never called `expose()`** → the wrapped caller's message is never answered → hang.
- **The subtle one (the race):** doing `init().then(() => Comlink.expose(...))` exposes the API only
  _after_ an async init. But `save.ts` calls `api.parseEldenRingData(...)` the instant it creates the
  Worker; a Comlink message that arrives **before** `expose()` attaches its listener is **dropped**, and
  the caller hangs forever. Intermittent — sometimes the init resolved first, sometimes not (which is
  why an early E2E run passed at 4.2s and later ones hung).

**Fix** (`src/lib/er-save-parser.worker.ts`): `Comlink.expose({...})` runs **synchronously at module
eval** (listener attached before any call can arrive); the `--target web` wasm `init()` is awaited
**once per call** inside the exposed method (`wasmReady ??= init({ module_or_path: wasmUrl })`). Kept
separate from `er-save-parser.ts` (Node unit test imports the pure fns); the worker file uses
browser-/Vite-only constructs (`?url` wasm import). `save.ts` points the Worker here, and
`@elden-ring-compass/save-parser` got an `exports` entry for `./elden_ring_save_parser_bg.wasm`.
**Verified** by `e2e/save-parse.spec.ts` — now deterministic.

### 2. The freeze / sluggish map / OOM — a continuous data-table re-render loop ⟵ the big one

With a save loaded, the app re-rendered **continuously (~60 fps, ~50 MB/s) at idle**, saturating the
main thread — that's why the map was sluggish, table interactions froze, and opening a facet crashed
the tab (it pushed the already-pegged thread to OOM). Confirmed by CDP: idle heap grew monotonically
→ OOM; profile was all React render machinery + react-table; it stopped when the data tables were
removed (not the map, not the parse). No "Maximum update depth" error because the offending setState
was _deferred_, not render-phase.

**Cause:** `useDataTableState` returned `slice ?? defaultTableState(initProps)`. When a table had no
persisted state, `defaultTableState` made **fresh `[]`/`{}` every render**, so react-table saw
`state.sorting`/`columnFilters` change identity each render → fired **`autoResetPageIndex`** →
queued setState → re-render → new arrays → loop.
**Fix:** memoize the fallback — `const fallback = useMemo(() => defaultTableState(initProps), [tableId])`.
Idle heap went from +200 MB→OOM to **flat (+1 MB)**.

### 3. Faceted filters materialized hundreds of elements per render

`DataTableFacetedFilter` built a `<CommandItem>` per unique value even while closed (JSX children are
constructed regardless of whether Base UI mounts them). A high-cardinality column (`weight`,
`Effects`) × ~15 facets × every render = the element explosion in the load profile.
**Fix:** gate the option list behind `open` state — ~6× fewer elements created on load.

### 4. Tables over-rendered each other + parse ran twice

- Every table read `useAtom(tableStateAtom)` (the whole map), so any table's change re-rendered all
  tables. **Fix:** per-table slices via `Atom.family(id => Atom.map(tableStateAtom, m => m[id]))`; the
  registry dedupes on `Object.is`, so siblings don't re-render (writes still go through the whole map).
- `saveFileSourceAtom`'s write set `persistedUrl` before `transient`, firing the parse atom twice per
  change. **Fix:** set `transient` first (the read short-circuits) → one parse.

The direct (main-thread) parse path is tested in `er-save-parser.perf.browser.ts` and passes, proving
the parser itself is fine once initialized.

## What exists

| File                                                    | What                                                                                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vite.config.ts`                                        | combined config, `unit`+`perf` projects, VITEST plugin trimming                                                                                                  |
| `vite-plugins/er-data-tiles.ts`                         | extracted tile-middleware plugin (shared by app + perf)                                                                                                          |
| `src/test/perf/cdp-memory.ts`                           | `forceGcHeapUsedBytes()` + `mb()` via CDP                                                                                                                        |
| `src/test/perf/smoke.perf.browser.ts`                   | sanity: effect-vitest + cdp() work in browser mode                                                                                                               |
| `src/lib/er-save-parser.perf.browser.ts`                | parse perf — direct (passing) + worker (`it.effect.skip`, see below)                                                                                             |
| `src/lib/er-save-parser.worker.ts`                      | race-safe worker: synchronous `expose` + await-once wasm init (bug #1)                                                                                           |
| `src/components/data-table/data-table.perf.browser.tsx` | mounts `DataTable` + armaments catalog; times mount + Name-filter + heap. ⚠️ uses simplified columns — does NOT yet guard the re-render loop (see _What's left_) |
| `e2e/save-parse.spec.ts`, `playwright.config.ts`        | E2E for the real worker parse path (now deterministic)                                                                                                           |
| `src/lib/runtime/{client,server}.ts`                    | client/server `ManagedRuntime` (logging)                                                                                                                         |

Run: `bun run test` (unit) · `bun run test:perf` (Chromium perf) · `bun run test:e2e` (Playwright).

## What's left

- **A regression guard for the re-render loop (highest value, NOT yet written).** This is the lesson
  of the whole episode: `data-table.perf.browser.tsx` exists but **would not have caught bug #2** —
  it hand-builds simplified columns (Name as `includesString`, two low-cardinality facets) and only
  times mount+filter, so it dodged both the high-cardinality faceted explosion _and_ the autoReset
  loop. A real guard must: mount the **actual** section/columns (`InventoryDataTableCard` /
  `defaultColumns`) with a parsed save, then assert **idle is quiet** — e.g. `forceGcHeapUsedBytes()`
  stays flat over a few seconds with no interaction, and/or a React commit-count cap (hook
  `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot`). Idle-heap-flat is the cheapest deterministic
  signal and is exactly what flipped 197 MB→OOM vs +1 MB before/after the fix.
- **Map perf + leak test** (`leaflet-map.perf.browser.tsx`) — **deprioritized.** This session
  _disproved_ the "map is leaking" hypothesis: with the map removed, idle still churned identically,
  and a viewport-resize test showed the churn was the table loop, not Leaflet. So a map leak test is
  now a nice-to-have guard (mount→unmount×N + `forceGcHeapUsedBytes`), not a hot lead. No longer
  blocked by tile-index work. The trimmed perf config already serves tiles.
- **Memory A/B harness** (`memory.perf.browser.ts`) — write only if/when the IndexedDB experiment
  starts. Force-GC JS-heap before/after each storage strategy, optional `bench()`. NOTE: the
  committed data-layer direction is in-memory / NO IndexedDB; this harness is how you'd gather
  evidence to revisit that. Measure JS heap (what IDB reduces), not total bytes.
- **Worker parse perf test** — parked as `it.effect.skip` in `er-save-parser.perf.browser.ts`.
  `init()` stays pending inside a Vitest-browser module worker (resolves fine on the main thread) —
  the worker+`?url`-asset corner where Vitest browser mode is weakest. The real worker path (incl.
  the `expose` race) is covered by the Playwright E2E instead. Unskip if Vitest's worker story improves.

### Gotcha for whoever runs these next

The perf E2E uses a **dev server** (`reuseExistingServer`). A long-lived dev server accumulates
stale HMR state for the **Web Worker** (workers don't HMR cleanly), which made the parse hang in
some test runs after many edits. If `save-parse` hangs at "Loading…", kill the server on `:3005`
and re-run against a fresh one. (This is a test-harness quirk, not the app — the app worker is now
race-safe.)

## Conventions for new perf tests

- File name `*.perf.browser.{ts,tsx}`, in the `perf` project.
- Mount app components under `<RegistryProvider>` (effect-atom needs it) — see the data-table test.
- Use `it.effect` + `Effect.log`; time with `performance.now()` inline (no measurement wrapper);
  memory with `forceGcHeapUsedBytes()` from `cdp-memory.ts`.
- Thresholds: HIGH consts to start, ratchet down. Feed real, full datasets (the catalog), not faker.
