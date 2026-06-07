# Surface pins that live on a different map (overworld ↔ underground)

> **Status (2026-06-06): NOT STARTED → filed under `future/`.** Captures the
> long-standing map todo (was task #11). Nothing in-progress.

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
   the switcher, show a small count badge of how many *currently selected* pins
   live on that map (e.g. `Underground (3)`). Zero-cost discovery: you can see
   your pins are "somewhere else" and one click switches.

2. **"N pins on <other realm> — switch" prompt.** A single quiet line under the
   map when `selectedPins` contains pins not on `activeMapId`, with a button that
   switches to that realm. If pins span multiple other realms, list each.

3. **Auto-switch on a *new* pin.** When a pin is newly added (table toggle) and it
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
