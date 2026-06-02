# Client-side data layer revamp

> Status: **committed to the stack** (2026-06-02). Reversible if it doesn't pan out.
> Goal: revamp how the web app stores, queries, and renders game data so we get
> first-class search / sorting / querying, and cleanly wire up the new
> `@elden-ring-compass/data` package (extractor output) to the UI.
> **Equally central goal:** make `packages/er-extractor` → `packages/elden-ring-data`
> the *single source of truth* for all game data + images, and **delete every legacy
> data source** (erdb-derived TS, the 1.7 GB erdb assets, hand-authored tables).

## The committed stack

A deliberate bet on the Effect v4 reactive ecosystem, replacing the TanStack Query /
effect-query / TanStack DB directions we considered earlier.

- **Reactive state + query layer:** **effect-atom** (`@effect/atom-react`).
  `Atom.make` wraps a value or an Effect as a reactive node; `useAtomValue` /
  `useAtomSet` bind it to React. Derived atoms give us live, composable
  "queries" (filter/sort/join) over the data. This single layer replaces
  TanStack Query **and** effect-query **and** TanStack DB.
- **Storage = in-memory.** Game data lives as normalized in-memory structures held by
  atoms — **no IndexedDB.** The data is static, read-only, refetchable, and fits in
  memory; a database buys us little here (see "Why not IndexedDB" below).
- **Save-file parsing:** the Comlink **Web Worker → Rust WASM** call gets wrapped as an
  Effect service and exposed as an Atom (`Atom.make` / `Atom.fn`) — typed errors,
  interruption, retries — replacing the React Query hook that does it today.
- **Data delivery:** small datasets bundled from `@elden-ring-compass/data`; large ones
  (markers, placements, weapons, goods, armor) served as static JSON in `public/`
  (CDN-cached) and `fetch`ed lazily into memory by the section that needs them. No API.

### Explicit teardown — remove TanStack Query

`@tanstack/react-query` (and `react-query`-based save loading) is **ripped out and the
dependency deleted** as part of this project. Its only current job — the async save-file
parse (`apps/web/src/lib/er-save-file-query.ts`) — moves to an Effect-wrapped Atom. After
migration there should be **no `@tanstack/react-query` import** left in `apps/web`, and it
comes out of `package.json`. (We never adopt TanStack DB or effect-query either.)

### What this does NOT replace

- **TanStack Table (v8, headless)** stays — it's a presentation/column/sort-UI library,
  orthogonal to the data layer. It renders rows that come from an atom. (Sorting/filtering
  can live either in the table or in a derived atom; decide per-table.)
- **Zustand → migrate to effect-atom (now a goal, decided 2026-06-02).** All Zustand
  stores (save source, slot selection, table UI config, inventory selection) are replaced
  with writable atoms so reactive state is one effect-native layer. Writable atoms are
  drop-in reactive state; persisted stores (the localStorage `saveFileSourceUrl`, etc.) use
  `Atom.writable(read, write)` with a side-effecting write, or `Atom.kvs` for schema-backed
  localStorage. Exception: `interactive-map.tsx`'s map store is owned by the in-progress
  tiled-map work — coordinate before touching it.

### ⚠️ The risk we're accepting

The app's `effect` dependency becomes the **v4 beta (smol)** line
(`@effect/atom-react@4.0.0-beta.75`). APIs will churn until v4 GA, and most of the wider
Effect ecosystem is still v3. Accepted on purpose: fun side project, internally consistent
stack, reversible.

## Single source of truth: retire ALL legacy data

A core goal of this project — not a side effect. **Every byte of game data and every
image the app renders must originate from `packages/er-extractor` (derived from a real
install) → `packages/elden-ring-data`.** No erdb-derived files, no hand-authored tables,
no third-party data dumps remain in `apps/web`. This is what makes the whole pipeline "one
repeatable command against your install."

### Legacy sources to delete (inventory)

| Path | What it is | Replacement |
|------|-----------|-------------|
| `apps/web/src/lib/elden-ring-raw-db/` (24 `.ts`) | erdb-derived static arrays (WEAPONS, ARMORS, TALISMANS, BOSSES, GRACES, names, EVENT_FLAGS, REGIONS, MAPS, STATS, …) | `@elden-ring-compass/data` generated tables |
| `apps/web/src/assets/erdb/` (**1.7 GB**: `json/`, `icons/`, `map/`) | erdb JSON dumps + item icons + map images | generated JSON + `elden-ring-data/images/` (WebP, LFS) |
| `apps/web/src/lib/erdb.ts` | loader for the erdb JSON assets | atom loaders over the new datasets |
| `apps/web/src/lib/map-db.ts` (1.2 MB) | item drop locations keyed by name | `placements` dataset (ItemLotParam stage) |

`apps/web/src/lib/vm/*` (equipment, events, inventory, regions, stats) are **rewired, not
deleted** — they keep joining save data to game data, just sourced from the new package.

### ⚠️ Deletion is GATED ON PARITY — the extractor must cover what the app uses

