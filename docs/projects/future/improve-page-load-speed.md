# Improve page-load speed — split & lazy-serve the big datasets

> **Status (2026-06-05): FUTURE / PUNTED.** Carved out of `client-side-db.md` **Phase D**
> (which is otherwise complete — the data layer works, this is pure optimization). The app
> functions correctly today; this doc scopes a bundle-size + eager-work win, not a bug fix.
> Pick it up when initial page-load latency actually matters (e.g. a hosting/CDN move — see
> `move-hosting-to-cloudflare.md`).

## The problem

The design in `client-side-db.md` (the "Data delivery" + dataset-size tables) always intended
the **large** datasets to be served as **static JSON in `public/`, CDN-cached, and `fetch`ed
lazily into memory by the section that needs them**. That never got implemented — the app still
ships them the simple way: a **static bundled import**, projected in **top-level module-eval
loops**.

Concretely, `apps/web/src/lib/vm/map-pins.ts`:

```ts
import {
  BOSSES,
  GRACES,
  MAP_MARKERS,
  PLACEMENTS,
} from '@elden-ring-compass/data';

for (const mk of MAP_MARKERS) {
  /* project every marker to a master pixel */
}
const itemPinsByKey = (() => {
  for (const p of PLACEMENTS) {
    /* project every placement */
  }
})();
```

Two costs follow from this:

1. **Bundle bloat.** The big datasets are compiled into the **main JS bundle** instead of being
   fetched on demand:

   | dataset                        | size   | rows   |
   | ------------------------------ | ------ | ------ |
   | `markers.ts`                   | 4.7 MB | 24,387 |
   | `placements.ts` (`PLACEMENTS`) | —      | 11,361 |
   | `weapons.ts`                   | 548 KB | 3,333  |
   | `armor.ts`                     | 287 KB | 768    |
   | `goods.ts`                     | 240 KB | 2,177  |

   That's ~6 MB of static game data the browser downloads + parses **before first paint**, whether
   or not the user opens the map or a data table.

2. **Eager work at import.** The marker/placement → master-pixel projection runs in synchronous
   module-eval loops the instant `map-pins.ts` is imported — work done on every page load even for
   users who never open the map.

The inventory catalog (`inventory-catalog.ts`, which also statically imports the weapons/armor/
goods tables) has the same shape for the table sections.

## What "done" looks like

Make the design real — move the big datasets out of the bundle and load them on demand into
effect-atoms, with the map/table doing the projection lazily.

1. **Serve as static JSON.** Emit (or copy) `markers` / `placements` / `weapons` / `armor` /
   `goods` as JSON files under `apps/web/public/` (CDN-cacheable), instead of bundling the `.ts`
   arrays. Keep the small datasets (graces, bosses, talismans, arts, ashes — all ≤50 KB) bundled;
   they're trivial.
2. **Lazy-fetch into atoms.** Replace the static `import` + module-eval projection with an
   effect-atom that `fetch`es the JSON when the consuming section mounts (`AsyncResult`), then runs
   the projection. The map fetches markers/placements on map-open; each data-table section fetches
   its own dataset on first render.
3. **Loading states.** Once the fetch is async, the map + tables need pending/empty/error UI
   (today everything is synchronous so there's nothing to show).
4. **In-memory index atoms + perf pass.** Build the indices `client-side-db.md` describes
   (`Map<mapId, Marker[]>`, grouped by `[mapId, layer]`) so active-layers-for-visible-region is an
   O(1) lookup + cheap filter, then verify idle stays quiet (the `testing.md` harness can measure
   this if a regression question reopens).

## The open design question (decide here)

**One JSON per dataset, or region-split?** (`client-side-db.md` open-question #3.)

- **Single JSON per dataset** — simplest; one `fetch` per dataset on first use. Removes the data
  from the initial bundle but still downloads the whole 4.7 MB markers blob the moment the map
  opens.
- **Region-split** (per `mapId` / map area / `[mapId, layer]`) — the map fetches only the regions
  in view, so panning to a new area triggers an incremental fetch. More machinery (a manifest +
  range/region routing) and only pays off if the per-region delta is meaningfully smaller than the
  whole.

Lean: **single-JSON-per-dataset first** (removes the data from the initial bundle — the biggest,
cheapest win), measure the bundle + load delta, and only go region-split if the markers fetch is
still the bottleneck.

## Files in scope

- `apps/web/src/lib/vm/map-pins.ts` — static import + module-eval projection → lazy atom.
- `apps/web/src/lib/inventory-catalog.ts` — same pattern for the table datasets.
- `packages/data` codegen / build — emit JSON artifacts (or a copy step into `apps/web/public/`)
  for the large datasets; keep the typed `.ts` exports for the small ones.
- Map + data-table components — consume the async atoms + render loading states.

## Why it's punted

Everything works today; this is a latency/optimization pass on a static, client-only side
project, not a correctness gap. The natural time to do it is alongside a hosting/CDN change
(`move-hosting-to-cloudflare.md`), where the static-JSON-in-`public/` shape and CDN caching are
exactly what the CDN wants — so the two are worth sequencing together.
