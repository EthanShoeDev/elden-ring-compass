# Map Tile Fragments & World-State Variants

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

| map | tiles (exists) | bits | notes |
|-----|----------------|------|-------|
| M00 overworld   | 2218 | **21** | 20 fragment bits (55–429 tiles each) + **`0x4000` = 3 tiles = the Starfall meteor crater (event)** |
| M01 underground | 694  | **5**  | 5 underground fragments; no events |
| M10 DLC         | 798  | **5**  | DLC fragments |
| M11 DLC underground | 0 | 0 | base-only (no revealable fragments) |

Event bits (excluded from the default "vanilla" map): **M00 `0x4000`** (crater)
is confirmed. Possible refinement: an Ashen-Capital-Outskirts state may exist as
a region-sized bit (indistinguishable from a fragment by tile-count alone) — TBD.

## Plan — make it an extraction stage

### Phase 1 — detailed default map (vanilla, all fragments) ✅ this work

In `game/images.ts` (stage `7-images`), replace the `BASE_LAYER` filter with:

1. Parse `71_maptile.mtmskbnd.dcx` → per-map bit taxonomy + event-bit set
   (`game/map-mask.ts`).
2. Per `(map, lod, col, row)`: from the on-disk L0 variants, drop any with an
   event bit set, pick **max popcount** (tie-break max value) → the vanilla
   all-fragments tile. Fall back to `00000000` if only base exists.
3. Composite + regenerate the power-of-2 pyramid as today (one `base` layer).
4. Emit fragment metadata into `manifest.json`: per map, the fragment bits, the
   event bits, and per-tile `{ fullMask, selectedVariant }` (drives Phase 2).

### Phase 2 — save-driven "collected maps" toggle (user-requested)

Render the map as the game does, from the user's *currently collected* fragments.

- Shipping every bit-combo tile (28k entries → hundreds of MB) is infeasible for a
  static site. Instead extract, **per fragment bit**, the *delta region it
  reveals* as a transparent overlay pyramid; the client composites
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
