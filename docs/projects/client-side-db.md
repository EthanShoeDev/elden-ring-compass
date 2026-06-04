# Client-side data layer revamp

> Status: **committed to the stack** (2026-06-02). Reversible if it doesn't pan out.
> Goal: revamp how the web app stores, queries, and renders game data so we get
> first-class search / sorting / querying, and cleanly wire up the new
> `@elden-ring-compass/data` package (extractor output) to the UI.
> **Equally central goal:** make `packages/er-extractor` → `packages/elden-ring-data`
> the _single source of truth_ for all game data + images, and **delete every legacy
> data source** (erdb-derived TS, the 1.7 GB erdb assets, hand-authored tables).
>
> **Progress (2026-06-03):** Phase A foundation done — effect-atom adopted, React Query
> ripped out, save-parse is an `AsyncResult` atom, **all Zustand stores migrated and
> `zustand` removed**, weapons wired as the reference dataset. **Phase C teardown DONE
> (commit `2cee32e3`):** the web app is rewired off all three legacy data layers onto
> `@elden-ring-compass/data`, and **`lib/elden-ring-raw-db/`, `lib/erdb.ts`, and the 1.7 GB
> `assets/erdb/` are deleted.** vm inventory/equipment/stats, events (GRACES+BOSSES+MAP_FRAGMENTS
> via `eventFlagOffset()`), regions, share encode/decode, and the inventory catalog all read
> from the new datasets; per-item + boss-portrait icons come from the package via `import.meta.glob`.
> **Only one legacy source remains: `lib/map-db.ts`** (1.2 MB, 8 importers) — intentionally
> retained, gated on the map-coordinate subsystem: **#9 marker classification ✅ done**,
> **#15 parser runtime-verify ✅ done**, **#10 enemy/boss placements ✅ done** (7,700 rows), and
> **#10b map-treasure placements ✅ done** (3,661 rows via MSB `Treasure` events — `PLACEMENTS`
> now 11,361 rows). Remaining: **web migration** (rewire `map-db.ts`'s consumers onto the new
> datasets, then delete it) + **#4 calibration generalization** (overworld local→unified tile
> coords for rendering). Phase D polish still open.

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
- **Zustand → effect-atom: ✅ DONE (2026-06-02).** All Zustand stores are replaced with
  writable atoms so reactive state is one effect-native layer, and **`zustand` is removed from
  `apps/web` + the catalog**. Migrated: save source (`Atom.writable` over an `Atom.kvs`-persisted
  url + a transient source atom), slot selection (`Atom.kvs` slot-by-steam-id memory), the
  table UI config store (`data-table-store.ts` → `Atom.kvs` keyed `data-table-state`), and the
  inventory table-selection store (`Atom.kvs` keyed `inventory-table-selection`). Persisted
  stores use `Atom.kvs` for schema-backed localStorage — never raw localStorage. (No Zustand map
  store ever existed; the tiled map keeps local React state.)

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

