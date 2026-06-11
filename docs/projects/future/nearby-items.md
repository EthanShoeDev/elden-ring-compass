# Nearby items — "what am I missing around me?"

> **Status (2026-06-11): FUTURE / idea-stage.** Spun out of `../cleanup.md`. No nearby-items
> logic exists; the app shows the player pin and manually-pinned item locations, but nothing
> proximity-based.

## The idea (original wording)

> I think it would be cool if there was a section on the map route or maybe even a new route
> that like showed the player what weapons and items are near their save location at any given
> time. Like if the player has the http server serving their save they could keep this website
> open in a browser tab and everytime they save they could glance over and make sure they are
> not missing any items before moving onto the next area.

Related cleanup idea, likely the same feature wearing a different hat:

> It would be cool to have a button on the map route to 'show all undiscovered items at
> current zoom level'

Both are "surface uncollected items by spatial scope" — one scoped by player position, one by
viewport. A good design probably serves both from one mechanism.

## Building blocks that already exist

- **Player position projected to map pixels**: `playerToMasterPixel` (also used by the
  bloodstain pin) — handles legacy-dungeon projection onto the overworld masters.
- **Item → locations join**: `itemPins(type, id)` and the per-row `locationCount` /
  `hasCoords` fields in `inventory-catalog.ts`.
- **Ownership**: `quantity > 0` per inventory row (the All/Owned/Missing filter machinery).
- **Live save reload**: the HTTP-server save-serving flow already refreshes parsed save
  atoms, so "glance after each save" needs no new plumbing — just a reactive derived view.

## Open design questions

- **Surface**: a collapsible panel on the map route (list of nearby uncollected items,
  click → pin/fly-to) vs. a dedicated route. Panel on the map route seems strongest for the
  glance-while-playing loop.
- **"Near" definition**: radius in master-map pixel space around the player pin (simple,
  matches what the user sees) vs. same-region membership (REGIONS blocks). Pixel radius is
  probably v1; region grouping is a nice label.
- **Interiors**: when the player is in a legacy-dungeon interior the projection is
  approximate — fine for "this area", but say so in the UI (same caveat as "Center on me").
- **Noise control**: thousands of placements exist; default to not-owned only, and probably
  cap/sort by distance. Drop-source items (enemy drops with <100% rates) may need a toggle.
- **Relation to [quest-compass](./quest-compass.md)**: different feature (items vs. quest
  steps) but the same "ambient companion-tab" usage pattern; keep the UI surfaces compatible.
