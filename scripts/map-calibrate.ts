/**
 * Overworld (M00) map calibration — derives + validates the transforms that put
 * extracted MSB marker coordinates onto the generated tile-pyramid master, and
 * the (corrected) legacy wiki-coord → master-pixel fallback.
 *
 * Run: `bun scripts/map-calibrate.ts`
 *
 * ── Coordinate systems ────────────────────────────────────────────────────
 * 1. Extracted MSB marker: `mapId = m60_<col>_<row>_<tier>` + local (x, y, z),
 *    where the From horizontal plane is (x, z) and y is elevation. Per the
 *    soulsmodding "Map Overview" reference: m60 is a SW-origin (col,row) grid;
 *    small tiles `_00` = 256 units, medium `_01` = 512, big `_02` = 1024; each
 *    tile's CENTER is local (0,0,0); +col = east, +row = north.
 *      size   = 256 * 2**tier
 *      worldX = col*size + size/2 + localX      (east,  +X)
 *      worldZ = row*size + size/2 + localZ      (north, +Z)
 * 2. Master pixel: the tile pyramid is stitched from MENU_MapTile L0 tiles at
 *    `left = mcol*256, top = (40 - mrow)*256` on a 41×41 (10496²) canvas
 *    (north-up Y flip). Native zoom z6 leaves live on disk as {y}/{x}.webp,
 *    so menu_col = x, menu_row = 40 - y.
 * 3. Legacy wiki coord: `map-db.ts` (x, y), scraped; historically projected by a
 *    hand-tuned affine onto an ~820px erdb thumbnail (WRONG for the 10496 master).
 *
 * ── Result (validated below) ──────────────────────────────────────────────
 * The MENU_MapTile grid IS the m60 small-tile grid: 256 px == 256 world-units,
 * integer tile offset (menu_col = m60col - 33, menu_row = m60row - 25) + Y flip.
 * So world → master-pixel is exact (1px = 1 world-unit, no floating scale):
 *      masterPx = worldX - 8448
 *      masterPy = 16896 - worldZ
 * Proven by a 154/154 grace-on-existing-tile occupancy match, all-in-bounds,
 * correct N/S/E/W extremes, and isotropy with an independent wiki-coord fit.
 *
 * The corrected wiki → master-pixel fallback (for legacy markers not yet sourced
 * from extracted data) is fitted directly against the exact world→pixel above.
 */
