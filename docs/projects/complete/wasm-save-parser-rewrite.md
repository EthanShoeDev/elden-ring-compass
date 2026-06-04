# WASM Save Parser Rewrite — ER-Save-Lib + Lean DTO

> **Status (2026-06-03): INTEGRATED — runtime-verify pending (now via vitest).** Build +
> typecheck + production build are green and the work is committed (parent monorepo `b045fdb4`).
> The data migration this depended on (task #7 — DLC item **names** via `@elden-ring-compass/data`)
> has since landed (`2cee32e3`), so DLC saves both parse and resolve names. Open items: (1)
> **automated parse verification** — a vitest suite running the wasm parser against the real
> `.sl2` fixtures (`packages/er-save-lib/test/*.sl2`, `apps/web/public/ER0000.sl2`) instead of
> manual browser testing; (2) the follow-up UI features the new DTO now feeds (Ash of War,
> active effects, quest compass).
>
> Replacing the stale vendored save parser
> (a copy of the old **ER-Save-Editor** Rust, pre-DLC) with a thin `wasm-bindgen`
> wrapper around a **fork of [ER-Save-Lib](https://github.com/ClayAmore/ER-Save-Lib)**
> (ClayAmore + vswarte + Nordgaren), the maintainer's _new_ DLC-capable library.
> This is **Phase 3** of `dlc-support.md` ("Own the save parser"). Tracked as task #15.
>
> **Update 2026-06-04 — new reference + an open question about this whole approach.** We cloned
> **[er-save-manager](https://github.com/.../er-save-manager)** (Hapfel, MIT), whose parser is a
> **pure-Python reimplementation of ER-Save-Lib** — the same lib this WASM parser forks
> (`parser/world.py`: _"Based on ER-Save-Lib Rust implementation"_). Two things came out of it:
> (1) it ships a **complete byte-layout spec** (`docs/technical/save-file-structure.md`) and proves
> the **save slots are plain little-endian structs — not Oodle/zstd-compressed** (the Python parser
> imports only `struct` + `hashlib`); (2) that means **a pure-TS read-only parser is now feasible
> with no Rust/clang/wasm toolchain at all**, which could let us delete this whole WASM stack.
> Whether that's worth doing is its own decision → **`typescript-save-parser-port.md`**.

## Why

- The current parser in `packages/elden-ring-save-parser/src/` is the old ER-Save-Editor
  parsing logic, frozen pre-DLC. DLC saves either fail to parse or misread.
- ER-Save-Lib is the maintainer's reorganized, **DLC-capable** library (clean param IDs,
  DLC FMG name tables, current save offsets + event-flag bit formula).
- The save byte-layout is the **one intrinsic, non-self-updating dependency** (`dlc-support.md` §7):
  it's reverse-engineered, not described in the install dir. Owning a fork lets us
  carry our wasm changes and update offsets on our own schedule.

## Architecture

```
packages/
├── er-save-lib/                 # git submodule → fork EthanShoeDev/ER-Save-Lib (branch: wasm-compat)
│   └── src/api/web_export.rs    # NEW additive module: LeanSave DTO + SaveApi::lean_export()
└── elden-ring-save-parser/      # our wasm-bindgen WRAPPER crate (@elden-ring-compass/save-parser)
    └── src/lib.rs               # parse_save(bytes) -> JsValue (serde-wasm-bindgen of LeanSave)
```

- **No source changes were needed to compile ER-Save-Lib to wasm32** — only **clang** (see
  [Build] below). `zstd-sys` ships a wasm-shim; clang is the sole requirement.
- The fork stays minimal & rebaseable: one **additive** file (`web_export.rs`) + a `pub mod`
  line + `serde` dep. We do **not** modify upstream parsing logic.
- The wrapper owns the wasm boundary (cdylib + wasm-bindgen + serde-wasm-bindgen). The fork
  stays a plain Rust lib.

### Design decisions (2026-06-02, with EthanShoeDev)

1. **Fork + targeted additions + new DTO** (not "serialize the whole tree", not "no fork").
2. **One `parse_save(bytes)` call**, not a chatty per-field bridge. Returns a lean object;
   everything else happens in JS. (Rejected: stateful `SaveHandle` w/ per-flag methods — too
   many Comlink round-trips. Rejected: shipping the full raw tree — see "What we drop".)
3. **Rust trims + resolves IDs; JS resolves names.** Names stay in JS against the data layer
   (which becomes extractor-sourced — the single-source-of-truth goal in `client-side-db.md`).
   So the parser emits item **IDs**; DLC item **names** arrive via the data migration (task #7),
   not from ER-Save-Lib's baked tables (which would be a competing source). DLC saves **parse**
   now; DLC names light up when the data layer lands.
4. **Event flags**: ship the raw bitfield **with trailing zeros trimmed** (preserves byte
   offsets, ~1.77 MB → tens of KB). `events.ts`'s existing grace/boss bit-math keeps working
   unchanged. No id-list coupling, no extra calls. **Shipping the whole region (not a fixed
   id→bool map) keeps every flag addressable** — a future **quest compass** can read any quest
   event flag with zero parser changes (an unset high-offset flag sits in the trimmed tail and
   reads `false`; once the game sets it, that byte is included).
5. **Shape-compatible DTO**: keep the field names the view-models already read
   (`player_game_data.*`, `event_flags.flags`, `regions.*`, `ga_items`, `chr_asm2`,
   `equip_inventory_data`, …) so `vm/*`, stores, and share code barely change. Cleanups:
   `character_name` becomes a `string` (was a u16 byte array).

## Build

- **Toolchain**: rustup + `wasm32-unknown-unknown` target + `wasm-pack` (native Windows works —
  see memory `local-dev-env`). **clang is required** for `zstd-sys`'s wasm C build:
  installed LLVM via `winget install --id LLVM.LLVM` → `C:\Program Files\LLVM\bin`.
  Prepend that to PATH per shell (not auto-added).
- `bun run build:wasm-parser` → `wasm-pack build --target web` → `packages/elden-ring-save-parser/pkg/`.
  The web app imports `@elden-ring-compass/save-parser` (workspace) → `pkg/`.

---

## What the website CURRENTLY needs from a save (KEEP)

Sourced by mapping ER-Save-Lib's `UserDataX` (per character slot) → the lean DTO.

| DTO field                                                                                                                                                  | ER-Save-Lib source                              | Consumed by                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `player_game_data.{vigor..arcane, level, souls(=runes), soulsmemory(=runes_memory), gender, arche_type(=archetype), match_making_wpn_lvl, character_name}` | `player_game_data`                              | `vm/stats.ts`, slot selection, share                                                 |
| `event_flags.flags` (trailing-zero-trimmed)                                                                                                                | `event_flags: Vec<u8>`                          | `vm/events.ts` (grace/boss bits), `vm/regions.ts`                                    |
| `regions.{unlocked_regions, unlocked_regions_count}`                                                                                                       | `unlocked_regions`                              | `vm/regions.ts`                                                                      |
| `ga_items[] {gaitem_handle, item_id, gem_gaitem_handle}` (non-empty only)                                                                                  | `gaitem_map` (subset)                           | `vm/inventory.ts`, `vm/equipement.ts`; `gem_gaitem_handle` → equipped **Ash of War** |
| `sp_effects[] {sp_effect_id, remaining_time}` (active only)                                                                                                | `sp_effects`                                    | future "active buffs/effects" display                                                |
| `chr_asm2` equipped handles (hands×3, arrows×2, bolts×2, head/chest/arms/legs, talismans×4)                                                                | `equipped_items_gaitem_handle`                  | `vm/equipement.ts`                                                                   |
| `equip_inventory_data.{common_items, key_items, counts}`                                                                                                   | `inventory_held`                                | `vm/inventory.ts`, `vm/equipement.ts`                                                |
| `storage_inventory_data.common_items`                                                                                                                      | `inventory_storage_box`                         | `vm/inventory.ts`                                                                    |
| `equip_item_data.{quick_slot_items, pouch_items}` (handles)                                                                                                | `equipped_items`                                | `vm/equipement.ts`                                                                   |
| `player_coords`                                                                                                                                            | `player_coordinates`                            | `vm/stats.ts` (display)                                                              |
| `steam_id` (per slot), top-level `global_steam_id`                                                                                                         | `user_data_x.steam_id`, `user_data_10.steam_id` | selector, slot selection                                                             |

Inventory item `inventory_index` = ER-Save-Lib `InvenotryItem.aqcuistion_index` (same u32).

---

## What we DROP from the save (and what each is, so we can re-add)

All of the below are **parsed by ER-Save-Lib but omitted from the lean DTO**. Re-adding any is a
small, additive change to `web_export.rs` + the wrapper's DTO + the web types. Approx sizes are
per slot (PC); a save holds up to 10 slots.

| Dropped data                     | ER-Save-Lib field                                                                                                                           | Size               | What it is                                                                                                                                                                                         | Re-add it for…                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **NetMan**                       | `net_man`                                                                                                                                   | **128 KB**         | Network-manager session blob (multiplayer/summon-sign plumbing)                                                                                                                                    | (no display use)                                                           |
| **Event-flag tail**              | `event_flags` zeros                                                                                                                         | ~1.7 MB            | Trailing zero bytes of the 1.77 MB flag region (we keep the non-zero prefix)                                                                                                                       | (never — zeros are implicit)                                               |
| **gaitem_map padding**           | `gaitem_map` empties                                                                                                                        | ~148 KB            | Full 5,120-slot table. We keep non-empty `(handle, item_id, gem_gaitem_handle)`; only empty slots are dropped. (`gem_gaitem_handle` → Ash of War is KEPT.)                                         | (nothing — empties are implicit)                                           |
| **GaitemGameData**               | `gaitem_game_data`                                                                                                                          | ~112 KB            | 7,000 entries of `(id, next_item_id)`. The old shape called the 3rd u32 `reinforce_type`; the share format encoded it but nothing rendered it (upgrade level comes from `ga_items.item_id % 100`). | Cross-checking reinforcement; otherwise redundant with `ga_items`          |
| **Face data**                    | `face_data`                                                                                                                                 | ~310 B             | Full character-creator appearance: face/hair/beard models, ~150 sliders, all colors, **body sliders** (head/chest/abdomen/arms/legs size)                                                          | **three.js character render**, appearance display                          |
| **Equipped spells**              | `equipped_spells`                                                                                                                           | ~120 B             | 14 equipped magic/incantation slots + active index                                                                                                                                                 | Showing equipped **spells**                                                |
| **Equipped gestures / gestures** | `equipped_gestures`, `gestures`                                                                                                             | ~280 B             | 6 equipped gesture slots + 0x40 gesture unlock ids                                                                                                                                                 | **Gestures** unlocked/equipped                                             |
| **Acquired projectiles**         | `acquired_projectiles`                                                                                                                      | var                | List of acquired arrow/bolt/projectile ids                                                                                                                                                         | Projectile collection tracking                                             |
| **Blood stain**                  | `blood_stain`                                                                                                                               | ~64 B              | Last-death location (coords + map id) + runes lost                                                                                                                                                 | "Last death" marker on the map                                             |
| **Horse / Torrent**              | `horse` (RideGameData)                                                                                                                      | ~44 B              | Torrent coords, map id, angle, HP, state                                                                                                                                                           | Mount state display                                                        |
| **World area / geom**            | `world_area`, `world_geom_man`, `world_geom_man2`, `rend_man`, `field_area`                                                                 | var (can be large) | Persistent world state: opened doors, destroyed objects, fog-gate/lever state per map block (GEOM/GEOF), render/stage state                                                                        | Fine-grained world-progression (doors/levers/objects opened)               |
| **Weather / time**               | `world_area_weather`, `world_area_time`                                                                                                     | ~24 B              | Current in-game weather id + time (h/m/s)                                                                                                                                                          | Showing in-game time/weather                                               |
| **Misc managers**                | `menu_profile_save_load`, `trophy_equip_data`, `tutorial_data`, `ps5_activity`, `dlc`, `base_version`, `player_data_hash`, assorted `unk_*` | var                | Menu/trophy/tutorial state, PS5 activity card, DLC ownership bits, version + integrity hash                                                                                                        | Rarely useful; `player_data_hash` only needed for **save editing/writing** |

> **Note on save editing.** ER-Save-Lib supports writing saves (re-encrypt, recompute
> `player_data_hash` + per-section md5 checksums). Our DTO is **read-only**; a future
> save-editor feature would call ER-Save-Lib's write path directly rather than round-tripping
> the lean DTO.

---

## Cheap DTO additions surfaced by er-save-manager (2026-06-04)

`er-save-manager/docs/technical/save-file-structure.md` is the clearest byte-layout spec we
have for the format — keep it as the reference. It also highlights fields that sit inside
structs **we already parse**, so re-adding them is a pure DTO change (no new struct walking):

- **`PlayerGameData` (we already read it for stats) carries more than we surface:** current/
  max/base **HP·FP·stamina**, the seven **buildup resistances** (poison/rot/bleed/death/frost/
  sleep/madness, offsets `0x70–0x88`), **max crimson/cerulean flask counts** (`0xF9/0xFA`),
  `additional_talisman_slot_count`, `summon_spirit_level`, `great_rune_on`, `voice_type`,
  `gift`. Good candidates for a richer character-overview card.
- **Small dropped structs with real display value** (see the DROP table above): `blood_stain`
  (last-death marker), `horse`/Torrent state, `world_area_weather`/`world_area_time`,
  `equipped_spells` (14 slots), `gestures` (er-save-manager ships a gesture name DB).
- **Platform support:** the spec documents PC (`BND4`/`SL2\x00`), **PlayStation** (`CB019C2C`,
  no checksums), and **Switch** magic + their offset/checksum differences. Our parser is
  **PC-only**; adding magic detection is a bounded win if non-PC saves matter.

(If we go the `typescript-save-parser-port.md` route, fold these in during the port instead.)

---

## TODO

- [x] Fork `ClayAmore/ER-Save-Lib` → `EthanShoeDev/ER-Save-Lib`, add as submodule `packages/er-save-lib` (branch `wasm-compat`).
- [x] Add `web_export.rs` (LeanSave + `SaveApi::lean_export`) to the fork; push `wasm-compat` (commit `5833de1`).
- [x] Rewrite wrapper `lib.rs` → `parse_save(bytes)`; depend on the submodule (`er-save-lib` path dep).
- [x] Delete the old vendored parser src (`db/`, `read/`, `save/`, `util/`, `vm/`, `write/`, `utils.rs`, tests).
- [x] `wasm-pack build --target web` → green (zstd via clang/wasm-shim).
- [x] Rewrite web `wasm-wrapper.ts` types + adjust `vm/*`, stores, `share/{encode,decode}.ts`, `atoms/save.ts`. Removed stale `apps/web/src/elden-ring-save-parser.d.ts` shim (shadowed the real types).
- [x] Web `typecheck` + production `build` green.
- [x] Remove the dead `packages/ER-Save-Editor` submodule entry.
- [x] **Runtime-verify the base save via vitest** (not manual browser testing) — `apps/web/src/lib/wasm-save-parser.test.ts`, an `@effect/vitest` suite that `initSync`s the wasm from disk bytes (no fetch/DOM/browser-mode needed) and asserts the lean DTO against `apps/web/public/ER0000.sl2`: top-level shape, per-slot stats/level/runes, the trimmed event-flag bitfield, `ga_items` handles+ids, `chr_asm2`, and the regions parity. Uses `@effect/platform-node` `NodeServices.layer` for `FileSystem`/`Path` (vitest workers run on Node even under `bun run`). **Finding (resolved):** the regions verification surfaced that `unlocked_regions` mixes placed regions (`REGIONS`) with multiplayer matchmaking siblings (`MATCHMAKING_REGION_IDS`); the extractor now emits both (placed 207→213 via boss-arena naming) and the test asserts the full classification — see `data-parity-audit.md`.
- [ ] **Runtime-verify a DLC save** — add a committed DLC `.sl2` fixture (or wire the submodule's `packages/er-save-lib/test/*.sl2`) and extend the suite: DLC item ids, DLC graces/bosses, larger region set.
- [x] Commit the parent monorepo (submodule gitlink + `.gitmodules` + wrapper + web changes + this doc) — landed in `b045fdb4` alongside the tiled-map + Base UI work.
- [x] **Equipped Ash of War** display (via `gem_gaitem_handle`) — `equipmentDbView` resolves each
  armament's gem handle → AoW id → name; surfaced in the new **Equipment card** (`components/sections/
  equipment-card.tsx`) in the Overview (no equipment panel existed before — the VM had been dormant).
- [x] **Active effects** display (via `sp_effects`) — new install-derived `SP_EFFECT_LABELS` dataset
  (`er-extractor/src/game/sp-effect-labels.ts`, 1,626 labels) inverts item→SpEffect refs
  (consumable `refId_default`, talisman/spell `refId`, gear `residentSpEffectId*`) so a save's active
  `sp_effects[]` get item names; rendered in the new **Active Effects card**. **⚠️ Known limitation
  (documented, deferred): nested-ref coverage.** Many *active* SpEffect ids are **leaf** effects reached
  only by walking an item's directly-referenced SpEffect through its own ref fields
  (`cycleOccurrenceSpEffectId`, conditional sub-effects, Bullet→SpEffect for buff spells). We map only
  direct refs, so coverage is partial (e.g. Golden Vow resolves — direct ref; Flame Grant Me Strength /
  Wondrous Physick don't — nested). The web shows `Effect #<id>` (here: an unlabeled count) for those.
  Closing it needs a recursive SpEffectParam ref-walk — the same fast-follow noted in `game/effects.ts`;
  revisit both together. NOTE: the `ER0000.sl2` test fixture is a fresh save with ~no active buffs, so
  end-to-end card verification needs a save that has them.
- [ ] Follow-up feature still open: **quest compass** (arbitrary event flags) — deferred, but
  **now unblocked**: a curated 36-questline absolute-flag dataset (`quest_flags_db.py`) reads
  straight through the existing flag bitfield + `eventFlagOffset()`. See `quest-compass.md`.
