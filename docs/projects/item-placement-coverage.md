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

- **Phase 1 — exhaust the param lots (cheap, high value).** Extend the enemy join to also
  read `itemLotId_map` + the two `sleepCollector*` lots from `NpcParam`, joined to the
  enemy marker's coords. Tag `source` accordingly. No new parsing. Re-measure coverage.
- **Phase 2 — EMEVD award-lot → location.** Add an `emevd` stage: parse `event/*.emevd.dcx`,
  collect *Award Item Lot* instructions, and resolve each awarding event to a world point
  (the event's region/entity argument → MSB Part/Region coords; fall back to the event
  file's map id + a representative coord). Emit `source: 'event'` placements. Validate
  against known cases (Reduvia@Murkwater, remembrance drops, NPC-defeat uniques).
- **Phase 3 — dungeon → overworld projection.** Apply `WorldMapLegacyConvParam` so dungeon
  enemy/treasure/event placements project onto the overworld (and DLC) masters. (Also
  unblocks dungeon graces/bosses for the map — same conv-param work.)
- **Phase 4 (optional) — vendors.** `ShopLineupParam` → merchant NPC marker; pin as
  "purchasable from <NPC>".

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