`elden-ring-data` currently emits: graces, bosses, weapons, armor, talismans, goods,
ashes-of-war, arts, markers. The legacy data covers **more** than that. Each legacy file is
deleted **only after** the new packages produce an equivalent (verified by diff). Known
**coverage gaps** that need new extractor/codegen stages (or a deliberate decision to drop
the feature) before their legacy source can go:

- **Event flags** (full set, beyond grace/boss) — `EVENT_FLAGS`
- **Regions / maps / map names** — `REGIONS`, `MAPS`, `MAP_NAMES`
- **Level/stat curves** — `STATS`; **starting classes** — `STARTING_CLASSES`; **archetypes**
- **Spells stats** (FP/slots/scaling, sorcery vs incantation split), **ammo**, **gestures**,
  **reinforcements/upgrade paths**, **correction graphs**, **shop**, **summoning pools**,
  **cookbooks**, **whetblades**, **colosseums**
- **Per-item icons** — the extractor currently emits menu/system icons
  (`01_common/02_title/03_chrmake`), **not** per-item icon images. Item icon sheets are a
  separate source to extract before `assets/erdb/icons/` can be deleted.

So the workstream is: **(1) parity audit → gap list, (2) close gaps in `er-extractor`,
(3) migrate web app dataset-by-dataset, (4) delete each legacy source as its replacement
lands.** Deleting `assets/erdb/` (1.7 GB) is also a major repo-size win.

## How effect-atom gives us "queries" over in-memory data

```
Atom.make(WEAPONS)                         // base atom: the in-memory dataset
   → derived Atom (filter/sort/join/index) // composable, memoized "query"
   → useAtomValue(atom)                     // React re-renders only when its slice changes
```

- Base atoms hold the normalized datasets (loaded from the package or fetched JSON).
- Derived atoms express queries: a search filter, a sorted view, a join of save-inventory
  ⨝ item definitions, the set of map markers for the active layers. They recompute only
  when their inputs change and only re-render subscribers whose result changed.
- The save parse is an async atom (`AsyncResult`) — pending/success/failure handled in the
  view, no separate data-fetching library.
- `Reactivity` / SSR-hydration features exist in the stack but **aren't needed** (static
  client-only site, no server-owned state to hand off).

## Why not IndexedDB (decision rationale)

We seriously considered Effect IndexedDB (effect-smol `@effect/platform-browser`) and
chose **against** it for this data. The reasoning, so we don't re-litigate:

- **effect-atom ≠ IndexedDB.** The reactive querying we want comes from *atoms*, not from
  storage. Atoms work over in-memory data directly.
- **Our data is the wrong shape for a DB win.** It's static, read-only, regenerated by the
  extractor, and fits in memory (~6 MB JSON → tens of MB resident). IndexedDB's real wins —
  persistence of *mutable user-owned* data, datasets too big for RAM, offline-first sync,
  Blob storage — don't apply.
- **It's bad at relational.** IndexedDB has no joins/SQL; relational queries read into
  memory and join in JS anyway. In-memory is both simpler and *faster* for full-table work
  (a JS `.filter()` over 24k rows is ~1–5 ms, sync; IndexedDB reads are async + clone
  overhead).
- **It adds real cost:** schema, migrations, version/manifest hashing, fill orchestration —
  all for a read-only cache.

**When IndexedDB *would* earn its place (future, not this project):** user-owned, durable,
mutable data — e.g. cached/imported **save files** (binary blobs), **favorites / saved
builds**, an offline **completion checklist**, personal annotations. Those are the textbook
fit. If we build such features, revisit IndexedDB *for that data only* — it slots under an
atom (`Atom.make(db.select(...))`) without touching components. Genuine
ship-a-queryable-file / FTS needs would point at `wa-sqlite` + OPFS instead.

## Current architecture (baseline being replaced)

- Tables: TanStack Table v8, all sort/filter/search/pagination client-side in-memory.
- Game data: 100% static TS arrays, **bundled** (`elden-ring-raw-db/`, `lib/erdb.ts`,
  `lib/map-db.ts` ~24.5k lines).
- Save flow: upload/URL → **React Query** → Comlink Worker → WASM → `Slot` →
  `inventoryDbView()` → `useAllErdb()` joins inventory ⨝ ERDB ⨝ `MAP_DB_ITEMS` → table.
- State: Zustand (UI state) + React Query (save parse only). No Effect in the web app yet.

## New data package sizes (`packages/elden-ring-data/src/generated/`)

| dataset      | size    | rows   | delivery |
|--------------|---------|--------|----------|
| markers.ts   | 4.7 MB  | 24,387 | static JSON in `public/`, fetched lazily into memory (map open) |
| weapons.ts   | 548 KB  | 3,333  | static JSON, fetched lazily into memory |
| armor.ts     | 287 KB  | 768    | static JSON, fetched lazily into memory |
| goods.ts     | 240 KB  | 2,177  | static JSON, fetched lazily into memory |
| graces/bosses/talismans/arts/ashes | ≤50 KB | small | bundle from the package (trivial) |

