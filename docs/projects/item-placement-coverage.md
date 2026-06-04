# Item Placement Coverage — pin drops at their source

## Problem / motivation

The map pins every item the extractor can locate (`PLACEMENTS` → `lib/vm/map-pins.ts`),
having replaced the scraped `map-db.ts` wiki markers with install-derived data (see
[[no-scraped-map-coords]]). That's accurate but **partial**: only items reachable by the
two current join paths get a pin. Items dropped by **invaders / event-spawned NPCs /
bosses via event scripts**, items in **legacy dungeons**, and **vendor** items have no
pin today — so e.g. **Reduvia** (Bloody Finger Nerijus's drop) shows nothing, where the
old wiki had a hand-placed marker.

Goal: pin an item at the **world location of its source** (the enemy/NPC/chest/region
that yields it), closing the coverage gap without reintroducing scraped data.

## Current state (`packages/er-extractor/src/game/placements.ts`)

Two fully-static join paths, both verified:

- **`source: 'enemy'`** — every MSB Enemy/DummyEnemy marker carries `npcParamId`;
  `NpcParam.itemLotId_enemy → ItemLotParam_enemy` gives the drop, the marker gives coords.
  Bosses are enemy markers, so their unique drops flow through here.
- **`source: 'map'`** — MSB **Treasure events** (`EVENT_PARAM_ST`) link a placed Part
  (→ coords) to an `ItemLotParam_map` row. Chests / items-on-the-ground. (EMEVD ruled out
  as the *treasure* link — see [[map-treasure-source]].)

Result: 11,361 placements, but only **296 / 3,333 weapon rows** have any placement, and
~633 distinct item ids overall. Overworld-projectable subset is smaller still.

## Gap analysis (grounded in the Reduvia probe)

Reduvia (weapon `1040000`) is in `ItemLotParam_map` lot **`1042370700`**, referenced by
**no NpcParam and no Treasure event** → it's an **EMEVD-awarded lot** (granted on Nerijus's
defeat). The classes of missing coverage:

1. **`NpcParam.itemLotId_map` + `sleepCollector*` lots unused.** The enemy join reads only
   `itemLotId_enemy`. `NpcParam` also has `itemLotId_map`, `sleepCollectorItemLotId_enemy`,
   `sleepCollectorItemLotId_map`. Some NPC drops live there. **Cheapest win.**
2. **EMEVD-awarded lots (≈220 `ItemLotParam_map` rows).** Boss/invader/NPC-defeat drops and
   scripted grants (incl. Reduvia). The link `lot → trigger → world location` lives in the
   **EMEVD** scripts (`event/*.emevd.dcx`): an *Award Item Lot* (2003[4]) instruction fires
   on a flag/region/entity that has a location. Needs an EMEVD reader + a heuristic to map
   the awarding event back to a coordinate (spawn region, dying entity, or the map the
   `common`/`mXX` event file belongs to).
3. **Legacy-dungeon placements.** Enemy + treasure placements already exist for dungeons
   (`m10`/`m12`/…) but project to `null` on the overworld map — they need
   `WorldMapLegacyConvParam` (dungeon-local → overworld). Shared with the map-calibration
   follow-up ([[tiled-map-viewer]]). Until then they can only show on per-dungeon maps the
   app doesn't render.
4. **Vendor items (`ShopLineupParam`).** Bell-bearing / merchant stock has no single world
   point — pin at the *vendor's* location (the merchant NPC marker), or mark "shop only".
5. **NPC questline rewards / one-off event grants.** Same EMEVD path as (2); some have no
   meaningful map location (mailed rewards, etc.) and should stay unpinned.

## Proposed approach (phased)

- **Phase 1 — exhaust the param lots (cheap, high value). ✅ DONE.** The enemy join now reads
  all four `NpcParam` lot fields (`itemLotId_enemy`, `itemLotId_map`,
  `sleepCollectorItemLotId_enemy/map`) against the right lot table, joined to the enemy
  marker's coords. Enemy placements 7,700 → **9,573**.
