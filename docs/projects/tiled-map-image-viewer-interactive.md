# Tiled, Interactive Map Viewer

## Original intent

Currently the big map section on the website uses a big 4k static image and we render
things on top of it. It might be better to make a tiled image map for bandwidth and load
speed. We recently made our own map tile exports and can stitch them together at build
time into bigger tiles, or whatever. We may also want different zoom levels at different
resolutions.

---

## Findings (current state)

- **The problem:** `apps/web/src/components/sections/interactive-map.tsx` loads one
  **18.6 MB JPEG** (`@/assets/erdb/map/lod_0.jpeg`) for the overworld + a 3 MB underground
  JPEG. Both download in full, upfront, before anything renders.
- Rendered in **`react-zoom-pan-pinch`**; pins are absolutely positioned via hand-calibrated
  magic constants (`bx/by/dx/dy` in `MapDbWidget`, ~L331–344) plus a custom `BetterKeepScale`
  that re-applies `1/scale` on every transform. Fragile and tied to the current image's pixel
  size.

### New tile exports — `packages/elden-ring-data/images/map-tiles/`

- **28,469 files, 354 MB, all 256×256 WebP.** Naming: `MENU_MapTile_M{map}_L{lod}_{col}_{row}_{layer}.webp`
- **4 maps:** `M00` overworld (Lands Between), `M01` underground, `M10` DLC (Land of Shadow),
  `M11` DLC underground.
- **5 LODs** `L0`–`L4` (L0 = highest detail).
- The 8-hex suffix is a **layer bitfield** — `00000000` is the base map; others (`0x01`, `0x08`,
  `0x80`, `0x400`…) are elevation/floor overlay layers (the in-game map height slider).
  **Base layer alone is ~29 MB** across all maps/LODs (M00 ≈ 20 MB, M10 ≈ 9 MB).
