# Surface pins that live on a different map (overworld ↔ underground)

> **Status (2026-06-11): SHIPPED → moved to `complete/`.** Implemented as
> **option (1) + a gated option (2)**, all in `sections/map-section.tsx`; option
> (3) (auto-switch) was deliberately NOT built — the chip makes the jump one
> click without ever yanking the map. Context shift since this doc was written:
> the "under-map control strip" it preferred no longer exists — the map chrome
> floats on the map (see `cleanup-2026-06.md`), so the signals live on the
> floating Map switcher instead, which is even closer to the pins.
>
> What shipped:
>
> - **(1) Per-realm count badges** on each switcher segment: `pinCountByMaster`
>   counts `visiblePins` per master — i.e. what would actually RENDER, so pins
>   hidden by a layer toggle don't count, and the player/bloodstain markers are
>   excluded (always present; "Center on me" already owns that jump). The badge
>   on the ACTIVE segment is muted; on other segments it's amber — amber =
>   "pins you can't currently see."
> - **(2, gated) "N pins on <realm> — switch" chip(s)** under the switcher,
>   shown ONLY in the silent-no-op case: the selection has pins but the active
>   map has ZERO of them (`offRealmPins`). One chip per holding realm, most
>   pins first; click = `setActiveMapId`. Realm names reuse the switcher's
>   compact `SHORT_MAP_NAME` labels.
>
> Verified in real Chromium (Playwright, dev server): pinned "Siofra River
> Bank" (an M01 grace) from the `/graces` table with Overworld active → badge
> "Underground 1" + chip "1 pin on Underground — switch"; chip click switched
> realms, rendered the marker (tooltip "Siofra River Bank · Undiscovered"),
> chip gone; hiding the Graces layer removed marker AND badge; quick-select
> Undiscovered Graces (283/30/105 across Overworld/Underground/Land of Shadow)
> badged all three segments with no chip (active map has pins); Clear pins
> removed everything. Typecheck + oxlint + oxfmt green.

## Problem

The interactive map renders **one master map at a time** (`activeMapId` — e.g.
`M00` overworld / Lands Between, `M10` underground / Siofra-Ainsel, etc.). Every
pin already carries a `master` field, and `MapBody` only renders the pins whose
`master === activeMapId`:

```ts
<MarkerLayer pins={pins.filter((p) => p.master === activeMapId)} zoom={z} />
```

So if a user pins something from a data table — say an item or boss that lives in
the **Underground** — while the **Overworld** map is showing, the pin silently
does not appear. From the user's perspective they "dropped a pin" and nothing
happened; there's no hint that it's on another map, or which one.

This is most acute for the table → map flow: a row's pin toggle (see
`common-column-defs.tsx` / `map-section.tsx`'s `useSelectedPins`) sets a selection
that produces pins across realms, but the map only shows the active realm's subset.

## What exists today (building blocks)

- `MapPin.master` — each pin is resolved to a specific master + master pixel
  (`map-pins.ts`, `map-affine.ts`).
- The segmented **Map switcher** (`map-section.tsx`) drives `activeMapId`.
- "Center on me" already does a cross-realm jump: if the player's pin is on a
  different master, it `setActiveMapId(playerPin.master)` then recenters. That's
  the pattern to generalize.
- `manifest.maps` gives the list of masters + human names for badges/labels.

## Proposed directions (pick one / combine — keep it non-intrusive)

The user dislikes heavy overlays on the map, so prefer the under-map control
strip over on-map banners.

1. **Per-realm pin-count hint on the Map switcher.** Next to each map segment in
   the switcher, show a small count badge of how many _currently selected_ pins
   live on that map (e.g. `Underground (3)`). Zero-cost discovery: you can see
   your pins are "somewhere else" and one click switches.

2. **"N pins on <other realm> — switch" prompt.** A single quiet line under the
   map when `selectedPins` contains pins not on `activeMapId`, with a button that
   switches to that realm. If pins span multiple other realms, list each.

3. **Auto-switch on a _new_ pin.** When a pin is newly added (table toggle) and it
   has no representation on the active map but does on another, offer/auto-switch
   to that realm (debounced; respect an explicit user map choice). Mirrors the
   "Center on me" cross-realm jump. Risk: yanking the map out from under the user
   — gate behind "only when the active map has zero of the selection's pins," or
   make it a toast with an Undo/Switch action rather than silent.

Recommendation: start with **(1)** (cheapest, always-on, no surprise movement),
add **(2)** if counts alone aren't discoverable enough.

## Acceptance

- Pinning an item/boss/grace that lives on a non-active map gives a visible signal
  of where it is and a one-click way to get there.
- No silent "nothing happened." No heavy on-map overlay.
- Works for the player marker too (already handled by "Center on me").

## Touch points

- `apps/web/src/components/sections/map-section.tsx` — `useSelectedPins`,
  `activeMapId`, the Map switcher segmented control, the under-map control strip.
- `apps/web/src/components/sections/leaflet-map.tsx` — `MapBody` master filter.
- `manifest.maps` for realm names; `MapPin.master` for grouping.
