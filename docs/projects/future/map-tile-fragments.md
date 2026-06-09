# Map Tile Fragments & World-State Variants

> **Status (2026-06-05): Phase 1 SHIPPED · Phase 2 NOT STARTED → filed under `future/`.**
> **Phase 1** (the detailed, fully-revealed default map) is **done and live** — the `images`
> extraction stage selects each cell's fully-revealed variant via the `71_maptile.mtmskbnd`
> per-cell mask, the map renders north-up and colourful, and the marker affine is calibrated
> (see [[map-tile-variants]] and `complete/tiled-map-image-viewer-interactive.md`). **Phase 2**
> (save-driven "collected maps" toggle — composite `base + Σ overlays for the fragments the
player owns`) is **unstarted**: it needs per-fragment delta-overlay pyramids, a ~31-entry
> bit→"Map: <region>" item table, and world-event toggles. That's net-new feature work, so this
> doc lives in `future/` until it's picked up — nothing in-progress remains.

## Problem

The shipped web map was dark, flat, and detail-less — we were extracting the
**fully-undiscovered** map tiles. The original extractor hardcoded
`BASE_LAYER = '00000000'` and treated the tile-name suffix as a fixed "layer".

## The model (reverse-engineered 2026-06-02)

Map tiles live in `menu/71_maptile.tpfbhd` / `.tpfbdt` (28,469 entries). Tile
stems are:

```
MENU_MapTile_M{NN}_L{lod}_{col}_{row}_{variant}
```

`variant` is a **32-bit hex bitmask**, NOT a layer id. Each set bit ≈ a collected
**map fragment** for a region (or a **world-event state**). The game ships a
pre-rendered tile texture for every reachable bit-combination per tile, and at
runtime selects the variant matching the player's collected fragments.

- `00000000` (8,628 tiles, most common) = nothing collected → the dark tile.
- Per-tile **fully-revealed** state = the tile's full mask (all its bits set).
- **Selecting the max-fragment variant per tile yields the detailed, colorful
  in-game map** (verified: single-tile base-vs-max, then a whole-M00 stitch →
  blue Liurnia, green forests, red Caelid).

### Authoritative bit taxonomy — `menu/71_maptile.mtmskbnd.dcx`

A DCX'd BND4 of four XML files (`MENU_MapTile_M{NN}.mtmsk`,
`<MapTileMaskList>` of `<MapTileMask exists id mask/>`). `mask` is each tile's
**full bitmask** (fully-revealed state). Long runs of identical masks across
contiguous tiles prove **bits are regional/global, not per-tile-local** — so a
stable bit→fragment mapping exists.

Distinct bits per map (each region-sized bit = one map fragment):

| map                 | tiles (exists) | bits   | notes                                                                                              |
| ------------------- | -------------- | ------ | -------------------------------------------------------------------------------------------------- |
| M00 overworld       | 2218           | **21** | 20 fragment bits (55–429 tiles each) + **`0x4000` = 3 tiles = the Starfall meteor crater (event)** |
| M01 underground     | 694            | **5**  | 5 underground fragments; no events                                                                 |
| M10 DLC             | 798            | **5**  | DLC fragments                                                                                      |
| M11 DLC underground | 0              | 0      | base-only (no revealable fragments)                                                                |

Event bits (excluded from the default "vanilla" map): **M00 `0x4000`** (crater)
is confirmed. Possible refinement: an Ashen-Capital-Outskirts state may exist as
a region-sized bit (indistinguishable from a fragment by tile-count alone) — TBD.

## Plan — make it an extraction stage

### Phase 1 — detailed default map (vanilla, all fragments) ✅ this work

In `game/images.ts` (stage `7-images`), replace the `BASE_LAYER` filter with the
**erdb `sourcer.py` algorithm** (authoritative — it built the prod map):

1. Parse `71_maptile.mtmskbnd.dcx` → per-map bit taxonomy + **per-cell full mask**
   (`game/map-mask.ts`). The mask `id` encodes `lod*10000 + col*100 + row`.
2. Per L0 `(col,row)`: select the on-disk variant whose **`code === cellMask`**
   (the exact fully-revealed tile). **Skip** cells with no mask (map edge/ocean
   void) and cells whose mask carries an event bit (`0x4000` crater = out of
   bounds). NOT max-popcount — a popcount heuristic picks inconsistent reveal
   states per cell and produces a scrambled patchwork.
3. **Flip Y** when compositing: the game's row index increases _northward_
   (erdb pastes at `high_y - y`), so `top = (GRID-1 - row)·256`. Without this the
   whole map renders upside-down.
4. Regenerate the power-of-2 pyramid (one `base` layer); emit `fragmentBits` /
   `eventBits` per map into `manifest.json` (drives Phase 2).

Verified: produces the correct north-up, colourful, fully-revealed Lands Between
(snow Mountaintops top, red Caelid, blue Liurnia, green Limgrave). Note L0 is the
_colourful_ art; coarser LODs differ in style — see the LOD/colour note below.

> **LOD/colour:** we build the pyramid from **L0** only (then downsample). L0 is
> the colourful painted map. (Earlier confusion: a heavy downscale of an
> ocean-heavy region looked sepia — it isn't.) If a future need arises, the game
> also ships coarser LODs (L1/L2) with their own art for zoomed-out views.

> **Markers/affine:** ~~marker placement still needs recalibration~~ — **DONE**.
> The north-up flip (around the 41-tile master, GRID−1−row) means the menu master
> grid lands exactly on the m60 small-tile grid: `masterPx = worldX − 8448`,
> `masterPy = 16896 − worldZ` (1 px = 1 world-unit). See
> `docs/projects/tiled-map-image-viewer-interactive.md` step 3 + `scripts/map-calibrate.ts`.

### Phase 2 — save-driven "collected maps" toggle (user-requested)

Render the map as the game does, from the user's _currently collected_ fragments.

- Shipping every bit-combo tile (28k entries → hundreds of MB) is infeasible for a
  static site. Instead extract, **per fragment bit**, the _delta region it
  reveals_ as a transparent overlay pyramid; the client composites
  `base (undiscovered) + Σ overlays for collected fragments`. ~31 overlay sets
  total (21 + 5 + 5), far less than 4,620 combos.
- Need **bit → map-fragment item** so we can read possession from the save:
  derive each bit's tile cluster → region name → the "Map: <region>" goods item
  (the web save parser already exposes inventory/flags). ~31-entry table.
- World-event toggles (crater, Ashen, Rauh Unsealed) become explicit overlay
  switches on top.

### Reference

- Bit semantics: this doc + `[[map-tile-variants]]` memory.
- World/marker coords (separate namespace): soulsmodding "Map Overview" —
  overworld MSB maps `m60` (Lands Between) / `m61` (DLC), SW-origin (col,row).