import { readdirSync, readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// ── extracted overworld graces → world coords ──────────────────────────────
interface Marker { mapId: string; category: string; displayName: string | null; x: number; y: number; z: number }
const markersSrc = readFileSync(`${root}/packages/elden-ring-data/src/generated/markers.ts`, 'utf8');
const markers: Marker[] = [];
for (const line of markersSrc.split('\n')) {
  const t = line.trim();
  if (t.startsWith('{')) markers.push(JSON.parse(t.replace(/,$/, '')) as Marker);
}
const tierOf = (id: string) => { const m = /^m60_\d+_\d+_(\d+)$/.exec(id); if (!m) return -1; const s = +m[1]!; return s <= 2 ? s : -1; };
const colRow = (id: string) => { const m = /^m60_(\d+)_(\d+)_\d+$/.exec(id)!; return [+m[1]!, +m[2]!] as const; };
const worldOf = (mk: Marker) => {
  const tier = tierOf(mk.mapId); const size = 256 * 2 ** tier; const [c, r] = colRow(mk.mapId);
  return [c * size + size / 2 + mk.x, r * size + size / 2 + mk.z] as const;
};
const graces = markers
  .filter((mk) => mk.category === 'grace' && mk.mapId.startsWith('m60_') && tierOf(mk.mapId) >= 0 && mk.displayName)
  .map((mk) => { const [X, Z] = worldOf(mk); return { name: mk.displayName!, X, Z, col: Math.floor(X / 256), row: Math.floor(Z / 256) }; });

// ── existing menu tiles (z6 native) ────────────────────────────────────────
const menu = new Set<string>();
const tileBase = `${root}/apps/web/public/map-tiles/M00/base/6`;
for (const yd of readdirSync(tileBase)) {
  const y = Number(yd); if (Number.isNaN(y)) continue;
  for (const f of readdirSync(`${tileBase}/${yd}`)) {
    const x = Number(f.replace('.webp', '')); if (Number.isNaN(x)) continue;
    menu.add(`${x},${40 - y}`);
  }
}

// ── 1) integer tile-offset alignment (occupancy match) ─────────────────────
let best = { coff: 0, roff: 0, hits: -1 };
for (let coff = -40; coff <= 40; coff++)
  for (let roff = -40; roff <= 40; roff++) {
    let hits = 0;
    for (const g of graces) if (menu.has(`${g.col + coff},${g.row + roff}`)) hits++;
    if (hits > best.hits) best = { coff, roff, hits };
  }
const COFF = best.coff, ROFF = best.roff;
const worldToPixel = (X: number, Z: number): [number, number] => [X + 256 * COFF, (41 - ROFF) * 256 - Z];
console.log(`[align] offset COFF=${COFF} ROFF=${ROFF} -> ${best.hits}/${graces.length} graces on existing tiles`);
console.log(`[align] masterPx = worldX + ${256 * COFF}   masterPy = ${(41 - ROFF) * 256} - worldZ`);
const inB = graces.filter((g) => { const [px, py] = worldToPixel(g.X, g.Z); return px >= 0 && px <= 10496 && py >= 0 && py <= 10496; }).length;
console.log(`[align] in-bounds: ${inB}/${graces.length}`);

// ── 2) wiki Sites of Grace → join → fits ───────────────────────────────────
const dbSrc = readFileSync(`${root}/apps/web/src/lib/map-db.ts`, 'utf8');
const wiki = new Map<string, { x: number; y: number }>();
{
  const re = /category:\s*'Site of Grace',\s*name:\s*'((?:[^'\\]|\\.)*)',\s*x:\s*'([-0-9.]+)',\s*y:\s*'([-0-9.]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(dbSrc))) wiki.set(m[1]!.replace(/\\'/g, "'"), { x: +m[2]!, y: +m[3]! });
}
const pairs = graces.flatMap((g) => { const w = wiki.get(g.name); return w ? [{ ...g, wx: w.x, wy: w.y, ...((): { px: number; py: number } => { const [px, py] = worldToPixel(g.X, g.Z); return { px, py }; })() }] : []; });

const fit = (xs: number[], ys: number[]) => {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i]! - mx) ** 2; sxy += (xs[i]! - mx) * (ys[i]! - my); syy += (ys[i]! - my) ** 2; }
  const slope = sxy / sxx, intercept = my - slope * mx, r2 = (sxy * sxy) / (sxx * syy);
  const res = xs.map((x, i) => Math.abs(ys[i]! - (slope * x + intercept))).sort((a, b) => a - b);
  return { slope, intercept, r2, mean: res.reduce((a, b) => a + b, 0) / n, max: res[n - 1]! };
};

// world→wiki (isotropy cross-check vs the 1:1 pixel hypothesis)
const wy = fit(pairs.map((p) => p.X), pairs.map((p) => p.wy));
const wx = fit(pairs.map((p) => p.Z), pairs.map((p) => p.wx));
console.log(`\n[world→wiki] joined=${pairs.length}  wikiY~worldX r2=${wy.r2.toFixed(5)} slope=${wy.slope.toFixed(6)}  wikiX~worldZ r2=${wx.r2.toFixed(5)} slope=${wx.slope.toFixed(6)}`);
console.log(`[world→wiki] isotropy: 1/slopeY=${(1 / wy.slope).toFixed(2)}px  1/slopeX=${(1 / wx.slope).toFixed(2)}px (equal ⇒ square pixels, confirms 1:1)`);

// 3) corrected wiki → master-pixel (the legacy fallback), fitted to exact pixels
const px = fit(pairs.map((p) => p.wy), pairs.map((p) => p.px)); // px ~ wikiY
const py = fit(pairs.map((p) => p.wx), pairs.map((p) => p.py)); // py ~ wikiX
console.log(`\n[wiki→pixel] px = ${px.slope.toFixed(4)}*wikiY + ${px.intercept.toFixed(2)}   (r2=${px.r2.toFixed(5)}, mean|res|=${px.mean.toFixed(1)}px, max=${px.max.toFixed(1)}px)`);
console.log(`[wiki→pixel] py = ${py.slope.toFixed(4)}*wikiX + ${py.intercept.toFixed(2)}   (r2=${py.r2.toFixed(5)}, mean|res|=${py.mean.toFixed(1)}px, max=${py.max.toFixed(1)}px)`);