- See the [Nexus "Map Assembly" article](https://www.nexusmods.com/eldenring/articles/79) for
  the authoritative naming/stitching reference.

### Why we regenerate a clean pyramid (don't ship the native LODs)

The game LODs are **not a power-of-2 pyramid** (M00): native widths 10496 / 7936 / 2816 /
1536 / 768 px — ratios 1.32× / 2.82× / 1.83× / 2×. Shipping these as-is (via a custom Leaflet
CRS with an explicit `resolutions[]`) is *possible*, but it's **suboptimal for web**:

- **Uneven zoom feel.** Between native levels Leaflet upscales the nearer tile; the 2.82×
  L1→L2 gap means the most-zoomed-out part of that range is visibly blurry.
- **Wasted bytes.** L0 (10496) and L1 (7936) are nearly the same resolution — L1 is ~7.5 MB of
  near-redundant tiles.
- **Off the beaten path.** A custom CRS works but means no `rastercoords`, hand-rolled marker
  projection, and a `LayersControl` that has to juggle 4 maps with different odd grids.

A **clean power-of-2 pyramid generated from L0** wins on essentially every axis — smoother
zoom (max 2× upscale between levels), standard `CRS.Simple`+`rastercoords`, *and it's smaller*
(it drops the redundant L1). Because every game tile is 256-aligned, each map's L0 is an exact
multiple of 256 (M00 = 41×256 = 10496², M11 = 34×256 × 21×256), so the master stitches and
re-tiles with **zero edge padding**.

Optimal M00 pyramid (`tileSize: 256`, `maxNativeZoom = ceil(log2(10496/256)) = 6`):

| zoom | px     | tiles | source                    |
| ---- | ------ | ----- | ------------------------- |
| 6    | 10496  | 41×41 | = L0 (reused, no resample)|
| 5    | 5248   | 21×21 | downsample                |
| 4    | 2624   | 11×11 | downsample                |
| 3    | 1312   | 6×6   | downsample                |
| 2    | 656    | 3×3   | downsample                |
| 1    | 328    | 2×2   | downsample                |
| 0    | 164    | 1×1   | downsample                |

≈ 2,293 tiles vs 2,808 native — fewer *and* sharper. Initial view (~760px container) lands at
z2–z3 = **9–36 tiny tiles**. (Allow `maxZoom: 8` while `maxNativeZoom: 6` so users can
over-zoom for pin precision; Leaflet just upscales z6.)

---

## Recommended architecture

**`react-leaflet` v5 + `CRS.Simple` + `leaflet-rastercoords` over a clean power-of-2 pyramid
that the extractor generates from L0 with `sharp.tile({ layout: 'google' })`. Tiles + a
manifest served from `apps/web/public/`. Markers are declarative React components driven off
the Zustand selection state, inside one client-only (SSR) boundary.**

### Why each choice

- **Engine: Leaflet, not custom RZPP code.** Leaflet's `tileLayer` *is* the tile cull/cache/
  recycle loop — only visible tiles load. Initial paint goes from 18.6 MB → ~tens of KB.
  `react-leaflet` **v5** supports React 19 (peer dep), so version lag is no longer a blocker.
- **Power-of-2 pyramid from L0 via `sharp` (DECIDED).** `Bun.Image` can't do this (it has
  resize/encode but **no `composite`/`extract`** — it's a single-image pipeline), and the game
  LODs are suboptimal for web (see above). `sharp` does the whole job: stitch the 41×41 L0 grid
  into a master, then `sharp(master).webp({quality}).tile({ size: 256, layout: 'google' })`
  emits a standard `{z}/{x}/{y}.webp` pyramid (downsample + slice + name) in one call. libvips
  streams gigapixel images, so the 10496² master is no problem. Pairs directly with
  `rastercoords` (both compute `maxZoom = ceil(log2(maxDim/256))` identically).
- **Marker placement via `rastercoords`.** `rastercoords.js` is 90 lines; projection is
  `map.unproject([px,py], maxZoom)`. Markers placed by L0-pixel coordinate stay glued through
  zoom/pan — deletes `BetterKeepScale` + `handleTransformStyles`.
- **Serve from `public/`, do NOT statically `import` tiles.** A tile map's whole point is
  lazy per-URL fetch. Static-importing ~2,800 tiles pulls every one into Vite's module graph
  (huge build, no laziness). Instead the build emits
  `apps/web/public/map-tiles/{map}/{z}/{x}/{y}.webp` (Vite copies `public/` verbatim;
  predictable URLs are exactly what `L.tileLayer('/map-tiles/...')` wants). Build step lives in
  `@elden-ring-compass/data`; output lands in `public/`.
- **SSR boundary.** TanStack Start renders server-side; Leaflet touches `window` at import →
  `window is not defined`. Fix: the map lives behind one `<ClientOnly>` / lazy `import()`
  boundary so it never renders on the server. One wrapper, not a pervasive tax.
- **Marker layer: `react-leaflet` (DECIDED).** Markers are declarative `<Marker>`/`<Popup>`
  components, driven straight off `tableState` selection (Zustand) — no imperative
  `LayerGroup` sync, no `useEffect` plumbing, JSX popups reuse existing React components.
  Performance escape hatches if hundreds of pins get heavy: `react-leaflet-cluster`
  (clustering, already React-19 ready), or drop to imperative for one hot layer via the
  `useMap()` hook without leaving the react-leaflet tree. Requires `react-leaflet` v5 +
  `leaflet` ^1.9 + `@react-leaflet/core` ^3.

### The one transform that survives

rastercoords handles **pixel→screen**. Pins are in **game-world** coords (`item.x/item.y`),
so a single **world→pixel affine** remains (what `bx/by/dx/dy` encode today). Derive it once
from known anchors (Isolated Divine Tower reference already in `MapDbWidget`), document it,
unit-test it. Then: `world → (affine) → pixel → rc.unproject() → L.marker`.

---

## Extractor output (IMPLEMENTED — `er-extractor` → `@elden-ring-compass/data`)

Implemented in `packages/er-extractor/src/game/map-pyramid.ts` (the builder) +
`game/images.ts` (archive read → group → decode → build → manifest). `sharp@0.34.5` installs
cleanly under Bun on Windows via the prebuilt libvips binary (`bun add sharp`, no build step).

Per `(map, layer)`, for **L0 only** (the game's L1–L4 are discarded and regenerated cleaner):

1. **Decode L0** — Rust BCn→PNG per tile (unchanged; the lazy-slice loop over the 1.25 GB
   `.tpfbdt` stays).
2. **Composite onto one canvas** — every map tiles into the SAME `10496²` (41×41) transparent
   canvas via `sharp({create:{…alpha:0}}).composite([{ input, left: col*256, top: row*256 }])`.
   Uniform geometry across all maps/layers → **one world→pixel affine per world**, and the
   base map / crater / DLC all align pixel-for-pixel. (composite, not `join` — it handles
   sparse layers and non-zero origins without placeholder tiles.)
3. **Tile** — `…webp({quality, alphaQuality:100}).tile({ size:256, layout:'google',
   background:{alpha:0}, skipBlanks:0 })` → emits `images/map-tiles/{map}/{layer}/{z}/{y}/{x}.webp`.
   **`layout:'google'` names leaves `{z}/{y}/{x}`** (subdir = row, file = col — verified
   empirically), so the Leaflet URL template is `…/{z}/{y}/{x}.webp`. `skipBlanks:0` drops
   transparent tiles, so sparse overlays (the crater, M11) cost almost nothing. The `blank.png`
   helper google writes at the root is removed.
4. **Manifest** — one top-level `images/map-tiles/manifest.json`:
   ```json
   { "tileSize":256, "width":10496, "height":10496, "maxNativeZoom":6, "format":"webp",
     "tileUrlTemplate":"{map}/{layer}/{z}/{y}/{x}.webp",
     "maps":[ { "id":"M00", "name":"…", "worldToPixelAffine":null,
                "layers":[ {"id":"00000000","base":true,"tileCount":1681}, … ] }, … ] }
   ```
   `worldToPixelAffine` is `null` for now — calibrated during web integration (see below).
5. **Serve** — copy `@elden-ring-compass/data`'s `images/map-tiles/` into
   `apps/web/public/map-tiles/` so Leaflet fetches `/map-tiles/{map}/{layer}/{z}/{y}/{x}.webp`.

**Layer scope:** a module flag `EMIT_LAYERS: 'base' | 'all'` (default `'base'`) gates which
layers are emitted. `'base'` = the `00000000` base map for all 4 maps (the immediate need:
overworld + underground + DLC toggles). Flip to `'all'` to also emit the event/elevation
overlays — the crater is layer `00004000`, already present in the data — with no other code
change; the manifest enumerates whatever is emitted. A one-time cleanup removes the old flat
`MENU_MapTile_*.webp` files on first run.

Validated in isolation (synthetic tiles, no game archive): `parseTileName`, the composite→tile
→skipBlanks pipeline, z0–z6 generation, `{z}/{y}/{x}` naming, blank removal. Pending: a real
run against the game archive (DLL built, sharp installed) — produces a large data-package diff.

---

## Component design (react-leaflet)

- `<InteractiveMap>` — lazy/client-only wrapper (the SSR boundary) that renders
  `<MapContainer crs={L.CRS.Simple} minZoom={0} maxZoom={8}>`.
- A small `useMap()` child builds `RasterCoords` from the manifest `width/height` and exposes
  `unproject` + the world→pixel affine through context so marker components stay declarative.
- `<TileLayer url="/map-tiles/{map}/00000000/{z}/{y}/{x}.webp" noWrap maxNativeZoom={6} bounds={rc.getMaxBounds()}>`
  per game map (note `{z}/{y}/{x}` — google layout's order), switched via
  `<LayersControl.BaseLayer>` (replaces the overworld/underground toggle, adds DLC). Event
  overlays (the crater = layer `00004000`, etc.) become additional `<TileLayer>`s on the same
  geometry, toggled as overlays once `EMIT_LAYERS='all'`.
- Marker **groups** = graces / bosses / regions / items as `<LayersControl.Overlay>` +
  `<LayerGroup>`, each rendering `<Marker position={unproject(worldToPixel(item))}>` with a
  `<Popup>`. Populated from `useDataTableData(...)` + Zustand selection — maps 1:1 to today's
  "Discovered Graces / Completed Bosses / …" buttons.
- Popups reuse the existing `MapDbWidget` JSX (name / category / description HTML) directly —
  the main payoff of going declarative.
- If pin counts get heavy: wrap a group in `react-leaflet-cluster`.

---

## Migration steps (rough)

1. ~~Extend `er-extractor` images stage: L0 → composite → `sharp.tile` →
   `{map}/{layer}/{z}/{y}/{x}.webp` + `manifest.json`.~~ **DONE** (`game/map-pyramid.ts`).
   Remaining: run it against the game archive, then copy `images/map-tiles/` into
   `apps/web/public/map-tiles/`.
2. ~~Stand up a client-only `<MapContainer crs={CRS.Simple}>` + `RasterCoords` +
   `<TileLayer>`; confirm tiles + zoom/pan.~~ **DONE** — `apps/web/src/components/sections/`
   `leaflet-map.tsx` (the client-only react-leaflet map; rastercoords math inlined) +
   `map-section.tsx` (SSR boundary: mounted-guard + `React.lazy` so leaflet never loads on
   the server; fetches the manifest). All 4 maps wired as `<LayersControl.BaseLayer>`. Swapped
   into `routes/index.tsx` (replaces `<InteractiveMap>`). Tiles served from `public/map-tiles/`
   via `scripts/sync-map-tiles.ts` (gitignored copy from `@elden-ring-compass/data`, run by
   `dev`/`build`). **Blocked on visual confirm:** the index route 500s until the Rust→WASM
   save-parser is built (`bun run build:wasm-parser`, needs the Nix shell's cargo) — pre-existing,
   unrelated to the map.
3. ~~Derive & unit-test the world→pixel affine against known anchors.~~ **DONE** —
   `scripts/map-calibrate.ts` + `apps/web/src/lib/map-affine.ts`. The MENU_MapTile
   master grid IS the m60 small-tile grid (256 px == 256 world-units), so extracted
   overworld coords project EXACTLY: `masterPx = worldX − 8448`, `masterPy =
   16896 − worldZ` (1 px = 1 world-unit), where `worldX = col*size + size/2 + localX`,
   `size = 256*2^tier`. Proven by a 154/154 grace-on-existing-tile occupancy match +
   correct N/S/E/W extremes + isotropy. The **DLC (M10)** uses the SAME transform — the
   occupancy grid-search finds the same offset (−33,−25) for `m61`→M10 (59/59 DLC graces
   in-bounds); the tile suffix's last digit is the size-tier, the first digit an elevation
   layer (ignored for XZ). Pins carry precomputed master pixels + their master id (`MapPin`);
   `leaflet-map.tsx` `unproject`s and filters by the active map. **Follow-up:** legacy
   *dungeon* markers (~206 dungeon graces + ~106 dungeon bosses) need `WorldMapLegacyConvParam`
   to convert dungeon-local → overworld coords; and the extractor should emit
   `worldToPixelAffine` per map into the manifest (web uses the documented constants;
   manifest field stays `null`).
4. ~~Port marker groups from `interactive-map.tsx`.~~ **DONE** — ALL marker positions are now
   install-derived (`lib/vm/map-pins.ts`): `events.ts` attaches the overworld pixel for graces +
   field bosses; inventory item pins come from extracted `PLACEMENTS` (overworld treasure/drops);
   `map-section.tsx` builds master-tagged `MapPin[]`. **The scraped `map-db.ts` is DELETED** — no
   wiki coords anywhere. Regions no longer pin (they're areas; region pins were a scraped-only artifact).
5. ~~Add remaining maps (M01/M10/M11) as base layers.~~ **DONE** (all 4 in the manifest + switcher).
6. Delete `react-zoom-pan-pinch`, `lod_0.jpeg`, `underground_lod_0.jpeg`, `BetterKeepScale`,
   and `interactive-map.tsx` (kept for now as marker-wiring reference until step 4 lands).
7. (Later) elevation/overlay layers from the suffix bitfield (flip extractor `EMIT_LAYERS='all'`).

---

## Reference repos (cloned to `docs/cloned-repos-as-docs/`)

- **`leaflet-rastercoords/`** — the image-map-on-Leaflet technique. Read `rastercoords.js`
  (90 lines), `example/index.js` (full setup: `CRS.Simple`, `tileLayer('{z}/{x}/{y}')`,
  marker layers via `rc.unproject`), `example/createtiles.sh` (gdal2tiles invocation).
- **`interactive-game-maps-template/`** — full open-source *game* map framework: `map.js`
  (tile + marker-group + sidebar wiring), `map_utils.js`. Closest match to our feature set.
- **`react-leaflet/`** — React 19 bindings reference (if we go declarative for controls).

Alternative engine considered: **OpenSeadragon** (deep-zoom-image first). Stronger raw tile
handling, weaker marker/overlay story — not chosen because this app is marker-heavy.

## Open questions

- ~~native LODs vs re-pyramid~~ → **DECIDED: re-pyramid** (power-of-2, optimal for web).
- ~~`sharp` vs `gdal2tiles` vs Bun.Image~~ → **DECIDED: `sharp.tile({layout:'google'})`**
  (Bun.Image can't composite/slice; gdal2tiles is off-stack Python).
- ~~`react-leaflet` vs vanilla Leaflet~~ → **DECIDED: `react-leaflet` v5** (declarative markers).
- ~~`sharp` install under Bun~~ → **CONFIRMED**: `sharp@0.34.5` prebuilt libvips binary resolves
  on Windows x64 via `bun add sharp`, no build step. (`.tile()` is unsupported only on the
  Wasm build; the native prebuilt is fine.)
- ~~World→pixel affine~~ → **RESOLVED** for the overworld (M00): it's not a fitted floating
  affine at all — the menu grid equals the m60 small-tile grid, so `masterPx = worldX − 8448`,
  `masterPy = 16896 − worldZ` (1 px = 1 world-unit). See migration step 3 + `scripts/map-calibrate.ts`.
  Remaining: the same integer-offset derivation for the DLC master (M10, from `m61` tiles) — the
  occupancy grid-search in the calibration script generalizes directly (rerun against M10 tiles).
- Elevation/overlay layers (the suffix bitfield): structure is ready (`{map}/{layer}/…` + the
  `EMIT_LAYERS` flag); decide *which* overlays to ship and how the web app models each
  (exclusive base-alternate vs additive overlay) when we wire the crater/floor toggles.
