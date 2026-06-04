# Repo Reorganization — vendored-data vs extractor vs data vs save-parser

> **Status (2026-06-04): PROPOSAL / not started.** Scopes a monorepo package
> reorganization around a single clarifying axis: **"could we extract this ourselves from
> the installed game, or did we rip it verbatim from someone else?"** Package _names_ below
> are first-draft — see [Naming](#naming) for the inconsistency this should also fix.
> Related: `dlc-support.md` (§7 dependency robustness — the principle this formalizes),
> `typescript-save-parser-port.md` (creates the new save-parser package), and
> `packages/er-extractor/src/vendor/PROVENANCE.md` (the seed of the vendored-data package).

## The organizing principle

Today everything data-ish lives under `packages/er-extractor/src/vendor/` next to the
extraction logic, and the runtime save parser carries its _own_ duplicate copies of some of
the same constants (PROVENANCE.md already laments this). The clean split is by **provenance
+ who has to update it on a game patch**:

| Kind | Where it comes from | Who updates it after a patch | Goes in |
| --- | --- | --- | --- |
| **Vendored constants** — eventflag-BST table, AES/RSA keys, paramddefs, EMEDF, path dictionary, **curated quest/flag DBs** | Ripped verbatim from other repos/tools/wikis; **we cannot derive it from the install** | **External maintainers** (we re-copy) | `vendored-data` |
| **Extraction logic** — DCX/BND4/FMG/PARAM/MSB/EMEVD parsers, joins, codegen | Our own code, reading the install | **Us** (it's our code) | `er-extractor` |
| **Cleaned output** — the joined, deterministic datasets the site reads | Emitted by the extractor | Auto (re-run extractor) | `data` |
| **Save parsing** — the user's `.sl2` → lean DTO, in-browser | Our own code (ported from the Py/Rust reference) | Us, on a save-format revision | `save-parser` |

> **The differentiator the user named:** vendored-data is *"stuff we cannot easily extract
> from the installed game ourselves, and if the game updates we're relying on other people to
> update it for us externally."* er-extractor is *"the business logic of scraping data out of
> the installed game files"* and should **not** hold big magic constants — those came from
> somewhere else, so they belong in vendored-data; the extractor **depends on** vendored-data
> to join them against install data into clean output.

## Current layout (for reference)

```
packages/
  config/                  @elden-ring-compass/config          shared TS/build config
  oxlint-plugins/          @elden-ring-compass/oxlint-plugins   lint rules
  elden-ring-data/         @elden-ring-compass/data             GENERATED extractor output (generated/, images.ts) — web consumes
  er-extractor/            @elden-ring-compass/er-extractor      Bun+Effect extractor; src/vendor/ holds ALL vendored constants
  er-image-codec/          (Rust cdylib "er-image-codec")        BCn DDS→PNG, loaded by er-extractor via bun:ffi (.dll)
  er-save-lib/             (git submodule → fork, Rust)          ER-Save-Lib fork (wasm-compat branch)
  elden-ring-save-parser/  @elden-ring-compass/save-parser       wasm-bindgen wrapper over er-save-lib; web consumes
apps/
  web/                     the site (consumes @.../data + @.../save-parser)
```

Problems this reorg fixes:

1. **Vendored constants are buried** inside the extractor's `src/vendor/` and **duplicated**
   into the save parser (two copies of the eventflag-BST / format constants — PROVENANCE.md
   note). No single source of truth.
2. **er-image-codec is a top-level package** but is really an extractor-private native helper
   (loaded by `er-extractor/src/external/image-codec.ts` via a relative `.dll` path).
3. **Naming is inconsistent** (`er-*` vs `elden-ring-*`).
4. The Rust/WASM save stack (`er-save-lib` submodule + `elden-ring-save-parser` wrapper) is
   slated for replacement by a TS port (`typescript-save-parser-port.md`).

## Proposed layout

```
packages/
  config/                  @elden-ring-compass/config          (unchanged)
  oxlint-plugins/          @elden-ring-compass/oxlint-plugins  (unchanged)

  vendored-data/           @elden-ring-compass/vendored-data   ★ NEW — verbatim external data + PROVENANCE.md
  er-extractor/            @elden-ring-compass/er-extractor     business logic only; depends on vendored-data
    native/image-codec/    (Rust cdylib, MOVED from packages/er-image-codec)
  data/                    @elden-ring-compass/data             GENERATED output (renamed dir from elden-ring-data)
  save-parser/             @elden-ring-compass/save-parser      ★ TS port (replaces er-save-lib submodule + wasm wrapper)
apps/
  web/                     consumes @.../data + @.../save-parser (+ @.../vendored-data runtime subpath)
```

### Dependency graph

```
            vendored-data  (leaf: no deps; just data + provenance)
           /      |      \
   er-extractor   |   save-parser        data  (generated; ideally zero runtime deps)
        │ emits   |        │                ▲
        ▼         |        │                │
       data ──────┘        └──────── apps/web ──┘
                                   (data + save-parser + vendored-data/runtime)
```

- **`vendored-data`** — a leaf package. Both the build-time extractor and the runtime
  (save-parser / web) depend on it → **kills the current BST duplication**; one copy of
  `eventflag-bst.txt` serves the extractor's `eventFlagOffset()` codegen *and* runtime
  arbitrary-flag lookup (quest compass).
- **`er-extractor`** depends on `vendored-data` and joins it against the install to emit
  `data`. Holds **no** big magic constants of its own.
- **`data`** stays a near-pure passthrough of generated artifacts (mostly as-is).
- **`save-parser`** depends on `vendored-data` (for the BST addressing it needs to expose
  flag reads); replaces the Rust submodule + wasm wrapper once the port lands.

### What moves into `vendored-data`

From `er-extractor/src/vendor/` (verbatim — these are exactly the PROVENANCE.md entries):

- `eventflag-bst.txt`, `paramdex/ER/Defs/*.xml` (+ its PROVENANCE), `er-archive-keys.ts`,
  `er-regulation-key.ts`, `er-dictionary.txt` (9 MB), `er-game-info.ts`,
  `er-common.emedf.json`, and the top-level `PROVENANCE.md` (becomes the package README).

Future additions (the point of doing this now):

- The **curated quest data** ported from `er-save-manager/data/quest_flags_db.py` (36 NPC
  questlines) — see `quest-compass.md`. And optionally the curated **named flag DBs**
  (`event_flags_db.py`, `boss_data.py`) used as cross-check / fallback overlay
  (`data-parity-audit.md`). All are CT/community snapshots → textbook vendored-data, each a
  logged PROVENANCE row.

### ⚠️ Bundle-size design constraint (build-time vs runtime vendored data)

vendored-data has **two consumer classes**, and some entries are huge:

- **Build-time only** (extractor reads the install): paramdex (194 XML), `er-dictionary.txt`
  (9 MB), archive/regulation keys, `er-game-info.ts`, EMEDF (415 KB). **Must NOT ship to the
  web bundle.**
- **Runtime** (web/save-parser): `eventflag-bst.txt`, quest data, curated flag DBs.

→ Give the package **subpath exports** so the web tree-shakes correctly, e.g.
`@elden-ring-compass/vendored-data/runtime` (BST, quest, flag DBs) vs
`@elden-ring-compass/vendored-data/extract` (paramdex, dictionary, keys, EMEDF). The web app
imports only `/runtime`. _(If subpath isolation proves fragile, the fallback is two packages
— `vendored-data` + `vendored-data-extract` — but start with one package + subpaths per the
user's preference.)_

### er-image-codec → er-extractor/native/

It's a Rust cdylib loaded only by the extractor via `bun:ffi` (relative `.dll` path in
`external/image-codec.ts`). Move `packages/er-image-codec/` → `packages/er-extractor/native/
image-codec/`, update the `build:image-codec` script + the `DLL_URL` relative path in
`external/image-codec.ts`, and drop it as a top-level workspace member. (Same rationale could
later apply to the Oodle FFI glue, but Oodle is a system DLL, not our crate — leave it.)

### save-parser (the TS port)

Gated on `typescript-save-parser-port.md`. When the port lands: create `packages/save-parser`
(pure TS, depends on `vendored-data/runtime` for BST), repoint `apps/web` at it, and **delete**
the `er-save-lib` submodule (+ `.gitmodules` entry) and `elden-ring-save-parser` wrapper +
`build:wasm-parser`. Until then the existing wasm package stays; the reorg's other moves don't
block on it.

## Naming

Current dirs mix `er-*` (er-extractor, er-image-codec, er-save-lib) and `elden-ring-*`
(elden-ring-data, elden-ring-save-parser); npm scope is consistently `@elden-ring-compass/*`
(except the two Rust crates, which aren't npm packages). The user noted names are flexible
("maybe some of those names should be changed"). Proposed standardization — **directory ==
unscoped npm name**, no redundant prefix (the scope already says "elden-ring"):

| Now (dir) | npm name now | Proposed dir | Proposed npm |
| --- | --- | --- | --- |
| `elden-ring-data` | `@elden-ring-compass/data` | `data` | `@elden-ring-compass/data` (same) |
| `er-extractor` | `@elden-ring-compass/er-extractor` | `extractor` | `@elden-ring-compass/extractor` |
| `er-image-codec` | (rust) | `extractor/native/image-codec` | (rust, internal) |
| `elden-ring-save-parser` + `er-save-lib` | `@elden-ring-compass/save-parser` | `save-parser` | `@elden-ring-compass/save-parser` (same) |
| _(new)_ | — | `vendored-data` | `@elden-ring-compass/vendored-data` |

Open: keep `er-extractor` or rename to `extractor`? Renaming touches imports/turbo but ends
the prefix inconsistency. (The user floated `elden-ring-ts-save-parser` for the port; the
public name can stay `@elden-ring-compass/save-parser` — "ts" is an implementation detail
that won't be true forever — with the _dir_ just `save-parser`.)

## Migration plan (incremental, each step independently shippable)

1. **Extract `vendored-data` package.** Move `er-extractor/src/vendor/*` → new
   `packages/vendored-data/`, set up subpath exports (`/extract`, `/runtime`), repoint
   `er-extractor` imports. PROVENANCE.md becomes the package README. Verify `bun run extract`
   + `typecheck` green. _(No behavior change — pure move.)_
2. **De-duplicate the BST.** Point the save parser's flag addressing at
   `vendored-data/runtime` instead of its private copy (resolves the PROVENANCE.md duplication
   note). _(If still on wasm, this may wait for the TS port — wasm can't import a TS subpath
   cleanly; note it and defer.)_
3. **Absorb image-codec.** Move `er-image-codec` → `er-extractor/native/image-codec`; fix the
   `build:image-codec` script + `DLL_URL`. Drop the top-level workspace member.
4. **(Optional) Rename for consistency** — `er-extractor` → `extractor`, `elden-ring-data` dir
   → `data`. Update turbo/tsconfig/imports. Do this as its own commit so the diff is reviewable.
5. **save-parser** — when the TS port (`typescript-save-parser-port.md`) is approved: create
   `packages/save-parser`, depend on `vendored-data/runtime`, repoint web, delete the submodule
   + wasm wrapper.
6. **Land quest/flag vendored data** — port `quest_flags_db.py` etc. into `vendored-data`
   (consumed by the quest-compass feature), each a PROVENANCE row.

Steps 1–4 are pure refactors doable now; 5–6 ride on the save-parser-port and quest-compass
feature work respectively.

## Open questions

1. **One vendored-data package with subpaths, or split build/runtime into two packages?**
   (Leaning: one + subpath exports, per the stated preference; split only if web bundling
   leaks the 9 MB dictionary / paramdex.)
2. **Does `data` ever depend on `vendored-data`?** Today it's pure generated output. If some
   datasets are literally passthrough vendored constants (e.g. an event-flag name table), it
   might re-export from vendored-data instead of the extractor copying them in. Decide per
   dataset; default to keeping `data` a pure extractor artifact.
3. **Rename `er-extractor` now or later?** (Cosmetic but churny; bundle with step 4.)
4. **Where do the curated flag DBs live** — `vendored-data` (raw) with the extractor joining
   them into `data`, or emitted straight into `data`? (Leaning: raw in vendored-data; extractor
   joins → keeps `data` install-shaped and the provenance honest.)
</content>
</invoke>