| Path                                                                | What it is                                                                                                           | Replacement                                            | Status                                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/elden-ring-raw-db/` (24 `.ts`)                    | erdb-derived static arrays (WEAPONS, ARMORS, TALISMANS, BOSSES, GRACES, names, EVENT_FLAGS, REGIONS, MAPS, STATS, …) | `@elden-ring-compass/data` generated tables            | ✅ **DELETED** (`2cee32e3`)                                                                    |
| `apps/web/src/assets/erdb/` (**1.7 GB**: `json/`, `icons/`, `map/`) | erdb JSON dumps + item icons + map images                                                                            | generated JSON + `elden-ring-data/images/` (WebP, LFS) | ✅ **DELETED** (`2cee32e3`)                                                                    |
| `apps/web/src/lib/erdb.ts`                                          | loader for the erdb JSON assets                                                                                      | atom loaders over the new datasets                     | ✅ **DELETED** (`2cee32e3`) → `inventory-catalog.ts`                                           |
| `apps/web/src/lib/map-db.ts` (1.2 MB)                               | item drop locations keyed by name                                                                                    | `placements` dataset (ItemLotParam stage)              | ⏳ **RETAINED** — last legacy source; gated on map subsystem (#9 ✅; #4/#10 + web wiring left) |

`apps/web/src/lib/vm/*` (equipment, events, inventory, regions, stats) are **rewired, not
deleted** — they keep joining save data to game data, just sourced from the new package.

### ⚠️ Deletion is GATED ON PARITY — the extractor must cover what the app uses

> **The field-level parity audit is done — see [`data-parity-audit.md`](./data-parity-audit.md)**
> (task #11). It traces every legacy importer, diffs against the new package, and lists the
> exact `er-extractor` output each legacy source needs before deletion. The summary below is
> kept; the audit is the authoritative, verified version.

`elden-ring-data` now emits: graces, bosses, weapons, armor, talismans, goods, ashes-of-war,
arts, markers, **archetypes, event-flags (`eventFlagOffset()`), map-fragments, regions, spells,
spirit-ashes**. Each legacy file was deleted **only after** the new packages produced an
equivalent (verified by diff). The **coverage gaps the audit surfaced are now CLOSED** — what
was once a gap list is the changelog below (see [`data-parity-audit.md`](./data-parity-audit.md)):

- ✅ **Event flags** (full set) → `event-flags.ts` `eventFlagOffset()`, verified 1178/1178.
- ✅ **Regions / map fragments** → `regions.ts` (install-derived) + `map-fragments.ts` (coarse
  names; fine wiki labels dropped). `MAP_NAMES`/`MAPS` folded in.
- ✅ **Archetypes** → `archetypes.ts`. `STATS`/`STARTING_CLASSES` were dead → deleted, no replacement.
- ✅ **Spells stats** → `spells.ts`; **spirit ashes** → `spirit-ashes.ts`; **ammo + gestures**
  distinguishable via `category` on weapons/goods. **Cookbooks/whetblades** re-mechanism'd via
  save inventory ownership; **summoning pools / colosseums** dropped (placeholder/3-hardcoded).
- ✅ **Per-item icons** — 2939 `images/icons/items/{iconId}.webp` emitted; boss portraits via
  remembrance-item icons. `assets/erdb/icons/` deleted.

The **only remaining gap** is the map-coordinate subsystem (#4/#9/#10 + ItemLotParam placements),
which gates `map-db.ts`. Deleting `assets/erdb/` (1.7 GB) was also a major repo-size win.

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

- **effect-atom ≠ IndexedDB.** The reactive querying we want comes from _atoms_, not from
  storage. Atoms work over in-memory data directly.
- **Our data is the wrong shape for a DB win.** It's static, read-only, regenerated by the
  extractor, and fits in memory (~6 MB JSON → tens of MB resident). IndexedDB's real wins —
  persistence of _mutable user-owned_ data, datasets too big for RAM, offline-first sync,
  Blob storage — don't apply.
- **It's bad at relational.** IndexedDB has no joins/SQL; relational queries read into
  memory and join in JS anyway. In-memory is both simpler and _faster_ for full-table work
  (a JS `.filter()` over 24k rows is ~1–5 ms, sync; IndexedDB reads are async + clone
  overhead).
- **It adds real cost:** schema, migrations, version/manifest hashing, fill orchestration —
  all for a read-only cache.

**When IndexedDB _would_ earn its place (future, not this project):** user-owned, durable,
mutable data — e.g. cached/imported **save files** (binary blobs), **favorites / saved
builds**, an offline **completion checklist**, personal annotations. Those are the textbook
fit. If we build such features, revisit IndexedDB _for that data only_ — it slots under an
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

| dataset                            | size   | rows   | delivery                                                        |
| ---------------------------------- | ------ | ------ | --------------------------------------------------------------- |
| markers.ts                         | 4.7 MB | 24,387 | static JSON in `public/`, fetched lazily into memory (map open) |
| weapons.ts                         | 548 KB | 3,333  | static JSON, fetched lazily into memory                         |
| armor.ts                           | 287 KB | 768    | static JSON, fetched lazily into memory                         |
| goods.ts                           | 240 KB | 2,177  | static JSON, fetched lazily into memory                         |
| graces/bosses/talismans/arts/ashes | ≤50 KB | small  | bundle from the package (trivial)                               |

Images: 388 MB in Git LFS (`images/`) — separate concern, served as static files / CDN.

## Map design (resolved 2026-06-02)

The tiled map is **multi-layer** — the user can toggle independent layers (enemies,
bosses, NPCs, items, graces, regions, …). Not an item-drop-only map. Consequences:

- **Markers stay a full, rich entity dataset.** The MSB marker set (24k world entities)
  is the backbone. ✅ **#9 DONE (extractor):** each marker now carries a derived **`category`**
  - an English **`displayName`** so the UI can toggle layers and label entities. Classification
    is a _join_, computed in `er-extractor` (`game/marker-classify.ts`, stage 6):
  * **npc** ← Enemy/DummyEnemy part with `npcParamId → NpcParam.nameId → NpcName` (485 named
    characters); **enemy** ← the rest (generic mobs, no name)
  * **grace** ← `entityID` ∈ `GRACES.bonfireEntityId` (439 markers, 100% join → graces get coords)
  * **asset / player / collision / map-piece** ← Part subtype; region subtypes →
    `map-point` / `spawn-point` / `summon-point` / `play-area` / `invasion-point` / `connection`
    (the rest collapse to `region`)
  * bosses are NOT marker-tagged — the boss layer comes from the `BOSSES` dataset (own coords)
  * **Still pending:** wiring these categories to toggleable map layers in the web (Phase C),
    and #4 calibration so they render in the right pixel positions.
- **Item tables stay definition-only (no coords).** Weapons/goods/armor remain stat
  tables keyed by id. The "items" map layer is a **separate world-placement dataset** that
  references item ids by id — NOT coordinates bolted onto item rows. (`markers` =
  entities; item _placements_ = a different source — see below.)
- **Item placements = new extractor stage (#10).** Source = **`ItemLotParam`**
  (`ItemLotParam_map` + `ItemLotParam_enemy`), authoritative & derived-from-install.
  Decoded by `game/item-lots.ts` (8-slot `ITEMLOT_PARAM_ST`: itemId, category→`itemType`,
  quantity, `chance`, `getItemFlagId`). Linkage to world coords splits in two:
  - ✅ **enemy / boss drops — DONE (`game/placements.ts`, stage 7).** Fully static:
    `marker.npcParamId → NpcParam.itemLotId_enemy → ItemLotParam_enemy`, joined to the enemy
    marker's coords. **7,700 placements** across 354 maps (bosses are enemy markers, so their
    unique drops are covered). Emitted as the `PLACEMENTS` dataset.
  - ✅ **map treasure — DONE (#10b, `formats/msb.ts` + `game/placements.ts`).** The link is the
    **MSB `Treasure` event** (`EVENT_PARAM_ST`, `EventParam.cs` `Event.Treasure`): each names a
    placed Part (`TreasurePartIndex` → the chest/item `AEG099_*` asset, which carries world coords)
    and an `ItemLotParam_map` row (`ItemLotID`). Fully static, no EMEVD needed. **3,831 treasure
    events → 3,661 map placements** (goods 3201, weapon 258, talisman 116, armor 68, ash-of-war 13;
    761 in-chest / 3070 on-ground; 95% of lots resolve). **`PLACEMENTS` is now 11,361 rows** (enemy
    7,700 + map 3,661); `source: 'enemy' | 'map'`, `npcParamId: number | null`.
    **EMEVD was ruled out** (verified by scout): scripts reference only ~220 of ~5,400 map lots, and
    `Set Asset Treasure State` (2005,4) carries no lot id — the earlier "asset-treasure event-flow"
    hypothesis was wrong. The EMEDF layer (`formats/emedf.ts`) remains for the quest compass.

  `map-db.ts` is NOT used; its deletion now waits only on the web migration + #4 calibration
  (overworld local→unified tile-coord conversion for rendering).

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
  - **Migrate Zustand → effect-atom: ✅ DONE.** Save-source + slot-selection stores converted
    to writable atoms (the save-parse atom derives from the source atom directly, no bridge),
    then the table + inventory UI stores. `zustand` removed from `apps/web` + the catalog.
- **Phase B — close extractor gaps:** ✅ mostly done — event flags, regions/maps, stats/classes,
  spells stats, per-item icons, **✅ `category`/`displayName` on markers (#9)**,
  **✅ enemy/boss `PLACEMENTS` (#10)**. Remaining: **#10b map-treasure placements (EMEVD)** and
  **#4 calibration generalization**.
- **Phase C — migrate + delete, dataset by dataset:** ✅ **MOSTLY DONE (`2cee32e3`).**
  - Migrate each table/section to atoms over the new data; **delete each legacy source as
    its replacement lands** (diff first — new BOSSES/GRACES/WEAPONS overlap legacy). ✅ done
    for inventory/equipment/stats/events/regions/share + the inventory catalog.
  - ✅ **Deleted `apps/web/src/assets/erdb/` (1.7 GB), `lib/erdb.ts`, and
    `lib/elden-ring-raw-db/`** — nothing imports them.
  - ⏳ **Remaining:** lazy-fetch markers/placements into atoms; per-`[mapId, layer]` index
    atoms; wire the tiled map to toggleable layers (needs map projection, #4). **Delete
    `lib/map-db.ts`** once the map subsystem (#4/#9/#10) replaces it and nothing imports it.
- **Phase D — polish:** lazy/region-split loading, loading states, perf pass.

## Future (explicitly out of scope now)

User-owned mutable data (cached saves, favorites, saved builds, offline completion
tracking) is where IndexedDB would genuinely fit — revisit then, scoped to that data, under
an atom. Not part of this project.
