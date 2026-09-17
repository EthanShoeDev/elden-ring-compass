# Data Parity Audit — legacy sources vs `@elden-ring-compass/data`

> **Status (2026-06-03): audit served its purpose — the web teardown it gated has LANDED
> (commit `2cee32e3`).** The install-derivable gaps are closed, and the web app is now rewired
> off `elden-ring-raw-db/`/`erdb.ts`/`assets/erdb/` onto `@elden-ring-compass/data` (those three
> are deleted). The curated-table drops (cookbooks/whetblades via inventory, pools/colosseums,
> `REGIONS.isBoss`, 2 spirit-ash columns, map-fragment fine names) were taken. **Two items
> outlive this audit:** (1) the **map subsystem** (#4 calibration + #10 placements; #9 marker
> classification ✅ done) gating `map-db.ts` — the sole
> surviving legacy source; (2) **REGIONS verification — RESOLVED** (the "~47%" was matchmaking
> siblings, not missing data; placed regions are now name-complete 207→213 and
> `MATCHMAKING_REGION_IDS` is emitted — see the verification note below). This doc is now mostly a
> historical record of the field-level trace; the live remaining work is in `client-side-db.md`
> (map) and `wasm-save-parser-rewrite.md` (#15).

## Progress (2026-06-02) — extractor enrichment

The item-data + event-flag gaps are **closed and verified against the real install**
(tasks #19/#20/#21, committed on `tanstack-start`; see memory `er-extractor-enrichment`):

- **Rich item datasets** — weapons/armor/talismans/goods now carry `summary`, `description[]`,
  `rarity`, `icon`, `sellValue`; weapons add `category` (incl. ammo) + `upgradeMaterial`/`upgradeCosts`;
  **`effects[]`** on weapons/armor/talismans (SpEffectParam port + multi-attribute aggregation);
  **ashes-of-war** decoded (categories/affinities/skill); **talisman conflicts**; new **`spells`**
  (fp/sp cost, reqs) and **`spirit-ashes`** (summon/cost/upgrade) datasets; gestures+ammo
  distinguishable by `category`.
- **Per-item icons** — 2939 `images/icons/items/{iconId}.webp` from `menu/hi/00_solo.tpfbhd`.
- **Event-flag addressing** — `event-flags.ts` emits `eventFlagOffset(id)→[byte,bit]` (vendored
  ER-Save-Lib bst table); **verified 1178/1178 vs legacy `EVENT_FLAGS.ts`**. Replaces the legacy
  `EVENT_FLAGS` map and enables arbitrary flag lookup.
- **`src/vendor/PROVENANCE.md`** documents every vendored dep + patch-staleness.

**Re-classification of the remaining "collectibles + REGIONS" (#22)** — investigation showed most
of it is **derivable from the install after all** (not the curated overlay first assumed). REGIONS
and map fragments are now **DONE + committed**:

| Legacy table                 | Rows          | Install-derivable?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REGIONS`                    | 144           | ✅ **DONE (committed `f45ff091`).** `src/game/regions.ts`: 207 play-regions from `PlayRegionParam` (rowId = save `unlocked_regions`), named via `mapMenuUnlockEventId → grace`, `isOpenWorld` from `areaNo` 60/61, else `isDungeon`. No curated names. **`isBoss` deliberately dropped:** the legacy value was NOT from the install/erdb — it's hand-curated in the **TGA Cheat Engine table**, lifted via ER-Save-Editor `src/db/regions.rs` (header: "classification … from TGA table"). 40/210 rows flagged by hand; no game field backs it (`bossAreaId` is set for ~every region). A boss-per-region indicator could later be _approximated_ by joining install-derived `BOSSES` placements (map work #9/#10), not vendored. |
| `MAPS` (map fragments)       | 28            | ✅ **DONE.** `src/game/map-fragments.ts`: 34 pieces from `WorldMapPieceParam` (`openEventFlagId` = the save tracking flag, complete 62xxx + DLC coverage) ⨝ `WorldMapPlaceNameParam → PlaceName` FMG. **Only 9 coarse names exist in-install** (`WorldMapPlaceNameParam` has 10 rows); the legacy _fine_ directional labels ("Limgrave, East", "Mountaintops…, North") were **wiki-scraped → dropped, not vendored**. The "9/28 buggy join" was a data limit, not a bug.                                                                                                                                                                                                                                                          |
| `COLOSSEUMS`                 | 3             | ◐ Trivial — names from `PlaceName`; or just keep 3 hardcoded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `COOKBOOKS`                  | 59            | ◐ Items+names in FMG; "obtained" trackable via **save inventory ownership** instead of curated `67xxx` flags.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `WHETBLADES`                 | 12            | ⚠️ Affinity-unlock **flags with curated names** — the flag→affinity semantic is RE'd, not in files. Small; derive item ownership or drop.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `SUMMONING_POOLS`            | 162           | 💀 **Drop candidate** — legacy "names" are literal placeholders (`'Name_10000040'`); no real names exist anywhere, no param.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `STATS` / `STARTING_CLASSES` | —             | 💀 Dead (unused) — delete, no replacement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `ARCHE_TYPE`                 | ~8            | inline a static enum in the web app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `map-db.ts`                  | 3132 (1.2 MB) | 🌐 The genuinely **wiki-scraped** 2D pixel coords + labels → replaced by the map pipeline (#4 calibration + #9 layers/labels + #10 placements), not vendoring.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

**Net:** almost nothing _needs_ vendoring. REGIONS + map fragments are **DONE** (install-derived);
cookbooks/whetblades can be re-mechanism'd via inventory or dropped; summoning pools dropped
(fake names); colosseums = 3 hardcoded; map-db is the separate map-coordinate effort. **The
extractor side of the parity gate is effectively closed — remaining work is the web migration (#7).**

## Verified parity diff (2026-06-02) — authoritative remaining-gap checklist

Re-verified by tracing **every** legacy consumer's field reads (`vm/*`, `components/sections/*`,
`data-table/*`, `share/*`) against the **actual** `generated/*` interfaces. This is the gate
checklist — "all closed" means every row below is ✅ or an accepted DROP.

**✅ CLOSED (install-derived, field-complete for what the app reads):**

- Name resolution — all 5 `*_NAME` tables → `WEAPONS/ARMOR/TALISMANS/ASHES_OF_WAR/GOODS[].name`
  (+ gestures via `GOODS` sortGroup, ammo via `WEAPONS` category).
- Event-flag addressing — `eventFlagOffset()` (1178/1178). Graces, bosses → `GRACES`/`BOSSES`.
- Map fragments → `MAP_FRAGMENTS` (flags complete; coarse names only, fine labels dropped).
- REGIONS → `REGIONS` (placed regions, names via grace + boss-arena fallback) + `MATCHMAKING_REGION_IDS`
  (areaNo==0 siblings) — **except `isBoss` dropped**; verification RESOLVED (below).
- Rich item display fields for: ammo, armor*, ashes, bolstering, crafting, gestures, info, keys,
  shop, spells, talismans, tools, spirit-ashes* (\*caveats below). Per-item icons emitted.

**✅ CLOSEABLE-FROM-INSTALL gaps — NOW DONE (all 5 closed this pass):**

| Gap                                    | Consumer             | Resolution                                                                                                                                                               |
| -------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WEAPONS.allowAshOfWar`                | armColumns           | ✅ emitted from `EquipParamWeapon.gemMountType==2`                                                                                                                       |
| `WEAPONS.isBuffable`                   | armColumns           | ✅ emitted from `EquipParamWeapon.isEnhance`                                                                                                                             |
| `ARMOR.category` (Head/Body/Arms/Legs) | armorColumns         | ✅ emitted from `EquipParamProtector.protectorCategory` (213/293/124/138)                                                                                                |
| `ARCHE_TYPE` (class id→label)          | `vm/stats.ts`        | ✅ new `ARCHETYPES` dataset — `GR_MenuText[288100+id]`, ids 0–9, install-derived                                                                                         |
| Boss portraits (10)                    | `story-boss-section` | ✅ already covered — they're Remembrance item icons (goods 2950–2963 → `GOODS.icon` → existing `images/icons/items/{icon}.webp`); web maps boss→remembrance at migration |

**🌐 OPEN GAP — the map subsystem (#4/#9/#10), replaces `map-db.ts` (1.2 MB, ~22 categories):**
To retire `map-db` we still need: (a) **affine calibration** world→site-pixel [#4 — hand-tuned M00
only, needs generalizing]; (b) ~~marker layer/category + English labels [#9]~~ **✅ DONE** —
`MAP_MARKERS` now carries `category` (grace/npc/enemy/asset/region-subtypes via
`game/marker-classify.ts`) + `displayName` (graces via bonfire-entity join, NPCs via
`NpcParam.nameId → NpcName`; 924 labelled); (c) **`ItemLotParam` item placements** [#10] —
**✅ enemy/boss drops DONE** (`PLACEMENTS`, 7,700 rows via `npcParamId → NpcParam.itemLotId_enemy
→ ItemLotParam_enemy`, joined to marker coords; `game/placements.ts`); **✅ map treasure DONE
(#10b)** — the link is the **MSB `Treasure` event** (`EVENT_PARAM_ST`), naming a placed Part
(→ coords) + an `ItemLotParam_map` row, NOT EMEVD (the scripts reference only ~220 of ~5,400 map
lots). **3,661 map placements** added → `PLACEMENTS` is now 11,361 rows (`source: 'enemy' | 'map'`).
NOTE the rich inventory tables' `hasCoords`/map-jump column also depends on (c). The web still needs
to _wire_ the categories/placements to toggleable layers + calibrated rendering.
This is a separate effort (tiled-map work) and is the **largest remaining legacy dependency.**

**💀 ACCEPTED DROPS / re-mechanism (NOT install-derivable — need your sign-off to drop the UI):**

| Legacy                                       | Consumer        | Decision                                                                                                     |
| -------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `COOKBOOKS` (59)                             | events table    | re-mechanism via **save inventory ownership** (items+names in FMG) — needs a small web change, not a dataset |
| `WHETBLADES` (12)                            | events table    | curated flag→affinity names — **drop** the tracker or derive ownership                                       |
| `SUMMONING_POOLS` (162)                      | events table    | **drop** — legacy "names" are literal placeholders                                                           |
| `COLOSSEUMS` (3)                             | events table    | **drop** or keep 3 hardcoded                                                                                 |
| `SPIRIT_ASHES.abilities` + `summon_quantity` | spiritColumns   | wiki-scraped — **drop** those 2 columns                                                                      |
| `REGIONS.isBoss`                             | `vm/regions.ts` | dropped (bossAreaId unreliable) — remove the column                                                          |
| map-fragment fine names                      | events table    | scraped — dropped (coarse names ship)                                                                        |
| `STATS` / `STARTING_CLASSES`                 | none (dead)     | delete                                                                                                       |

> **Fallback overlay option (2026-06-04, `er-save-manager`).** Several of the "accepted drops"
> above are collectible **event-flag trackers** that aren't cleanly install-derivable. The newly
> cloned **er-save-manager** (Python, MIT) ships them as curated, **named, absolute-id** flag DBs
> we could vendor as a _logged boundary_ (à la `eventflag-bst.txt` in `PROVENANCE.md`) instead of
> dropping the UI — reusing already-done CT RE we're out of scope to do ourselves:
> `data/event_flags_db.py` has **105 Cookbook**, **62 Bell Bearings** (a category we don't track),
> **6 Whetblades**, **32 Maps**, plus 419 Grace / 252 Boss for **cross-checking** our install-derived
> `GRACES`/`BOSSES`, and `data/boss_data.py` gives 208 bosses with full flag sets + region (and
> location-suffixed names that fix our boss name-collisions). Reading any of these needs **zero**
> new work — they're absolute ids through the existing `eventFlagOffset()`. This is a sign-off
> decision: keep the trackers via a curated overlay, or drop as planned.

**✅ VERIFICATION DEBT → RESOLVED (2026-06-03, #15 vitest vs `ER0000.sl2`):** the
`REGIONS.id == save.unlocked_regions` assumption is verified, and the scary "~47% coverage" turned
out to **not be a data gap at all.** `unlocked_regions` interleaves **two** `PlayRegionParam` kinds:

- **Placed regions** (`areaNo != 0`, real `posX/Y/Z`) → the user-facing `REGIONS`. The extractor
  used to emit only the grace-named ones (207); it now also names the handful of **placed-but-
  ungraced** rows via their **boss arena** (`bossAreaId → BossArea.defeatFlagId`, e.g. the tutorial
  Chapel of Anticipation → "Grafted Scion", Haligtree → "Malenia"). **REGIONS: 207 → 213.**
- **Matchmaking siblings** (`areaNo == 0`) → multiplayer/invasion plumbing (no coords, no name, full
  of sign/invasion limit flags). Each is a 1:1 sibling of a placed region (`1000000` ↔ `1000001`);
  the game activates them as the player moves, so they appear in `unlocked_regions` but are **not
  places to show.** The extractor now emits their ids as **`MATCHMAKING_REGION_IDS`** (378 ids) so
  the app/test can classify rather than treat them as missing.

After regen, every unlocked id in `ER0000.sl2` classifies: **149 placed + 202 matchmaking + 3
outliers = 354** (was 143/_/_). The **3 outliers** (`600000`, `3106004`, `3413000`) are not in
`PlayRegionParam` at all — a different id-space (likely special/global ids), left unclassified
pending investigation. The full classification is asserted (no silent gap) in
`apps/web/src/lib/wasm-save-parser.test.ts`. Extractor change: `src/game/regions.ts` +
`MATCHMAKING_REGION_IDS` codegen.

**Verdict (updated): the install-derivable side is fully closed.** Every dataset/field the app reads
that _can_ come from the install now does (item fields incl. weapon ash/buffable + armor category,
ARCHETYPES, boss portraits via remembrance icons, regions, map fragments, flags). What remains is
**not** install-extraction work:

1. **Map subsystem** — the large, separate effort that replaces `map-db.ts`. **#9 marker
   classification ✅ DONE** (`category` + `displayName` on `MAP_MARKERS`); remaining: **#4**
   calibration generalization + **#10** `ItemLotParam` placements. The only remaining real gap.
2. **Sign-off on the curated-table drops** (cookbooks/whetblades/pools/colosseums + 2 spirit-ash columns
   - REGIONS.isBoss + map-fragment fine names) — decisions, not extraction.
3. ✅ **REGIONS coverage — RESOLVED.** The "~47%" was matchmaking siblings, not missing data: placed
   regions now name-complete (207→213 via boss-arena fallback) + `MATCHMAKING_REGION_IDS` emitted; only
   3 non-PlayRegionParam outliers remain unclassified. See the verification note above.

## Method

Traced every importer of the three legacy layers — `elden-ring-raw-db/` (via
`er-raw-db.ts`), `lib/erdb.ts`, `lib/map-db.ts` — and recorded the **fields** each consumer
reads, then diffed against what `packages/elden-ring-data/src/generated/*` emits today
(`graces, bosses, weapons, armor, talismans, ashes-of-war, goods, arts, markers`).

## Verdict

|                                                      | Status                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name resolution** (id→name, all item types)        | ◐ **Nearly closed.** New `WEAPONS/ARMOR/TALISMANS/ASHES_OF_WAR/GOODS` cover almost every id. **Gaps: gestures + ammo names** (not in any new dataset).                                                                                          |
| **Rich inventory tables** (`InventoryDataTableCard`) | ❌ **Blocked.** New datasets are lean — **no per-item icons, no `effects`/`requirements`/`rarity`/`category`/`description`, no per-category stat fields.**                                                                                      |
| **Events** (graces/bosses/…)                         | ◐ **Partial.** graces+bosses exist (different field names); **gaps: event-flag id→bit-offset map, and whetblade/cookbook/map/summoning-pool/colosseum tables.**                                                                                 |
| **Regions**                                          | ❌ **Missing.** No `REGIONS` (unlock-id → name/map/flags) dataset.                                                                                                                                                                              |
| **Stats**                                            | ◐ Only `ARCHE_TYPE` is consumed (tiny). `STATS`/`STARTING_CLASSES` are **dead** (see below).                                                                                                                                                    |
| **Map coordinates** (`map-db`)                       | ❌ **Blocked** on map work. New `markers` are raw MSB entities (internal JP names, world x/y/z, uncategorized, uncalibrated) — not English-name-keyed `MapItem`s. Needs #4 (calibration) + #9 (layer/category) + #10 (ItemLotParam placements). |

**Bottom line:** only the lean _weapons-style_ browser tables can migrate today. Retiring the
rich save-aware inventory tables, the events/regions tables, and `map-db` all require new
`er-extractor` output first. The audit below enumerates that output.

## Source-by-source detail

### 1. `elden-ring-raw-db/*_NAME` → id→name (consumed by `vm/inventory.ts`, `vm/equipement.ts`, `share/*`)

| Legacy table     | Covers                                                                                     | New equivalent                                                                                                                                                                                                       | Gap                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `WEAPON_NAME`    | armaments                                                                                  | `WEAPONS[].name`                                                                                                                                                                                                     | ✅ none (names)                                                                                                    |
| `ARMOR_NAME`     | armor                                                                                      | `ARMOR[].name`                                                                                                                                                                                                       | ✅ none                                                                                                            |
| `ACCESSORY_NAME` | talismans                                                                                  | `TALISMANS[].name`                                                                                                                                                                                                   | ✅ none                                                                                                            |
| `AOW_NAME`       | ashes of war                                                                               | `ASHES_OF_WAR[].name`                                                                                                                                                                                                | ✅ none                                                                                                            |
| `ITEM_NAMES`     | goods/consumables/keys/info/crafting/**spells**/**spirits**/tears/remembrances/runes/tools | `GOODS[].name` (categories verified: Spirit Ash, Sorcery, Incantation, Consumable, Key Item, Info Item, Crafting Material, Upgrade Material, Crystal Tear, Remembrance, Great Rune, Crafting Tool, Wondrous Physick) | ⚠️ **gestures + ammo names not covered** (gestures = `EquipParamGesture`, ammo/arrows = `EquipParamWeapon` subset) |

### 2. `lib/erdb.ts` (14 erdb JSON datasets) → rich inventory tables (`InventoryDataTableCard`, `overview-section`, `map-section`)

Fields consumed per row: `id, name, icon, rarity, category, quantity(join), map_data(join)`
plus per-category: weapon `{allow_ash_of_war, is_buffable, weight, upgrade_material, effects[]}`,
armor `{weight, effects[]}`, ashes `{armament_categories[]}`, spells `{fp_cost, sp_cost, is_weapon_buff}`,
spirit `{hp_cost, fp_cost, upgrade_material, summon_name, abilities[]}`, talisman `{weight, effects[], conflicts[]}`,
ammo `{category, effects[]}`.

- **Categories with NO rich new dataset:** ammo, bolstering, crafting, gestures, info, keys,
  shop, spells, spirit, tools (10 of 14). `GOODS` covers their _ids/names_ but lean.
- **Field gaps on every category:** `icon` (image id), `rarity`, `category`, `effects[]`,
  `requirements{}`, `summary`/`description`, per-category stats listed above.
- **Image gap:** per-item icon PNGs. `assets/erdb/icons/**` is still the only icon source;
  the extractor emits menu/system icons, **not** per-item icon sheets.

### 3. Events → `vm/events.ts` (`events-data-table`, `overview`, `story-boss`)

- `RAW_ELDEN_RING_DB.EVENT_FLAGS` = **event-flag id → `[byteOffset, bitPos]`**. The save parser
  ships the raw bitfield; this map is how `vm/events.ts` reads a flag bit. **Gap: emit this
  id→offset map (or a deterministic offset function) from the extractor.** New `GRACES.flagId` /
  `BOSSES.defeatFlagId` give the ids but not their bit offsets.
- `CLEAN_ELDEN_RING_DB.events` event categories: **grace** (→ `GRACES` ✅, rename `flagId`→`id`),
  **boss** (→ `BOSSES` ✅, rename `defeatFlagId`→`id`; legacy also hardcodes a Radahn `id:310`),
  **whetblade / cookbook / map / summoningPool / colosseum** → ❌ **no new dataset** (collectible
  flag trackers).
- `story-boss-section` also imports hardcoded boss portrait PNGs (`assets/erdb/icons/tools/*.png`).

### 4. Regions → `vm/regions.ts` (`regions-data-table`)

- `CLEAN_ELDEN_RING_DB.regions` = `{id, name, map, isOpenWorld, isDungeon, isBoss}` (from
  `REGIONS` + `MAP_NAMES`), where `id` matches `slot.regions.unlocked_regions`. **Gap: emit a
  `REGIONS` dataset** (unlock-id → name/map/flags). `markers` does not provide it.

### 5. Stats → `vm/stats.ts`

- Uses only `ARCHE_TYPE` (archetype id → label). **Gap: tiny `ARCHE_TYPE` map** (or fold into
  a small static enum — arguably not extractor-worthy).
- **Dead legacy (deletable now, no replacement needed):** `STATS.ts`, `STARTING_CLASSES.ts` are
  imported only inside `er-raw-db.ts` and never read by any view. Safe to drop independently.

### 6. Map coordinates → `lib/map-db.ts` (`MAP_DB_ITEMS`, `MapItem`) — consumed everywhere map-related

- Legacy: `MapItem = {category, name, x, y, description}`, keyed by **English entity name**, with
  22 site categories (Bosses, Site of Grace, Weapons, Talismans, …). 2D site-projection coords.
- New `markers`: `{mapId, kind, type:number, name(internal JP), entityId, x, y, z, npcParamId}` —
  raw MSB world entities. **Gaps:** (a) **affine calibration** world→site-pixel (#4); (b)
  **layer/category classification** + English labels (#9); (c) **item-drop placements** by item id
  from `ItemLotParam` (#10). Until those land, `markers` cannot replace `map-db`.

## Extractor gap list (what `er-extractor` must emit)

Grouped; existing task ids in brackets.

1. ✅ **DONE — Per-item rich fields + icons** (#19) — `icon`(+2939 images), `rarity`, `category`,
   `effects[]`, `description`, per-category stats (spell costs, spirit summon, talisman conflicts,
   ashes affinities, weapon upgrade costs). _Remaining polish:_ `requirements{}` on weapons,
   tool fp_cost/availability, effect `conditions`/nested-refs, armor `altered`/`iconFem`.
2. ✅ **DONE — gestures + ammo** (#20) — distinguishable via `category`.
3. ✅ **DONE — Event-flag id → bit-offset** (#21) — `eventFlagOffset()` emitted, verified 1178/1178.
4. ◐ **Collectible event tables** (#22) — **map fragments DONE** (`MAP_FRAGMENTS`, 34 pieces install-derived,
   coarse names only — fine labels were scraped, dropped); cookbooks re-mechanism'd via inventory ownership;
   summoning pools dropped (fake names); whetblades = 12 curated (drop or derive ownership); colosseums = 3 hardcoded.
5. ✅ **DONE — `REGIONS` dataset** (#22) — `PlayRegionParam` rowId (= save `unlocked_regions`) named via grace;
   `isOpenWorld`/`isDungeon` from `areaNo`. 207 regions emitted. Committed `f45ff091`.
6. **`ARCHE_TYPE`** — small archetype id→label (or inline as a static enum in the web app).
7. **Map: calibration [#4] + marker layer/category + English labels [#9] + ItemLotParam
   placements [#10]** — the three pieces that let `markers`/`placements` replace `map-db`.

## Recommended migration order (once gaps close)

1. **Name resolution** (cheapest, nearly ready): point `vm/inventory.ts` + `vm/equipement.ts`
   at `WEAPONS/ARMOR/TALISMANS/ASHES_OF_WAR/GOODS` for names; add gesture/ammo names (gap #2).
   Delete the 5 `*_NAME` tables.
2. **Drop dead legacy now:** `STATS.ts`, `STARTING_CLASSES.ts` (unused).
3. **Events + Regions** (after gaps #3/#4/#5): rewire `vm/events.ts` + `vm/regions.ts`; delete
   `EVENT_FLAGS/GRACES/BOSSES/REGIONS/MAP_NAMES/WHETBLADES/COOKBOOKS/MAPS/SUMMONING_POOLS/COLOSSEUMS`.
4. **Rich inventory tables** (after gap #1 — icons+fields): rewire `erdb.ts`/`InventoryDataTableCard`
   onto the enriched datasets; delete `lib/erdb.ts` + `assets/erdb/json` + `assets/erdb/icons`.
5. **Map** (after #4/#9/#10): rewire onto `markers`/`placements`; delete `lib/map-db.ts`.

Each deletion is diff-verified against the legacy output before removal (the parity gate).
