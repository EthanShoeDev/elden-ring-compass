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
  as the _treasure_ link — see [[map-treasure-source]].)

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
   **EMEVD** scripts (`event/*.emevd.dcx`): an _Award Item Lot_ (2003[4]) instruction fires
   on a flag/region/entity that has a location. Needs an EMEVD reader + a heuristic to map
   the awarding event back to a coordinate (spawn region, dying entity, or the map the
   `common`/`mXX` event file belongs to).
3. **Legacy-dungeon placements.** Enemy + treasure placements already exist for dungeons
   (`m10`/`m12`/…) but project to `null` on the overworld map — they need
   `WorldMapLegacyConvParam` (dungeon-local → overworld). Shared with the map-calibration
   follow-up ([[tiled-map-viewer]]). Until then they can only show on per-dungeon maps the
   app doesn't render.
4. **Vendor items (`ShopLineupParam`).** Bell-bearing / merchant stock has no single world
   point — pin at the _vendor's_ location (the merchant NPC marker), or mark "shop only".
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

        soulstruct/.../events/`, the `CommonFunc\_\*`defs + EMEDF). We don't need to parse its 478

    `.evs.py`; we vendor the small wrapper-signature table and run the trace in our own
    `formats/emevd.ts`reader (pattern:`game/boss-names.ts`).

             **Plan (path A):** new `game/event-drop-locations.ts`:
             1. index award-wrappers → `{flagArg, lotArg}` (from the vendored soulstruct signatures);
             2. parse per-map EMEVDs → for each `RunCommonEvent(wrapper, …)` extract `(L, F)`;
             3. find the instruction that `EnableFlag(F)` and the entity its containing event was
                initialized with (`CharacterDead`/`InsideRegion` arg) → an entity/region id;
             4. resolve id → MSB marker/region coords (we already read both);
             5. emit `source:'event'` placement at those coords. **Fallbacks:** EMEVD-file tile if no
                clean entity (world-state flags), then lot-id tile. Replaces the current tile-centre pins.

  - **Phase 2c — cross-file body-entity trace (the boss-death / common-award class). ◀ NEXT.**
    Phase 2b's trace only catches awards that (i) live in a per-map `m*.emevd` file, (ii) pass the
    encounter **character as a `RunEvent` init param** (templated invasions like Reduvia), and (iii)
    set the gate flag **in that same file**. A large class fails all three — e.g. **Ruins Greatsword**
    (weapon `4080000`, lot **`10830`**, awarded for the Misbegotten Warrior + Crucible Knight duo at
    Redmane Castle Plaza). Its chain:

        common.emevd:  Event_1100(slot=83, flag=9183, item_lot=10830, …)     # award, in COMMON not mXX
        m60_51_36.emevd: Event_1051362800:                                   # flag set in a DIFFERENT file
            await CharacterDead(1051360800) and CharacterDead(1051360801)     # bosses HARD-CODED in body,
            EnableFlag(9183)                                                  #   not passed as init params
        → MSB markers 1051360800 (CrucibleKnight) / 1051360801 (LeonineMisbegotten) → coords (97.3, 36.3).

    The lot id `10830` is **not** tile-encoded (5 digits, not `10<col><row><seq>`), so even the coarse
    tile fallback drops it — today it has **zero** placements. There are **4,138** such non-tile-encoded
    `ItemLotParam_map` lots (vs 1,250 tile-encoded), so this is the biggest event-drop class.

    **Generalization (implemented in `game/event-drop-locations.ts`):** scan **all** `*.emevd.dcx`
    except `common_func` (the template lib), and build **global** (cross-file) indices in one pass:
    - `flagToEntities[F]` — for every event that `EnableFlag(F)`, the set of ids referenced **anywhere
      in its instruction args** that resolve to a placed **character** MSB marker (body-embedded boss
      constants). This is the new path that catches the boss-death class.
    - keep `eventInitParams` (RunEvent init args) + `flagSetters` (precise path — templated invasions)
      and `coPassed` (setup-call co-params), now global instead of per-file.

    Resolution per award `(lot, gate-flag F)`: try the precise init-param path, then the body-entity
    path, then co-passed; first placed character wins (`pickMarker` prefers `isCharacter`). Raw-int
    matching against the marker map is safe because real 10-digit entity ids never collide with flags
    (guard `id > 0` to exclude the ubiquitous `0`). This also picks up DLC `m61` short lots for free
    when their boss is a placed marker.

  - **DLC `m61` orphan lots (open).** Their lot ids use a different prefix than the `10…`
    m60 form — verify it and extend `decodeMapLotTile` so DLC event drops pin too (the Phase 2c
    body-entity trace already resolves the ones whose boss is a placed character).

## Notes

- **EMEVD is already parsed** (`formats/emevd.ts` + `formats/emedf.ts`, ~100% opcode coverage,
  used by `game/boss-names.ts`) — Phase 2b is a new _join_ over existing tooling, not a new
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
- **EMEVD** (`event/common.emevd.dcx`, `event/mXX_*.emevd.dcx`) — _Award Item Lot_ (2003,4)
  - the firing condition's entity/region. No reader yet (would be a new `formats/emevd.ts`).
- `WorldMapLegacyConvParam` — dungeon-local → overworld (struct already in `er-save-lib`).
- `ShopLineupParam` — vendor stock (optional Phase 4).

## Open questions / risks

- EMEVD → coordinate is heuristic: many awards fire on a _flag_, not a region; resolving the
  flag back to a place needs the flag→entity wiring (overlaps [[quest-compass]] /
  [[save-flag-diff-checkpoints]]). Some awards genuinely have no map location — leave unpinned.
- Multi-location items (a weapon found in 3 places) already supported by `itemPins` returning
  an array; keep that.
- Keep pins keyed by **`type:id`** — item ids collide across types (weapon 1040000 Reduvia vs
  armor 1040000 Radiant Gold Mask); see `lib/vm/map-pins.ts`.
- Don't let coverage work reintroduce scraped data — every pin must trace to a param/MSB/EMEVD
  source ([[no-scraped-map-coords]]).

## Related

- [[map-treasure-source]] — why MSB Treasure events (not EMEVD) are the _treasure_ link.
- [[tiled-map-viewer]] — the conv-param dungeon projection is shared work.
- `docs/projects/data-parity-audit.md` — overall parity vs the legacy wiki data.