- **Phase 2 — orphan overworld map lots → tile (lot-id decode). ✅ DONE (coarse).** Instead of
  the full EMEVD parse, exploit that an `ItemLotParam_map` row id encodes its tile
  (`10<col><row><seq>`, validated 1144/1144). Orphan map lots (not reached by Treasure/NPC)
  are pinned at their **tile centre** as `source: 'event'` — covers invader/boss/NPC event
  drops like Reduvia (lot `1042370700` → `m60_42_37`). **188 placements; ±1 tile accuracy.**
  Pinnable distinct items 633 → **801**. The web tags these "Drop · approx. area".
  - **Phase 2b — EXACT coords (open, tracked).** The lot-id tile is ±1 tile (Reduvia pins at
    tile `42_37` centre, ~347px / ~1.3 tiles W of where Nerijus actually fights in `43_37`).
    The right pin location for an **invader / NPC-event drop is its trigger region** — the
    in-game bounding box that, when the player enters it, spawns the invasion/encounter that
    eventually awards the lot. That region IS placed in the MSB (we already read `POINT_PARAM_ST`
    regions as markers), but **we can't yet link `lot → invader → trigger region`** from the
    extractor's current outputs. Closing it needs the EMEVD wiring:
      - parse `event/*.emevd.dcx`: an invasion setup (e.g. the SpawnOneShotNPC / invasion
        instruction family) ties a **trigger region entity** + an **invader NPC** + the
        **defeat flag** whose `Award Item Lot` (2003,4) grants the drop lot;
      - resolve: `ItemLotParam_map` lot → awarding event → trigger-region entity →
        `POINT_PARAM_ST` region coords (the bounding-box centre) → exact-ish pin.
    Same EMEVD machinery also fixes non-invader event drops (boss/remembrance/NPC-defeat).
    Until then, event-drop pins stay tile-level and are labelled "Drop · approx. area".
  - **DLC `m61` orphan lots (open).** Their lot ids use a different prefix than the `10…`
    m60 form — verify it and extend `decodeMapLotTile` so DLC event drops pin too.

## Open data gaps the extractor doesn't surface yet

- **EMEVD** is not parsed at all (no `formats/emevd.ts`). It's the missing link for: exact
  event-drop coords (above), invasion trigger regions, scripted item grants, and quest steps
  ([[quest-compass]]). A general EMEVD reader is the single highest-leverage addition for this
  project and several others.
- **Invasion / NPC-spawn params** (e.g. spawn-point / invasion setup params) — if a param,
  rather than EMEVD, holds the `trigger region ↔ invader` link, that's a cheaper path; TBD
  which param (investigate alongside the EMEVD work).
- **Phase 3 — dungeon → overworld projection.** Apply `WorldMapLegacyConvParam` so dungeon
  enemy/treasure/event placements project onto the overworld (and DLC) masters. (Also
  unblocks dungeon graces/bosses for the map — same conv-param work.) **Biggest remaining
  lever** (most items are dungeon-only).
- **Phase 4 (optional) — vendors.** `ShopLineupParam` → merchant NPC marker; pin as
  "purchasable from <NPC>".

> **Codegen note:** `PLACEMENTS` is now emitted via `JSON.parse(...)` (`renderDatasetJson`),
> not an inline array — at 13k+ rows the inline literal trips TypeScript's TS2590
> ("union type too complex"). JSON is `any` at parse time, so it sidesteps that and checks faster.

## Data sources / params

- `ItemLotParam_enemy`, `ItemLotParam_map` — the drop tables (already read via
  `game/item-lots.ts`).
- `NpcParam` — `itemLotId_enemy`, `itemLotId_map`, `sleepCollectorItemLotId_enemy/map`,
  `dropType`.
- **EMEVD** (`event/common.emevd.dcx`, `event/mXX_*.emevd.dcx`) — *Award Item Lot* (2003,4)
  + the firing condition's entity/region. No reader yet (would be a new `formats/emevd.ts`).
- `WorldMapLegacyConvParam` — dungeon-local → overworld (struct already in `er-save-lib`).
- `ShopLineupParam` — vendor stock (optional Phase 4).

## Open questions / risks

- EMEVD → coordinate is heuristic: many awards fire on a *flag*, not a region; resolving the
  flag back to a place needs the flag→entity wiring (overlaps [[quest-compass]] /
  [[save-flag-diff-checkpoints]]). Some awards genuinely have no map location — leave unpinned.
- Multi-location items (a weapon found in 3 places) already supported by `itemPins` returning
  an array; keep that.
- Keep pins keyed by **`type:id`** — item ids collide across types (weapon 1040000 Reduvia vs
  armor 1040000 Radiant Gold Mask); see `lib/vm/map-pins.ts`.
- Don't let coverage work reintroduce scraped data — every pin must trace to a param/MSB/EMEVD
  source ([[no-scraped-map-coords]]).

## Related

- [[map-treasure-source]] — why MSB Treasure events (not EMEVD) are the *treasure* link.
- [[tiled-map-viewer]] — the conv-param dungeon projection is shared work.
- `docs/projects/data-parity-audit.md` — overall parity vs the legacy wiki data.
