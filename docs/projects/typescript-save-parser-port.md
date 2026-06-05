# TypeScript Save-Parser Port — evaluating "drop Rust/WASM, port the Python parser"

> **Status (2026-06-04): DONE — TS-only; the Rust/WASM stack is DELETED.** The read-path
> port lives in `packages/save-parser` (`@elden-ring-compass/save-parser-ts`,
> `parseSave(buffer)`), emits the identical lean DTO, and was verified **byte-for-byte**
> against the (now-removed) WASM parser on `ER0000.sl2` (all 5 active slots, incl. the full
> ~1.7 MB event-flag bitfield) before deletion.
>
> **Perf — MEASURED (ER0000.sl2), and the TS port won big** (this is what triggered the
> deletion): node (tinybench, `vitest bench`) **TS ≈ 1.6 ms vs WASM ≈ 95 ms — ~60× faster**;
> real Chromium **TS ≈ 3 ms vs WASM ≈ 99 ms — ~33× faster**; retained heap ~0.2–0.4 MB either
> way. The `serde-wasm-bindgen` marshalling tax (rebuilding the whole DTO out of linear memory
> every call) dominates, exactly as the "Why JS could win" section predicted.
>
> **Deleted (Phase 1 done):** the `er-save-lib` git submodule, the
> `elden-ring-save-parser` wasm-bindgen wrapper + its `pkg/`, the root `build:wasm-parser`
> script, the `?parser=ts` backend flag (`save-parser-backend.ts`), and the live TS-vs-WASM
> parity test. The web app parses TS-only via the worker (`er-save-parser.ts` →
> `@.../save-parser-ts`); `apps/web/src/lib/wasm-wrapper.ts` was renamed `save-dto.ts` (types
> only). **Comlink was also DROPPED** — the worker now uses a plain `postMessage` request/response
> (a correlation-map helper in `atoms/save.ts`), verified end-to-end by the Playwright E2E
> (`e2e/save-parse.spec.ts`); and the now-unused `vite-plugin-wasm` was removed from the web build.
> The byte-exact guard is now the parser package's parity test
> vs a **frozen** oracle (`packages/save-parser/test/parity.test.ts`) — the oracle was captured
> from the verified WASM parser before deletion (its generator is gone with the WASM stack).
>
> **Still deferred (Phase 2):** DLC/PS-platform fixtures. The sections below are the original
> decision doc, kept for rationale.

## Why this is even on the table

We just cloned **[er-save-manager](https://github.com/.../er-save-manager)** (Hapfel,
**MIT**), a mature ER save manager/editor whose parser is an explicit **Python
reimplementation of ER-Save-Lib** — the _same_ library our WASM parser forks
(`packages/er-save-lib/src/.../world.py`: _"Based on ER-Save-Lib Rust implementation."_).
So for the first time we have a **complete, readable, same-structure reference parser in a
high-level language** — the format knowledge already ported out of Rust once.

Two facts discovered during the review make a TS port look cheap where it previously looked expensive:

1. **The parse path is pure stdlib.** Every file in `parser/` imports only `struct`
   (binary reads) + `hashlib` (MD5 slot checksums). **No numpy, no Oodle, no zstd, no
   cryptography.** (The repo's `cryptography`/`pycryptodome`/`pillow`/`customtkinter` deps
   are for the GUI, SteamID patching, and other games — not ER save parsing.) The
   **character slots** (`UserDataX` — everything our DTO reads: stats, inventory, event
   flags, equipment) are **plain uncompressed little-endian structs**.
