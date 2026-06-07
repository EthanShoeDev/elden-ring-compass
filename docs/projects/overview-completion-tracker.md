# Overview → a shareable 100% completion tracker

> **Status (2026-06-07): v1 BUILT (Option A).** Captures two related asks from
> `cleanup.md` (the "% collected breakdown on overview" item + the "data table of
> everything collected and not" item) plus the "empty avatar circle" cleanup item.
> Direction set in conversation: the **Overview** page becomes a player-focused,
> shareable "how close am I to 100%?" page — _not_ a catalogue browser. Browsing
> the full game (every variant, owned or not) stays in the **Inventory** tables.
>
> **Shipped:** `lib/completion.ts` (`useCompletion` — curated denominators, weapon+armor
> variant-collapse, equal-weight overall %, milestone sets), `completion-ring.tsx`,
> `completion-overview.tsx` (`CompletionHero` + `CompletionBreakdown` + milestone chips),
> rebuilt `overview-section.tsx` (hero ring replaces the empty avatar; tiles gone), dropped the
> broken `Avatar` from `slot-overview.tsx`, and the **All/Owned/Missing** segmented filter on
> `inventory-data-table-card.tsx`. Also filtered the `[ERROR]Type N` junk rows at the catalog
> source. Verified: typecheck + oxfmt + oxlint clean. (Full `vite build` blocked by an unrelated
> Windows file-lock in the map-tiles copy plugin when a dev server is running — not this code.)
>
> **Still TODO (not blockers):** deep-link the breakdown rows to the inventory category with the
> **Missing** filter pre-selected (needs a search param on `/inventory/$category`; v1 just
> navigates to the category); curated "Legendary Armaments/Talismans/…" milestone id sets; verify
> the armor "(Altered)" collapse against in-game obtainability; DLC bucketing; full save-in-URL
> share (v1 ships a "Copy snapshot" text button). See "Open questions" below.

## The two surfaces, and why they're different

The confusion in the original ask ("sometimes a table of everything in game, sometimes
just what I collected") dissolves once we split it across the two surfaces we already have:

| | **Overview** (this overhaul) | **Inventory `/inventory/$category`** (exists) |
|---|---|---|
| Audience question | "How complete is _my_ run?" | "Tell me about _this item / all items_" |
| Scope | The player. Curated, meaningful collectibles only. | The whole game catalogue, every variant. |
| Denominator | Curated 100% sets (see below) | Raw dataset rows |
| Shareable | Yes — it's the headline artifact | No — it's a reference tool |
| Owned vs not | Always "owned out of obtainable" | **User toggles** Owned / Missing / All |

So: **Overview = the trophy card. Inventory = the encyclopedia.** Both show ownership,
but one curates for a satisfying %, the other shows everything.

## Why the current "Items Collected 463 / 5709" is broken

`overview-section.tsx` sums `useInventoryTables()`:
`itemsTotal = Σ table.items.length`. Real measured counts (`packages/data`, 2026-06-07):

```
 3265  armaments (raw, incl. ~13 affinity variants each)
  481  armaments (base weapons only)          <- what a player means by "a weapon"
   68  ammo
  768  armor (incl. altered/variant rows)
  155  talismans (incl. +1/+2 upgrade rows)
  116  ashes of war
  213  spells (incl. variant rows)
   84  spirit ashes
  505  tools (consumables, crystal tears, crafting tools, cookbooks)
  106  crafting materials
   43  upgrade materials (smithing-stone tiers — infinite via bell bearings)
  228  key items
  105  info items (menu/notes text — not collectibles at all)
   53  gestures
 ----
 5709  RAW TOTAL  (== the misleading denominator today)
 2925  after collapsing weapon variants only
```

Two independent problems:
1. **Variant inflation** — 3265 weapon rows for ~481 weapons; same pattern in armor/talismans/spells.
2. **Non-collectible noise** — info items, crafting materials, smithing-stone stacks, ammo, most
   consumables. Nobody "100%s" their arrow count. Counting them means 100% is mathematically
   unreachable, so the % is demotivating and meaningless.

A completion tracker needs a **curated denominator**: only things a player deliberately _collects_.

## The completion model (`completion.ts`)

A new module defines **completion buckets** — each a named set with an exact total and a
"how many does this save own" reducer. Two tiers by how we get the total:

### Tier 1 — derivable exactly today (no curation)
Pull from the VMs that already exist:
- **Bosses defeated** — `eventsDbView(slot).filter(type==='boss')` (already on overview).
- **Sites of Grace lit** — `eventsDbView … type==='grace'` (already on overview).
- **Map fragments** — `MAP_FRAGMENTS` dataset / `world-progress` VM.
- **Regions discovered** — `regionsDbView`.

### Tier 2 — curated item sets

The right rule is **per-category, and it hinges on one question: can you _transform_ one collectible
into another in-game, or is each variant a separate pickup?** (Clarified by the user 2026-06-07.)
Only "transformable" variants collapse — the others are genuinely distinct things to collect.

| Category | Variants in data | Transformable? | Completion total | Notes |
|---|---|---|---|---|
| **Weapons** | affinity variants (Bleed Dagger ← Dagger) | **Yes** — Ash of War / whetstone | **481** (collapse `affinityIndex===0`) | +N upgrades aren't separate rows (applied at runtime) |
| **Armor** | 91 `(Altered)` variants | **Yes** — Boc the tailor | **~623** (collapse `(Altered)`) | _the user was unsure; altering IS a transform, so treat like affinities_ |
| **Talismans** | 38 `+1/+2` rows | **No** — found in different world locations | **154** (keep all) | +1/+2 are separate pickups, NOT an upgrade you perform |
| **Spells** | none | n/a | **213** (keep all) | Sorceries + Incantations, incl. DLC |
| **Spirit Ashes** | none | n/a | **84** (keep all) | glovewort +N isn't separate rows |
| **Ashes of War** | none | n/a | **116** | |

So: **collapse weapons (affinity) and armor (Altered); keep everything else as distinct.** owned =
distinct collectible with `quantity > 0`. For weapons/armor the affinity/altered toggle (Inventory)
is the "show me every variant" escape hatch the user wants — e.g. "what's the highest bleed weapon."

Plus the well-defined `GOODS` subsets: **Cookbooks** (66), **Whetblades** (9), **Maps**,
**Great Runes** (7), **Remembrances**, **Gestures** (53, each obtained once).

> **⚠ Real bug surfaced while measuring (fix independently of this plan): the datasets contain
> `[ERROR]Type N` placeholder rows — 48 in WEAPONS, 54 in ARMOR, 1 in TALISMANS — that are
> _currently rendering in the live inventory tables_ (the Armor table literally shows rows named
> "[ERROR]Type 1" … "Type 54").** They also inflate every count above. They should be filtered out
> at the catalog source (`inventory-catalog.ts` / `weapon-affinity.ts`), which fixes the tables AND
> the denominators at once. The numbers in the table above are already net of this junk.

Categories deliberately **excluded** from the % (still browsable in Inventory): info items,
crafting materials, upgrade materials, ammo, ordinary consumables. (Could surface as a separate
"not counted" footnote so it doesn't look like we forgot them.)

### Milestone / achievement sets (the shareable flair)
Elden Ring's own Steam achievements map perfectly onto small, satisfying sets. The dataset's
`rarity: "Legendary"` tag is a _starting_ signal but is **loose** (55 "Legendary" weapons because
it counts affinity variants + DLC, vs the game's 9-weapon achievement). So these need a curated
id list (or variant-collapse), not a raw rarity filter:
- **Legendary Armaments** (9), **Legendary Talismans** (8), **Legendary Ashes of War** (9),
  **Legendary Sorceries & Incantations** (7), **Legendary Spirit Ashes**.
- **All Bell Bearings**, **All Cookbooks**, **All Whetblades**, **All Great Runes**.

These render as a row of trophy chips ("7/9 Legendary Armaments") — high screenshot value, and a
natural “almost there” nudge.

## Overview page layout — proposed overhaul

Two layout directions. **Recommend A** (the "Tarnished Card"): completion is the hero, the run
stats are demoted to a supporting strip. B is the lower-risk incremental version.

### Option A — "Tarnished Card" (recommended)

```
┌────────────────────────────────────────────────────────────────────┐
│  ╭───────╮   Tarnished_Name                          [ Share ▾ ]    │
│  │  ◓ 63%│   Astrologer · RL 84 · 41h 12m · NG+0                    │
│  │ helm  │   ████████████████░░░░░░░░  63% overall completion       │
│  ╰───────╯   Vigor 40 · Mind 22 · End 30 · Str 14 …  (compact)      │
├────────────────────────────────────────────────────────────────────┤
│  COMPLETION BY CATEGORY                                             │
│  Bosses          ██████████████░░░░  118 / 165   72%               │
│  Sites of Grace  ████████████████░░  267 / 334   80%               │
│  Map Fragments   ██████████████████  19 / 19    100% ✓             │
│  Weapons         ███████░░░░░░░░░░░░  142 / 481   30%   →           │
│  Armor (sets)    ████░░░░░░░░░░░░░░░  …                  →          │
│  Talismans       ██████████░░░░░░░░  …                   →          │
│  Sorc & Incant   ████████░░░░░░░░░░  …                   →          │
│  Spirit Ashes    ██████░░░░░░░░░░░░  …                   →          │
│  Ashes of War    ███████████░░░░░░░  …                   →          │
│  Gestures        ████████████████░░  …                   →          │
│  (→ jumps to that Inventory category, pre-filtered to Missing)      │
├────────────────────────────────────────────────────────────────────┤
│  MILESTONES   🏆 7/9 Legendary Armaments  · 5/8 Talismans  ·        │
│               66/66 Cookbooks ✓ · 4/7 Great Runes · …               │
├────────────────────────────────────────────────────────────────────┤
│  [ Equipped loadout strip ]   [ Active effects ]   [ Flasks ]      │
│  (the genuinely useful run-state cards, demoted below completion)  │
└────────────────────────────────────────────────────────────────────┘
```

- The **avatar circle becomes the completion ring** — a radial progress showing overall %,
  with the equipped-helm icon (or class initial if barehead) in the center. Always populated,
  on-theme, the screenshot centerpiece. Kills the empty-circle placeholder by repurposing it.
- Each category bar is a **link** into `/inventory/<slug>` pre-filtered to **Missing** — the
  page becomes a to-do list: "you're missing 339 weapons → go see which."
- Run stats (the big 2-col stat grid in `SlotOverview` today) compress into one muted line;
  the Upgrade-Materials matrix can stay as an expandable section or move to Inventory.

### Option B — incremental (lower risk)
Keep today's structure; just (1) fix the "Items Collected" tile to use the curated denominator and
add a per-category breakdown card below the tiles, (2) swap the empty avatar for the completion
ring, (3) leave equipment/effects/flasks where they are. Less of an "overhaul," ships faster.

## Inventory tables — Owned / Missing / All (the "both are important" ask)

Independent of the overview. On every `/inventory/$category` table, add a segmented control:

```
[ All ]  [ Owned ]  [ Missing ]        ☐ Show affinity variants
   ↑ everything (default)
        ↑ quantity > 0   ("what I've collected")
                ↑ quantity === 0 ("what's left")
```

- "Owned/Missing" = filter on the existing `quantity` field (no new data).
- "Show affinity variants" already exists for armaments — this is the "every variant in the game"
  control the user described. Keep it; it pairs naturally with the ownership filter.
- Mechanically this is a faceted filter on a derived `owned` boolean. `cleanup.md` #23 noted an
  explicit Owned column would auto-add the facet, but a dedicated segmented control reads better
  than a True/False facet buried in the toolbar.
- The card's existing "X / N · Y% owned" subtitle already gives the per-table number; the segmented
  control just lets you _act_ on it.

## Shareability ("shareable-esque")

The page is designed to be screenshotted as-is (clean card, no chrome). Beyond that, ties into the
existing future idea of **encoding the extracted save in the URL** (`cleanup.md` "sharing feature"):
- v1: a **Share ▾** button that copies a screenshot-friendly link / triggers the browser's share.
- v2: encode a _completion summary_ (just the counts, ~a few hundred bytes, `lz-string` already a
  dep) in the query param so a shared link rehydrates the card without the full save. Much smaller
  than sharing the whole save and avoids leaking inventory specifics.

## Implementation sketch / touch points

1. **`apps/web/src/lib/completion.ts`** (new) — `COMPLETION_BUCKETS` + a `useCompletion(slot)` hook
   returning `{ overallPct, categories: [{key,label,owned,total,pct,href}], milestones: [...] }`.
   Tier-1 buckets call existing VMs; tier-2 reuse `useInventoryTables` with variant-collapse.
2. **`overview-section.tsx`** — rebuild around `useCompletion`. Replace the 4 tiles' "Items
   Collected" with overall %, add the breakdown + milestones sections, demote run-state cards.
3. **`slot-overview.tsx`** — replace `Avatar`/`placeholder-user.jpg` with the `CompletionRing`
   (or, if we keep SlotOverview separate, retire its header avatar). Removes the empty circle.
4. **`completion-ring.tsx`** (new) — SVG radial + centered helm icon/class initial.
5. **Inventory ownership filter** — add the segmented `All/Owned/Missing` control to
   `inventory-data-table-card.tsx`, filtering `items` by `quantity` before passing to `DataTable`.
   Wire the overview category links to land here with `Missing` preselected (search param).
6. **Curation** — a small reviewed list for tier-2 totals + milestone id sets. The riskiest/most
   manual part; everything else is mechanical.

## Open questions (answer as we build, not blockers)
- Exact tier-2 denominators (base armor/talisman/spell counts) — need the variant-collapse rules
  per category. Weapons are solved; the rest mirror that approach.
- Does "overall %" weight categories equally, or weight by size? (Equal-weight per category reads
  more fairly than raw item-weighted, which would let weapons dominate.)
- DLC: count Shadow of the Erdtree collectibles in the same buckets, or a separate "DLC" toggle?
- Keep the Upgrade-Materials matrix on Overview, or move it to the Inventory `Bolstering Materials`
  table where it arguably belongs?
```