Images: 388 MB in Git LFS (`images/`) — separate concern, served as static files / CDN.

## Map design (resolved 2026-06-02)

The tiled map is **multi-layer** — the user can toggle independent layers (enemies,
bosses, NPCs, items, graces, regions, …). Not an item-drop-only map. Consequences:

- **Markers stay a full, rich entity dataset.** The MSB marker set (24k world entities)
  is the backbone. Each marker carries a derived **`layer` / `category`** field so the UI
  can toggle layers. Classification is a *join*, not a single field:
  - enemies / NPCs ← MSB part `type` (enemy 2/10) + `npcParamId` → `NpcName`
  - bosses ← `BOSSES` dataset (defeat flags + arena), cross-ref to marker entity IDs
  - graces ← `GRACES` dataset (bonfire entity IDs)
  - regions / assets / points ← MSB part/region `type`
- **Item tables stay definition-only (no coords).** Weapons/goods/armor remain stat
  tables keyed by id. The "items" map layer is a **separate world-placement dataset** that
  references item ids by id — NOT coordinates bolted onto item rows. (`markers` =
  entities; item *placements* = a different source — see below.)
- **Item placements = new extractor stage (committed).** Source = **`ItemLotParam`**
  (`ItemLotParam_map` + `ItemLotParam_enemy`), authoritative & derived-from-install.
  Linkage to world coords is the hard part:
  - map items: `ItemLotParam_map` lot → the MSB entity (treasure/asset part) that
    references that lot id → coordinates.
  - enemy drops: `ItemLotParam_enemy` ← `NpcParam.itemLot*` ← enemy MSB placements →
    coordinates.
  This is substantial (lot→placement resolution is what Smithbox/erdb-class tooling does).
  Not started; legacy `map-db.ts` is NOT used.

### In-memory marker / placement model

- `markers`: rows `{ mapId, entityId, layer, type, name, x, y, z, npcParamId, … }`.
- `placements` (item drops): rows `{ mapId, entityId, x, y, z, itemId, itemType, lotId, … }`.
- Derived atoms index them in memory (e.g. `Map<mapId, Marker[]>`, or grouped by
  `[mapId, layer]`) so the active layers for the visible region are an O(1) lookup +
  cheap filter — the core read pattern for the headline map feature. No DB needed.

## Open questions

1. **Exact layer taxonomy** — final list + how regions/assets map to user-facing toggles.
2. **Map projection / coords** — world (x,z) → tile pixel mapping for the tiled view
   (TASKS #4, previously deferred — now relevant again since markers must render on tiles).
3. **Lazy-load granularity** — one markers JSON for everything, or split per map area so
   the map fetches only the regions in view.

## Recommended phasing

- **Phase 0 — parity audit:** map every legacy data source the app actually consumes to
  its new-package equivalent; produce the **gap list** (datasets/icons the extractor
  doesn't emit yet). Gates all deletions.
- **Phase A — foundation (low risk):**
  - Add `@effect/atom-react`. Set up an `AtomRegistry` provider + `RegistryContext` at the
    app root.
  - Wrap the WASM save-parse as an Effect service → expose as an async Atom (`AsyncResult`);
    **delete the React Query hook and remove `@tanstack/react-query` from `apps/web`.**
  - Load one dataset (weapons) as a base atom from `@elden-ring-compass/data`; render its
    table from `useAtomValue` via a derived (search/sort) atom. Validate the pattern.
    **Delete the legacy weapons source** once it matches.
  - **Migrate Zustand → effect-atom:** convert the save-source + slot-selection stores to
    writable atoms (the save-parse atom then derives from the source atom directly, no
    bridge), then the table/inventory UI stores. Remove `zustand` from `apps/web` once no
    store remains (excluding the map store, owned by the tiled-map work).
- **Phase B — close extractor gaps:** add the new `er-extractor`/codegen stages the audit
  surfaced (event flags, regions/maps, stats/classes, spells stats, reinforcements,
  per-item icons, …). Also: `layer`/`category` on markers + **ItemLotParam → placements**.
- **Phase C — migrate + delete, dataset by dataset:**
  - Codegen emits `public/data/*.json` for the large datasets (+ types).
  - Migrate each table/section to atoms over the new data; **delete each legacy source as
    its replacement lands** (diff first — new BOSSES/GRACES/WEAPONS overlap legacy).
  - Lazy-fetch markers/placements into atoms; per-`[mapId, layer]` index atoms; wire the
    tiled map to toggleable layers. (Needs map projection, TASKS #4.)
  - **Delete `apps/web/src/assets/erdb/` (1.7 GB), `lib/erdb.ts`, `lib/map-db.ts`, and
    `lib/elden-ring-raw-db/`** once nothing imports them. Verify zero references remain.
- **Phase D — polish:** lazy/region-split loading, loading states, perf pass.

## Future (explicitly out of scope now)

User-owned mutable data (cached saves, favorites, saved builds, offline completion
tracking) is where IndexedDB would genuinely fit — revisit then, scoped to that data, under
an atom. Not part of this project.
