# Nearby items — "what am I missing around me?"

> **Status (2026-06-11): SHIPPED → moved to `complete/`.** Implemented as a floating
> **"Nearby items" panel on the map route** — `components/sections/nearby-items-panel.tsx`,
> toggled from the map's top-right rail (PackageSearch icon, next to the controls toggle;
> closed by default everywhere — it's an opt-in glance tool). How the open questions
> resolved:
>
> - **Surface**: map-route panel (not a new route), as recommended below.
> - **"Near"**: radius in master-pixel space — trivially exact because 1 px = 1 world-unit
>   (`map-affine.ts`), so the radius reads as meters. Segmented 100/250/500 m presets
>   (default 250). Scoped to the player's master.
> - **Data**: new `ALL_ITEM_PINS` flat export in `vm/map-pins.ts` (same single projection
>   pass that builds the per-item `itemPins` map). Linear scan per recompute (~tens of
>   thousands of pins) is fine — no spatial index needed.
> - **Noise control**: uncollected only by default (`quantity === 0`) with an "Owned"
>   switch to include collected; multiple placements of one item collapse to one row
>   (nearest distance + "×N" in-range count); sorted by distance; capped at 40 rows with
>   a "+N more" line; rows show source ("Treasure"/"Drop"), drop % when <100, and an
>   8-way compass direction (N/NE/…) derived from the pixel offset.
> - **Interiors**: handled — the player pin already projects through legacy-dungeon conv
>   data; when it can't project at all the panel says so (same caveat as "Center on me").
> - **Pin integration**: clicking a row toggles the item's row selection in its OWN
>   inventory table's store (`useRowSelectionControls`) — i.e. it IS the table pin toggle,
>   so pins persist, sync with the tables, show on the map, and clear via "Clear pins".
> - **Live save reload**: free, as predicted — the list derives from the player pin +
>   catalog ownership, both of which recompute when the save atoms refresh.
>
> Verified in real Chromium (Playwright, sample save): no-save hint → connect sample save →
> "97 items within 250m", 40 rows, distances ascending (9m NE first), counts scale with
> radius (55/97/128 for 100/250/500 m) and with the Owned switch (128 → 211), row click
> pinned Golden Rune [1] (markers 0 → 259, "Clear pins (276)", row flips to "Remove pin"),
> second click unpinned. Typecheck + oxlint + oxfmt + knip + build green.
>
> **Update 2026-06-11 — slider + sure-drop filter**: the 100/250/500 m presets were
> replaced with a 50–2000 m slider (25 m steps, live label, scan deferred while
> dragging), and a "% drops" switch was added that filters chance-based enemy drops
> per PLACEMENT before grouping (off = guaranteed pickups only); both verified in
> Chromium alongside the Owned switch.
>
> **Known wart — kept DELIBERATELY (decided 2026-06-11)**: a row pin places ALL of the
> item's map locations (that's what item-level selection means — Golden Rune [1] = 259
> markers), not just the in-radius one(s). Radius-scoped pinning ("pin only the Stone
> Sword Keys near me") was considered and REJECTED by the user: panel pins ARE the
> item's inventory-table row selection, and a placement-subset pin would put that table
> row in a state that's neither selected nor unselected — "the true answer would be
> partial". Keeping pin = row selection means the table checkbox-pin, the map, and this
> panel can never disagree. Don't re-propose per-placement pinning without first
> solving partial-selection representation in the tables. The viewport-scoped sibling
> idea ("show all undiscovered at current zoom") remains open in `../cleanup.md` and
> would hit the same question.

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
