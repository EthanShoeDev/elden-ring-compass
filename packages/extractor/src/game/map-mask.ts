import { Data, Effect } from 'effect';

import { type Bnd4Error, parseBnd4 } from '../formats/bnd4.ts';
import { type DcxError, dcxDecompress, isDcx } from '../formats/dcx.ts';
import type { OodleError } from '../external/oodle.ts';

/**
 * Map-tile world-state model.
 *
 * Every map tile's filename ends in `…_{variant}` where `variant` is a **32-bit
 * hex bitmask**, not a fixed layer id. Each set bit ≈ a collected **map fragment**
 * for a region (or a **world-event state**). `00000000` = nothing collected = the
 * dark, fully-undiscovered tile; the per-tile full mask (all bits) = the
 * fully-revealed detailed map. The game ships a pre-rendered tile for each
 * reachable bit-combination and picks the one matching the player's fragments.
 *
 * The authoritative per-tile masks live in `menu/71_maptile.mtmskbnd.dcx`: a
 * DCX'd BND4 of four `MENU_MapTile_M{NN}.mtmsk` XML files
 * (`<MapTileMaskList>` of `<MapTileMask exists id mask/>`). Long runs of identical
 * masks across contiguous tiles show the bits are regional/global (a stable
 * bit→fragment mapping), not per-tile-local. See `docs/projects/map-tile-fragments.md`.
 */

export class MapMaskError extends Data.TaggedError('MapMaskError')<{
  readonly detail: string;
}> {}

/**
 * World-event bits to EXCLUDE from the default "vanilla" all-fragments map: they
 * encode late-game world states, not collected map fragments. Keyed by map id.
 *   - M00 `0x4000`: the Starfall meteor crater (East Limgrave / Fort Haight) —
 *     only 3 tiles, a clear outlier vs the 55–429-tile fragment bits.
 * (An Ashen-Capital-Outskirts state may also exist as a region-sized bit; it is
 * not separable by tile-count alone and is left in for now — see the project doc.)
 */
export const EVENT_BITS: Record<string, number> = {
  M00: 0x4000,
};

/** One parsed `<MapTileMask>`: a tile's full reveal bitmask. */
export interface TileMask {
  readonly id: number;
  readonly exists: boolean;
  readonly mask: number;
}

export interface MapMask {
  readonly map: string; // "M00"
  readonly tiles: ReadonlyArray<TileMask>;
  /** distinct map-fragment bits (event bits removed), low→high. */
  readonly fragmentBits: ReadonlyArray<number>;
  /** world-event/state bits present for this map. */
  readonly eventBits: ReadonlyArray<number>;
  /**
   * L0 per-cell full reveal mask, keyed `"col_row"` (only `exists` tiles). The
   * mask `id` encodes `lod*10000 + col*100 + row` (erdb `sourcer.py`), so
   * `col = (id%10000)/100`, `row = id%100`. A cell's fully-revealed tile is the
   * on-disk variant whose `code === mask`.
   */
  readonly cellMasks: ReadonlyMap<string, number>;
}

const MASK_RE = /<MapTileMask exists="(\d)" id="(\d+)" mask="(\d+)"\/>/g;
const MAP_RE = /MENU_MapTile_(M\d{2})/;

const baseName = (n: string | null): string => {
  const norm = (n ?? '').replace(/\\/g, '/');
  return norm.slice(norm.lastIndexOf('/') + 1);
};

/**
 * Parse `71_maptile.mtmskbnd.dcx` into per-map fragment/event taxonomy. Returns a
 * `Map<mapId, MapMask>`. Errors propagate via the typed channel; on a missing or
 * undecodable binder the caller can fall back to deriving bits from on-disk variants.
 */
export const parseMapMasks = (
  mtmskbndBytes: Uint8Array,
  oo2corePath: string,
): Effect.Effect<
  Map<string, MapMask>,
  MapMaskError | Bnd4Error | DcxError | OodleError
> =>
  Effect.gen(function* () {
    const bnd = isDcx(mtmskbndBytes)
      ? yield* dcxDecompress(mtmskbndBytes, oo2corePath)
      : mtmskbndBytes;
    const entries = yield* parseBnd4(bnd);

    const out = new Map<string, MapMask>();
    for (const e of entries) {
      const m = MAP_RE.exec(baseName(e.name));
      if (!m) continue;
      const map = m[1];
      if (map === undefined) continue;
      const xml = new TextDecoder().decode(e.bytes);
      const tiles: TileMask[] = [];
      const allBits = new Set<number>();
      const cellMasks = new Map<string, number>();
      MASK_RE.lastIndex = 0;
      let mm: RegExpExecArray | null;
      while ((mm = MASK_RE.exec(xml))) {
        const id = Number(mm[2]);
        const exists = mm[1] === '1';
        const mask = Number(mm[3]) >>> 0;
        tiles.push({ id, exists, mask });
        if (!exists) continue;
        for (let b = 0; b < 32; b++) if (mask & (1 << b)) allBits.add(1 << b);
        if (Math.floor(id / 10000) === 0) {
          const coords = id % 10000;
          cellMasks.set(`${Math.floor(coords / 100)}_${coords % 100}`, mask);
        }
      }
      const eventBit = EVENT_BITS[map] ?? 0;
      const eventBits = [...allBits]
        .filter((b) => (b & eventBit) !== 0)
        .sort((a, b) => a - b);
      const fragmentBits = [...allBits]
        .filter((b) => (b & eventBit) === 0)
        .sort((a, b) => a - b);
      out.set(map, { map, tiles, fragmentBits, eventBits, cellMasks });
    }
    return out;
  });

/** popcount of a 32-bit value. */
export const popcount = (n: number): number => {
  let c = 0;
  let v = n >>> 0;
  while (v) {
    c += v & 1;
    v >>>= 1;
  }
  return c;
};

/**
 * From a tile's available on-disk variant bitmasks, pick the **vanilla
 * fully-revealed** one: drop any variant carrying an event bit, then take the
 * variant with the most fragment bits set (tie-break: largest value). Falls back
 * to `0` (fully-undiscovered base) when nothing else is available.
 */
export const pickVanillaVariant = (
  variants: ReadonlyArray<number>,
  eventMask: number,
): number => {
  let best = 0;
  let bestPop = -1;
  for (const v of variants) {
    if ((v & eventMask) !== 0) continue;
    const p = popcount(v);
    if (p > bestPop || (p === bestPop && v > best)) {
      best = v;
      bestPop = p;
    }
  }
  return best;
};
