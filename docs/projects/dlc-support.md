# DLC Support Plan: Shadow of the Erdtree

> **Goal**: Add Shadow of the Erdtree DLC progression tracking to eldenringcompass.com

## Current State

### Dependencies Status

| Package | Version | DLC Support | Notes |
|---------|---------|-------------|-------|
| [erdb](https://github.com/EldenRingDatabase/erdb) | v0.4.0 | ❌ None | Last updated July 2023 with 1.10.0 gamedata (pre-DLC). No activity since. |
| [ER-Save-Editor](https://github.com/ClayAmore/ER-Save-Editor) | 0.0.21 | ⚠️ Partial | Can READ DLC save files (updated offsets June 2024), but db/ has NO DLC item data |

### What Data We Need

| Data Type | Current Source | Used For |
|-----------|---------------|----------|
| Item IDs & Names | ER-Save-Editor `db/item_name.rs` | Inventory display |
| Weapon IDs & Names | ER-Save-Editor `db/weapon_name.rs` | Inventory display |
| Armor IDs & Names | ER-Save-Editor `db/armor_name.rs` | Inventory display |
| Bosses & Event Flags | ER-Save-Editor `db/bosses.rs` | Boss tracker |
| Graces | ER-Save-Editor `db/graces.rs` | Grace tracker |
| Regions | ER-Save-Editor `db/regions.rs` | Region completion |
| Event Flags | ER-Save-Editor `db/event_flags.rs` | Progression tracking |
| Map Data | Custom `map-db.ts` | Interactive map |

---

## Current Data Pipeline vs erdb

### How We Currently Get Data

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CURRENT DATA FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ER-Save-Editor (ClayAmore)                                             │
│  └── src/db/*.rs  ──────────────────┐                                   │
│      • Manually curated Rust files  │                                   │
│      • ~34,000 lines of data        │    ┌──────────────────────────┐   │
│      • Last data update: pre-DLC    │    │  Our WASM Parser         │   │
│      • NOT auto-generated           ├───►│  packages/.../src/db/*.rs│   │
│                                     │    │  (copy of ER-Save-Editor)│   │
│  Unknown origin - likely:           │    └──────────────────────────┘   │
│  • Manual wiki scraping             │                                   │
│  • Community contributions          │    ┌──────────────────────────┐   │
│  • Some game file extraction        ├───►│  Web App TypeScript      │   │
│                                          │  apps/.../elden-ring-    │   │
│                                          │  raw-db/*.ts             │   │
│                                          │  (manually converted)    │   │
│                                          └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key problem**: ER-Save-Editor's db/ files are manually maintained and haven't been updated with DLC content. The maintainer only added save file format compatibility (offsets/checksums), not item data.

### How erdb Gets Data (The "Right" Way)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ERDB DATA FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Elden Ring Installation (PC)                                           │
│  └── regulation.bin                                                     │
│  └── msg/engus/*.msgbnd.dcx                                             │
│  └── param/gameparam/*.param                                            │
│             │                                                           │
│             ▼                                                           │
│  ┌─────────────────────────────────────────────┐                        │
│  │  Extraction Tools (Windows only)            │                        │
│  │  • Yabber/WitchyBND - unpack archives       │                        │
│  │  • ERExporter - export params to CSV        │                        │
│  │  • UXM Selective Unpacker - decrypt files   │                        │
│  └─────────────────────────────────────────────┘                        │
│             │                                                           │
│             ▼                                                           │
│  ┌─────────────────────────────────────────────┐                        │
│  │  erdb Python tool                           │                        │
│  │  • Reads extracted CSV/XML files            │                        │
│  │  • Combines data from multiple params       │                        │
│  │  • Generates clean JSON output              │                        │
│  │  • Serves REST API                          │                        │
│  └─────────────────────────────────────────────┘                        │
│             │                                                           │
│             ▼                                                           │
│  ┌─────────────────────────────────────────────┐                        │
│  │  Output: JSON files per game version        │                        │
│  │  • Weapons, armor, items, talismans         │                        │
│  │  • Complete stats, scaling, requirements    │                        │
│  │  • Stored in data/gamedata/X.X.X.zip        │                        │
│  └─────────────────────────────────────────────┘                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### erdb Dependency Chain

```
erdb
├── Python 3.11+
├── Pillow (image processing)
├── FastAPI + Uvicorn (REST API)
├── Pydantic (data validation)
└── External Windows tools:
    ├── ERExporter v1.1.0 (Nov 2022) ⚠️ OUTDATED
    │   └── Extracts param files to CSV
    │   └── Last commit: 2022, pre-DLC
    │   └── May not handle new DLC params
    │
    ├── Yabber v1.3.1 (2019) ⚠️ OUTDATED
    │   └── Unpacks .dcx/.bnd archives
    │   └── Superseded by WitchyBND
    │
    └── Paramdex (from Yapped Rune Bear)
        └── Param field names/definitions
        └── Needs DLC param definitions
```

### What Would Break If You Fork erdb?

| Component | Status | Issue |
|-----------|--------|-------|
| Python code | ✅ Should work | Pure Python, well-structured |
| ERExporter | ⚠️ Risk | Last updated 2022, may not read DLC regulation.bin |
| Yabber | ⚠️ Risk | Old, may not handle DLC archive format changes |
| Param definitions | ❌ Missing | DLC adds new params, need updated Paramdex |
| Game version detection | ❌ Needs update | Hardcoded versions only go to 1.10 |

### Modern Alternative: WitchyBND

[WitchyBND](https://github.com/ividyon/WitchyBND) is the actively maintained successor to Yabber:

- ✅ Supports Elden Ring + DLC + Nightreign
- ✅ Updated for latest game encryption
- ✅ Uses latest SoulsFormatsNEXT
- ✅ Has updated Paramdex from Smithbox
- ❌ Different output format than erdb expects
- ❌ Would need to rewrite erdb's extraction pipeline

### Comparison: Forking erdb vs Other Options

| Approach | Effort | Completeness | Maintainability | Risk |
|----------|--------|--------------|-----------------|------|
| **Fork erdb + update tools** | High (1-2 weeks) | Complete | Best | ERExporter may be broken |
| **Fork erdb + use WitchyBND** | Very High (2-4 weeks) | Complete | Best | Major rewrite needed |
| **Scrape from multiple sources** | Medium (1-2 days) | Good (80%) | Poor | Data inconsistencies |
| **Manual data entry** | Low-Medium | Partial | Poor | Human error, tedious |

### Recommendation

**If you want complete, maintainable DLC support:**

1. **First**: Try forking erdb and running extraction with existing tools
   - May "just work" if ERExporter handles DLC params
   - Quick to test (few hours)

2. **If ERExporter fails**: Choose between:
   - **Update ERExporter** - C# tool, need to update SoulsFormats dependency
   - **Switch to WitchyBND** - More work but better long-term (active development)

3. **Fallback**: Scrape from practice-tool + Grand Archives (Option B)
   - Gets you 80% of the way quickly
   - Can migrate to erdb later

### Critical Gap: erdb Doesn't Have Everything We Need

Even if erdb worked perfectly, it **doesn't provide** all the data we use:

| Data Type | erdb Provides? | We Need It? | Alternative Source |
|-----------|---------------|-------------|-------------------|
| Weapons (stats, scaling) | ✅ Yes | ✅ Yes | - |
| Armor (stats, weight) | ✅ Yes | ✅ Yes | - |
| Items (consumables) | ✅ Yes | ✅ Yes | - |
| Talismans | ✅ Yes | ✅ Yes | - |
| Ashes of War | ✅ Yes | ✅ Yes | - |
| Spells/Incantations | ✅ Yes | ✅ Yes | - |
| **Bosses + Event Flags** | ❌ No | ✅ Yes | Grand Archives CT, Debug Tool |
| **Graces + IDs** | ❌ No | ✅ Yes | Grand Archives CT, Debug Tool |
| **Regions** | ❌ No | ✅ Yes | Manual curation |
| **Map coordinates** | ❌ No | ✅ Yes | Manual curation / game extraction |

**Bottom line**: erdb is great for item/equipment data but we'd still need to source boss/grace/region data from elsewhere, regardless of which approach we take.

---

## Available Data Sources

### 1. eldenring-practice-tool (Best for Items)

- **Repo**: https://github.com/veeenu/eldenring-practice-tool
- **File**: `xtask/src/codegen/item_ids.yml`
- **Status**: ✅ Actively maintained, supports v1.16.1
- **Format**: YAML with hex IDs

**What it has**:
- ✅ All DLC weapons (Milady, Backhand Blade, etc.)
- ✅ All DLC armor (Messmer's, Gaius's, etc.)
- ✅ All DLC items (Euporia, etc.)
- ❌ No bosses
- ❌ No graces
- ❌ No event flags
- ❌ No regions

**Sample data**:
```yaml
weapons:
  "Milady": 0x0405F7E0
  "Backhand Blade": 0x03D83120
  "Euporia": 0x00A037A0
armor:
  "Messmer's Helm": 0x104FA6A0
  "Gaius's Armor": 0x102DEE34
```

**Extraction effort**: Low - just parse YAML

---

### 2. The Grand Archives Cheat Engine Table

- **Repo**: https://github.com/The-Grand-Archives/Elden-Ring-CT-TGA
- **Status**: ✅ Actively maintained
- **Format**: Cheat Engine XML/Lua

**What it has**:
- ✅ DLC graces with IDs
- ✅ DLC boss defeat flags
- ✅ Warp coordinates
- ⚠️ Data buried in CE table format

**Extraction effort**: Medium - need to parse Cheat Engine table format

---

### 3. Nordgaren's Elden Ring Debug Tool

- **Repo**: https://github.com/Nordgaren/Elden-Ring-Debug-Tool
- **Status**: ✅ Updated for DLC
- **Format**: C# source code

**What it has**:
- ✅ DLC items
- ✅ DLC graces
- ⚠️ Item event flags NOT working for DLC yet
- ⚠️ Data in C# code, needs extraction

**Extraction effort**: Medium - parse C# source files

---

### 4. Elden Ring Event Flag Reference

- **Site**: https://soulsmods.github.io/elden-ring-eventparam/
- **Repo**: https://github.com/soulsmods/elden-ring-eventparam
- **Format**: Web/JSON

**What it has**:
- ✅ Comprehensive event flag database
- ❓ DLC coverage unknown (needs verification)

**Extraction effort**: Low if JSON available

---

### 5. Impalers-Archive (Text Dumps)

- **Repo**: https://github.com/ividyon/Impalers-Archive
- **Status**: DLC text dump
- **Format**: Raw text files

**What it has**:
- ✅ All DLC item/weapon/armor names and descriptions
- ❌ No IDs
- ❌ No event flags
- ❌ No structured data

**Use case**: Reference for names/descriptions only

---

### 6. Extract Data Yourself (Nuclear Option)

Use tools to extract directly from game files:

- **ERExporter**: https://github.com/EldenRingDatabase/ERExporter
- **Yabber**: https://github.com/JKAnderson/Yabber (unpack game archives)
- **SoulsFormats**: https://github.com/JKAnderson/SoulsFormats

**What you'd get**:
- ✅ Complete, authoritative data
- ✅ All items, bosses, graces, event flags
- ❌ Requires owning the game + DLC on PC
- ❌ Significant setup effort
- ❌ Need to understand FromSoft file formats

---

## Implementation Options

### Option A: Minimal - Items Only

**Scope**: Add DLC items/weapons/armor to inventory display

**Data source**: eldenring-practice-tool `item_ids.yml`

**Steps**:
1. Download `item_ids.yml` from practice-tool repo
2. Write parser script to convert YAML → TypeScript
3. Merge with existing `ITEM_NAMES.ts`, `WEAPON_NAME.ts`, `ARMOR_NAME.ts`
4. Update Rust parser's `db/` files with same data
5. Rebuild WASM parser

**Effort**: ~2-4 hours
**Coverage**: Items only, no DLC progression tracking

---

### Option B: Moderate - Items + Graces + Bosses

**Scope**: Add DLC items AND basic progression (graces discovered, bosses defeated)

**Data sources**:
- eldenring-practice-tool for items
- The Grand Archives CT for graces and boss flags
- Manual research for missing pieces

**Steps**:
1. Extract items from practice-tool (Option A)
2. Parse Grand Archives CE table for grace IDs and boss event flags
3. Research/verify DLC region structure
4. Create new region entries for Shadow Realm areas:
   - Gravesite Plain
   - Scadu Altus
   - Shadow Keep
   - Rauh Base/Ancient Ruins
   - Abyssal Woods
   - Etc.
5. Update all TypeScript data files
6. Update Rust parser db files
7. Rebuild WASM parser
8. Add DLC regions to UI components

**Effort**: ~1-2 days
**Coverage**: Good DLC support for main features

---

### Option C: Complete - Full DLC Support

**Scope**: Complete parity with base game features

**Data sources**: Multiple sources + manual verification

**Steps**:
1. Complete Option B
2. Add DLC map markers (if map images available)
3. Add DLC cookbooks
4. Add DLC summoning pools
5. Add all DLC event flags for side content
6. Add DLC quest tracking (if implementing quests feature)
7. Thorough testing with real DLC save files

**Effort**: ~3-5 days
**Coverage**: Full DLC support

---

### Option D: Self-Extract (Most Complete)

**Scope**: Extract all data directly from game files

**Requirements**:
- Elden Ring + DLC installed on PC
- Python environment for erdb
- Understanding of FromSoft param files

**Steps**:
1. Fork erdb repository
2. Update erdb to support 1.12+ game versions
3. Run extraction against your game installation
4. Generate fresh JSON/data files
5. Convert to TypeScript format
6. Update Rust parser
7. Consider contributing back to erdb

**Effort**: ~1-2 weeks (including learning curve)
**Coverage**: Complete and authoritative

---

## DLC Content Inventory

### DLC Regions (Shadow Realm)

| Region | Sub-areas |
|--------|-----------|
| Gravesite Plain | Belurat area, Castle Ensis approach |
| Scadu Altus | Fort of Reprimand, Moorth Ruins, Church District |
| Shadow Keep | Main keep, Specimen Storehouse, Dark Chamber |
| Rauh Base | Rauh Ancient Ruins, Temple Town |
| Abyssal Woods | Midra's Manse area |
| Cerulean Coast | Southern coastal area |
| Charo's Hidden Grave | Underground area |
| Stone Coffin Fissure | Vertical dungeon |
| Finger Ruins | Metyr boss area |

### Major DLC Bosses

| Boss | Location |
|------|----------|
| Divine Beast Dancing Lion | Belurat |
| Rellana, Twin Moon Knight | Castle Ensis |
| Golden Hippopotamus | Shadow Keep |
| Messmer the Impaler | Shadow Keep |
| Romina, Saint of the Bud | Rauh Ancient Ruins |
| Putrescent Knight | Stone Coffin Fissure |
| Midra, Lord of Frenzied Flame | Midra's Manse |
| Metyr, Mother of Fingers | Finger Ruins |
| Bayle the Dread | Jagged Peak |
| Promised Consort Radahn | Enir-Ilim |

### DLC Grace Count

~80+ new Sites of Grace in Shadow Realm

---

## Recommended Approach

**For quickest results**: Start with **Option B** (Moderate)

1. Items are easy to add from practice-tool
2. Graces/bosses from Grand Archives gives good progression tracking
3. Can iterate and add more later

**For best long-term**: Consider **Option D** (Self-Extract)

- erdb is the "right" solution but abandoned
- Forking and updating it benefits the community
- Most maintainable long-term

---

## Data File Mapping

| Data Type | Rust Parser File | Web App File |
|-----------|-----------------|--------------|
| Items | `packages/elden-ring-save-parser/src/db/item_name.rs` | `apps/web/src/lib/elden-ring-raw-db/ITEM_NAMES.ts` |
| Weapons | `packages/elden-ring-save-parser/src/db/weapon_name.rs` | `apps/web/src/lib/elden-ring-raw-db/WEAPON_NAME.ts` |
| Armor | `packages/elden-ring-save-parser/src/db/armor_name.rs` | `apps/web/src/lib/elden-ring-raw-db/ARMOR_NAME.ts` |
| Bosses | `packages/elden-ring-save-parser/src/db/bosses.rs` | `apps/web/src/lib/elden-ring-raw-db/BOSSES.ts` |
| Graces | `packages/elden-ring-save-parser/src/db/graces.rs` | `apps/web/src/lib/elden-ring-raw-db/GRACES.ts` |
| Regions | `packages/elden-ring-save-parser/src/db/regions.rs` | `apps/web/src/lib/elden-ring-raw-db/REGIONS.ts` |
| Event Flags | `packages/elden-ring-save-parser/src/db/event_flags.rs` | `apps/web/src/lib/elden-ring-raw-db/EVENT_FLAGS.ts` |

---

## Resources

- [eldenring-practice-tool](https://github.com/veeenu/eldenring-practice-tool) - Item IDs
- [The Grand Archives CT](https://github.com/The-Grand-Archives/Elden-Ring-CT-TGA) - Graces, boss flags
- [Nordgaren's Debug Tool](https://github.com/Nordgaren/Elden-Ring-Debug-Tool) - DLC items/graces
- [soulsmods event flags](https://soulsmods.github.io/elden-ring-eventparam/) - Event flag reference
- [Impalers-Archive](https://github.com/ividyon/Impalers-Archive) - Text dumps
- [erdb](https://github.com/EldenRingDatabase/erdb) - Original data extractor (outdated)
- [ER-Save-Editor](https://github.com/ClayAmore/ER-Save-Editor) - Save file format reference

---

## Next Steps

1. [ ] Decide on implementation option (A/B/C/D)
2. [ ] Clone/download required data sources
3. [ ] Write conversion scripts for chosen data format
4. [ ] Update Rust parser db files
5. [ ] Update TypeScript data files
6. [ ] Rebuild WASM parser
7. [ ] Test with DLC save file
8. [ ] Update UI to show DLC regions