2. **There's now a full byte-layout spec on disk**: `er-save-manager/docs/technical/
save-file-structure.md` (parser-sourced offsets for every struct). A port is
   transcription against a written spec + a working reference impl, not RE.

## Wait — isn't part of the save zstd-compressed? (the nuance)

Yes, **one section is** — and it doesn't matter for us. Worth pinning down because it's the
reason the Rust crate carries `zstd` and it's tempting to assume the save parser needs it.

- The save's **`USER_DATA_11` section is a DCX_ZSTD regulation blob** (the embedded param
  database, `0x240000` bytes). So "some of the save is zstd" is **true**.
- But **the save parser never decompresses it.** er-save-manager reads it as an opaque blob
  (`save.py`: `obj.user_data_11 = f.read(0x240010)`), and our Rust `lean_export()` doesn't
  read it at all. Only the **character slots** matter to us, and those are uncompressed.
- **Why our Rust crate has `zstd` anyway:** ER-Save-Lib is a general library that _also_
  parses the standalone **`regulation.bin`** (params). All zstd in our fork is confined to
  `src/regulation/` (`DCXZSTD<BND4<Params>>`, `regulation/dcx_zstd/`). We compile the
  **whole crate** to wasm, so that dependency — and the **clang + zstd-wasm-shim** build
  requirement — comes along for the ride, **even though `parse_save → lean_export()` never
  calls it** (`packages/elden-ring-save-parser/src/lib.rs` only serializes `lean_export()`).
  At runtime the web app gets every param/name from the pre-extracted
  `@elden-ring-compass/data` package, never from regulation.

**Consequence for the port:** we port **only the slot read path** and simply don't port the
regulation module. zstd/clang fall away not because "saves aren't compressed" (the
regulation blob is) but because **nothing our parser reads is compressed, and the one
compressed section is opaque to us.** (If we ever needed regulation at runtime, TS has
`fzstd`/native `DecompressionStream`, no clang — but we don't: that's the extractor's job.)

## What the current WASM approach costs

From `wasm-save-parser-rewrite.md` (the Build section):

- A **git submodule** (`packages/er-save-lib` → our `EthanShoeDev/ER-Save-Lib` fork,
  branch `wasm-compat`) that we must keep rebased on upstream.
- A **Rust toolchain**: rustup + `wasm32-unknown-unknown` + `wasm-pack`, **plus clang**
  (LLVM) solely for `zstd-sys`'s wasm C build — a documented, easy-to-miss host setup
  step (`winget install LLVM.LLVM`, manual PATH).
- A `wasm-bindgen` + `serde-wasm-bindgen` boundary in the wrapper crate, a
  `bun run build:wasm-parser` step, and a `pkg/` artifact the web app imports.
- A bilingual repo: contributors touching the parser need Rust.

It works and is verified (`apps/web/src/lib/wasm-save-parser.test.ts` vs `ER0000.sl2`).
The question is whether the ongoing cost is worth it now that a TS port is feasible.

## What a TS port would look like

```
packages/
  elden-ring-save-parser/           # becomes a pure-TS package (no Rust, no submodule, no pkg/)
    src/
      binary-reader.ts              # DataView/struct helper (we already have one in er-extractor/src/formats/binary-reader.ts — reuse the pattern)
      types.ts                      # MapId, FloatVector3/4, HorseState, enums
      save.ts                       # BND4-ish slot walk: header → 10 slots → UD10 → UD11
      user-data-x.ts                # the big per-slot read (sequential field order from save-file-structure.md)
      player-game-data.ts           # stats/level/runes/buildups/flasks/name
      equipment.ts, inventory.ts    # gaitem_map, equip slots, held/storage inventory
      event-flags.ts                # raw bitfield slice (trailing-zero trim) — addressing already lives in er-extractor
      lean-export.ts                # assemble the SAME LeanSave DTO the web app already consumes
```

- **Emit the identical lean DTO** the web app already reads (`player_game_data.*`,
  `event_flags.flags`, `ga_items`, `chr_asm2`, `regions`, …). Then `apps/web/src/lib/
