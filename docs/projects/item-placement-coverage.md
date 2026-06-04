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
  - **Phase 2b — EXACT coords via the EMEVD flag→entity trace. ◀ NEXT (proven end-to-end).**
    The award is **flag-gated**: a `CommonFunc_900057xx(flag=F, item_lot=L)` wrapper grants `L`
    once flag `F` is set, and `F` is set by the encounter's own event (`EnableFlag(F)` gated by
    `CharacterDead(character)` / `CharacterInsideRegion(region)`). That event is initialized with
    the **invader / boss / NPC character (or trigger region) entity**, which IS a placed MSB
    marker with coordinates. So the trace is mechanical:

        item_lot L  →  award-wrapper's flag F  →  the event that EnableFlag(F)  →
        its character/region entity  →  MSB marker coords

    **Proven (Reduvia):** `CommonFunc_90005774(flag=1043379262, item_lot=1042370700)` →
    `Event_1043373722` does `EnableFlag(1043379262)` on `CharacterDead(character)`, initialized
    with `character=1043370740` (`c0000_9001` = Bloody Finger Nerijus) → marker px **(4084,6999)
    = 13px** from the hand-clicked true location. (Correction to an earlier note: invaders DO
    have static MSB coords — they're placed, dormant NPCs; the enemy-join only missed Reduvia
    because its drop is EMEVD-awarded, not a `NpcParam` drop.)

    **The unlock was the award-wrapper signatures** (which arg of `90005774` is `item_lot` vs
    `flag`) — supplied by **soulstruct's** decompiler (`docs/cloned-repos-as-docs/dlc-data-sources/
    soulstruct/.../events/`, the `CommonFunc_*` defs + EMEDF). We don't need to parse its 478
    `.evs.py`; we vendor the small wrapper-signature table and run the trace in our own
    `formats/emevd.ts` reader (pattern: `game/boss-names.ts`).

    **Plan (path A):** new `game/event-drop-locations.ts`:
      1. index award-wrappers → `{flagArg, lotArg}` (from the vendored soulstruct signatures);
      2. parse per-map EMEVDs → for each `RunCommonEvent(wrapper, …)` extract `(L, F)`;
      3. find the instruction that `EnableFlag(F)` and the entity its containing event was
         initialized with (`CharacterDead`/`InsideRegion` arg) → an entity/region id;
      4. resolve id → MSB marker/region coords (we already read both);
      5. emit `source:'event'` placement at those coords. **Fallbacks:** EMEVD-file tile if no
         clean entity (world-state flags), then lot-id tile. Replaces the current tile-centre pins.
  - **DLC `m61` orphan lots (open).** Their lot ids use a different prefix than the `10…`
    m60 form — verify it and extend `decodeMapLotTile` so DLC event drops pin too.

## Notes

- **EMEVD is already parsed** (`formats/emevd.ts` + `formats/emedf.ts`, ~100% opcode coverage,
  used by `game/boss-names.ts`) — Phase 2b is a new *join* over existing tooling, not a new
  parser. (See [[emevd-extractor-gap]].)
- **soulstruct** (vendored, MIT) supplies the award-wrapper `CommonFunc` signatures — the only
  missing piece. Its decompiled `.evs.py` also serves as the human-readable verification of the
  trace. Belongs in `vendored-data` per [[reorganize-repo]] (same class as EMEDF/paramdex).
- **er-save-manager doesn't help here:** its location data is curated per-map "safe spawn"
  coords + NPC text locations, not invasion/drop coords. It IS valuable for [[quest-compass]]
  (curated flag DBs). Pin sources here must stay install-derived ([[no-scraped-map-coords]]).
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