wasm-wrapper.ts` and every `vm/*` stays byte-for-byte the same — this is a backend swap,
  not a feature change.
- **Read-only first.** We only parse. MD5 checksums are needed for _writing_ saves; a
  read-only parser can skip `hashlib` entirely. (If we ever add save-editing, MD5 is a
  10-line WebCrypto/JS function.)
- **Reuse what we have.** `er-extractor/src/formats/binary-reader.ts` is already a
  little-endian struct reader; `er-extractor/src/game/event-flags.ts` already implements
  `eventFlagOffset(id) → [byte,bit]` (the BST addressing). The port mostly needs the
  per-slot field walk.
- **Effect-native.** Parsing becomes an `Effect` returning a typed DTO with typed parse
  errors and a real `Schema` (matches memories `effect-fs-not-bun-file`,
  `effect-logging-managedruntime`), instead of a `JsValue` over a Comlink/wasm boundary.

### Scope estimate

The reference `parser/` is ~7,300 lines of Python **including the editor/write paths we
don't need** (`character_presets.py` 1228, `slot_rebuild.py`, inventory _write_ ops, the
`fixes/` corruption editors). The **read path for our lean DTO** is a subset:
`er_types.py` (313), `user_data_x.py` (681), `player`/`equipment.py` (641),
`inventory_ops.py` read paths, `world.py` (the structs we keep), `event_flags.py` read
(~150 lines of the 516). Call it **~1,500–2,500 lines of straightforward TS** against a
written spec + working reference + our existing test fixture.

## The case FOR porting

- **Deletes the entire native toolchain**: no Rust, no clang, no wasm-pack, no submodule,
  no `pkg/` build artifact, no rebasing-on-upstream chore. CI and new-contributor setup
  shrink to "it's just TypeScript."
- **One language.** The extractor is already Effect-TS; the web is TS. The parser was the
  _only_ reason the runtime stayed bilingual.
- **Smaller bundle / no wasm init.** Drops the `.wasm` download + `initSync`/instantiate
  dance (and the historical bug class around it — see memory `wasm-save-parser`: the
  runtime bug was a missing wasm init + missing Comlink expose). A pure-TS module in a
  Worker has none of that ceremony.
- **Drop Comlink (the GoogleChromeLabs worker-RPC bridge).** Today the worker boundary uses
  **Comlink** — `er-save-parser.worker.ts` does `Comlink.expose({...})` and `atoms/save.ts`
  does `Comlink.wrap<SaveParserWorker>(worker)`. Comlink's proxy/transfer machinery exists
  to make calling _into the wasm across the worker_ ergonomic, and it's the source of one of
  the two shipped runtime bugs (the missing `Comlink.expose`, memory `wasm-save-parser`).
  With a pure-TS parser the worker contract collapses to **bytes in → one plain serializable
  DTO out** — a single `postMessage`/`onmessage` round-trip (structured clone) covers it, so
  **Comlink can be removed entirely** (one dependency + a whole failure mode gone). We'd
  still run it _in a Worker_ for the 26 MB parse (see perf, below), but a trivial one. _(The
  DTO is already plain-serializable today — it crosses the Comlink boundary as data — so no
  shape change is needed to switch to bare `postMessage`.)_
- **Debuggable in the browser.** Stack traces, breakpoints, and `Effect` tracing through
  the actual parse, vs an opaque wasm frame.
- **We already own the format knowledge twice over** (our fork + this Python ref + the
  written spec), so a third encoding in TS isn't new RE.

## The case AGAINST porting (keep WASM)

- **It already works and is verified.** The WASM path passes the vitest suite against
  `ER0000.sl2`; a port re-litigates a solved problem and risks regressions on the long
  tail of save shapes (version-gated fields like `temp_spawn_point_entity_id` at
  `version>=65`, `gaitem` count `5118` vs `5120` at `version>81`, DLC vs base, PS/Switch).
- **The fork tracks upstream for free.** When ClayAmore fixes a save-format revision after
  a major patch, we `git pull` the submodule. A TS port means **we** transcribe every
  future offset change by hand (this is the _one intrinsic non-self-updating dependency_ —
  `dlc-support.md` §7). The Python repo helps, but only if _it_ stays current.
- **Perf — genuinely unknown, and possibly _backwards_.** The intuition is "WASM
  struct-walking over a 26 MB save is faster than JS." That may be wrong: the WASM path pays
  a **marshalling tax** JS doesn't — `serde-wasm-bindgen` rebuilds the entire lean DTO (incl.
  the ~1.7 MB-per-slot result) out of wasm linear memory into JS objects on every parse, then
  structured-clones it across the worker boundary. A well-written `DataView`/`ArrayBuffer` TS
  parser **constructs the JS object graph directly with no boundary crossing**, so the
  marshalling cost the WASM path can't avoid may erase (or invert) its byte-walking advantage.
  **We will not know without measuring** — see [Performance](#performance-a-side-by-side-bench-decides-this).
- **Sunk integration.** The wrapper, Worker wiring, share encode/decode, and DTO are all
  built around the current output. The swap is "drop-in" only if the TS DTO is exactly
  shape-identical — easy to get subtly wrong.
- **Write support later.** If save-editing ever becomes a feature (the WASM lib already
  supports re-encrypt + hash recompute), the Rust path has it; a TS port would re-port the
  write side too.

## Performance: a side-by-side bench decides this

Perf is **the** deciding variable, and the honest position is: **the JS impl might actually
be faster, but we don't know until we test.** This section says exactly what to build so the
decision is data, not intuition.

### Why JS could win (not just "not lose")

- **No marshalling tax.** WASM's win is tight numeric loops; its loss is the boundary. Our
  output is a **big JS object graph** (per-slot stats + inventory + the ~1.7 MB event-flag
  bitfield + gaitem handles), and `serde-wasm-bindgen` must materialize all of it out of
  linear memory into JS objects every call. A TS parser building those objects directly skips
  that step entirely. For a parser whose job is "produce a large JS object," boundary cost can
  dominate raw byte-walking.
- **Zero-copy views where it counts.** With `DataView`/`Uint8Array` over a single
  `ArrayBuffer`, the event-flag region ships as a **`subarray` view (zero-copy)** rather than a
  copied `Vec<u8>` re-serialized across the boundary. Same for the gaitem map — walk it in
  place, emit only non-empty entries.
- **No init cost.** No `.wasm` download + `initSync`/instantiate before the first parse (the
  TS module is just code).

### Why JS could still lose

- V8 deopts on sloppy reads (mixing field types, megamorphic shapes), per-field allocations,
  or building intermediate arrays. The TS impl must be written **deliberately**: one
  `DataView` with explicit `littleEndian: true` reads, no per-field objects in hot loops,
  `subarray` not `slice` for the bitfield, decode `character_name` (the one UTF-16 string) once.
- Structured-clone of the result across the worker boundary is paid by **both** impls — so
  it's a wash for the worker-RPC cost, but it means "move to a worker" doesn't by itself make
  either faster; it just moves the work off the main thread.

### The bench already half-exists — extend it, don't invent it

`apps/web/src/lib/er-save-parser.perf.browser.ts` already benchmarks the **wasm** parser in
real Chromium (real V8 + WASM tiers): median-of-5 (+warmup) parse time **and** retained heap
(via CDP `forceGcHeapUsedBytes`), against `/ER0000.sl2`, with a `direct` test and a
(currently **parked**) `worker` test. The plan:

1. **Add a `ts` variant alongside `wasm`** in the same file so they run **back-to-back on the
   same buffer, same machine, same metrics** — the only fair comparison. Aim for three
   measured paths each: `direct` (parse on the test thread), `worker` (full round-trip), and
   ideally `cold` (first-call incl. wasm-init vs TS module eval).
2. **Measure the metrics that actually differ:** parse-only ms (warm), **end-to-end** ms incl.
   marshalling + structured-clone (this is where WASM's tax shows), retained heap delta, and
   the worker round-trip. Keep the existing median/warmup/CDP-GC methodology.
3. **Use a realistic worst case**, not just the fresh `ER0000.sl2`: a save with a **full
   inventory + many event flags** stresses the object-graph/marshalling cost that's the whole
   question (a fresh save under-represents it). Add such a fixture (overlaps the still-open
   "DLC fixture" item in `wasm-save-parser-rewrite.md`).
4. **Identical DTO is mandatory** for the comparison to mean anything — the `ts` variant must
   emit the same shape, so the per-call marshalling/clone cost is compared like-for-like.

### Can it run in a Web Worker? Yes — and it's _easier_ for the TS impl

Both impls can run in a worker; today's wasm one does (via Comlink). Two notes:

- **The TS impl removes the worker's sharpest edge.** The parked `worker` perf test is parked
  because **wasm `init()` stays pending inside a Vitest-browser module worker** (see the file's
  comment) — a TS parser has **no wasm init**, so that worker path becomes straightforwardly
  testable, and the same simplicity applies in production.
- **Transferables, not copies.** Post the 26 MB save `ArrayBuffer` _into_ the worker on the
  `postMessage` transfer list (zero-copy move). The result DTO is structured-cloned back (paid
  by both impls); where a field is a big buffer (the event-flag bitfield) it can ride back on
  the transfer list too. Combined with the [Comlink drop](#the-case-for-porting), the worker
  contract is "transfer bytes in → structured-clone DTO out," no proxy layer.
- **Decision rule:** if the `ts` variant's **end-to-end** (parse + marshal + worker clone)
  median is ≤ the wasm path's within heap budget, the toolchain/maintenance win makes the port
  worth it. If wasm is materially faster end-to-end on the worst-case fixture, **keep wasm.**

## Open questions

1. **Perf** — does a `DataView`-based TS parser match or beat the wasm path **end-to-end**
   (parse + marshalling + worker clone) on a worst-case save? The deciding question; resolved
   by the side-by-side bench, not argued. See
   [Performance](#performance-a-side-by-side-bench-decides-this).
2. **Maintenance reality** — does porting actually reduce maintenance, or just trade
   "rebase a Rust submodule (rare)" for "hand-transcribe offsets after every save-format
   bump (rare)"? Both are rare; the question is which we'd rather own.
3. **Keep the fork as the spec-of-record?** Even if we port, we could keep the ER-Save-Lib
   fork + the Python repo as **non-shipping references** to diff against on a patch.
4. **Verification bar** — port is only mergeable if it passes the _existing_
   `wasm-save-parser.test.ts` assertions byte-for-byte, plus a DLC fixture (the still-open
   item in `wasm-save-parser-rewrite.md`).

## Recommendation (tentative)

**Spike, don't commit.** A bounded Phase 0 spike de-risks the whole decision:

- **Phase 0 — port the read path for the lean DTO** behind a flag, emit the identical DTO,
  and run it against `ER0000.sl2` through the **existing** vitest suite. Then add the `ts`
  variant to `er-save-parser.perf.browser.ts` and run it **side-by-side with wasm** (see
  [Performance](#performance-a-side-by-side-bench-decides-this)). If correctness passes and
  the `ts` end-to-end median is ≤ wasm within heap budget, the maintenance/toolchain win
  justifies the swap; if wasm is materially faster, keep it.
- **Phase 1 — swap + delete** the submodule, wrapper crate, wasm build, **and Comlink**
  (replace the `Comlink.expose`/`wrap` worker boundary with a plain `postMessage` contract);
  update `wasm-save-parser-rewrite.md` to mark the Rust path retired (keep the fork + Python
  repo as references).
- **Phase 2 — DLC + platform**: extend to the DLC fixture (already an open verify item)
  and optionally add PS/Switch magic detection (the Python repo has it; our parser is
  PC-only).

If the perf spike comes back bad, **keep WASM** — the toolchain cost is real but bounded,
and a verified parser beats an elegant one.

## Reuse & attribution

- **License: MIT** (Hapfel 2026) — reuse and porting are permitted with the copyright
  notice preserved. If we port, credit `er-save-manager` (and the upstream ER-Save-Lib
  lineage: ClayAmore + vswarte + Nordgaren) in the package and in
  `packages/er-extractor/src/vendor/PROVENANCE.md`-style provenance.
- The **byte offsets are not "code"** in the copyright sense (they're facts about the
  format), but the structure/organization we'd be transcribing from MIT code, so keeping
  the notice is the clean path.

## Resources

- `docs/cloned-repos-as-docs/er-save-manager/` — the Python reference parser (`src/
er_save_manager/parser/`) + the byte-layout spec (`docs/technical/save-file-structure.md`).
- Current WASM parser: `wasm-save-parser-rewrite.md`; perf: `testing.md` + memory
  `perf-testing-setup`; the intrinsic-dependency framing: `dlc-support.md` §7.
  </content>
  </invoke>
