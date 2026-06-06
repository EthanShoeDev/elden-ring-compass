# Coalescing affinity variants in the weapons table

> **Status (2026-06-06): OPTIONS A + B SHIPPED.** The recommended baseline is implemented: a
> "Show affinity variants" toggle (off by default, collapses ~3333 rows → ~548) plus a derived
> `Affinity` column that auto-renders a faceted filter. Derivation lives in `lib/atoms/weapons.ts`
> (`affinityIndex`/`affinity`/`baseId`/`baseName` + `showAffinityVariantsAtom`); UI in
> `components/sections/weapons-data-table.tsx`. No extractor change was needed. Options **C**
> (expandable sub-rows) and **D** (in-row affinity selector) remain deferred until per-affinity stats
> exist — see [§4](#4-recommendation) and [§5](#5-relationship-to-the-ar-calculator). Original
> problem/data analysis preserved below.

The original ask (verbatim): _"Right now when I scroll through the data table list of weapons, I will
see like the same dagger 5 times with different affinities. I think we should think through a better way
of showing this in the ui. like maybe we should have data table filters for certain affinities? Maybe a
toggle or something to show them as separate weapons? … maybe a table filter for like 'Only show base
weapons' or something? I am not really sure."_

---

## 1. The problem

Open the Weapons table and scroll: you hit **Dagger**, then **Heavy Dagger, Keen Dagger, Quality
Dagger, Fire Dagger, Flame Art Dagger, Lightning Dagger, Sacred Dagger, Magic Dagger, Cold Dagger,
Poison Dagger, Blood Dagger, Occult Dagger** — _thirteen rows for one weapon_ — before the next weapon
(**Parrying Dagger**) starts the same 13-row cycle again.

This is overwhelming for a new user who just wants to browse "what daggers exist," but the per-affinity
rows are genuinely useful to a min-maxer who wants to sort by, say, the highest-AR affinity for their
stats. So the fix can't just be "delete the variants" — it has to **collapse by default, expand on
demand.**

### How bad is it (real numbers from `packages/data/src/generated/weapons.ts`)

|                                                |    count |   share |
| ---------------------------------------------- | -------: | ------: |
| Total weapon rows today                        | **3333** |    100% |
| Affinity-0 rows (base + unique/somber weapons) |      548 |     16% |
| Non-zero affinity variant rows                 | **2785** | **84%** |

**84% of the table is affinity duplication.** Collapsing to base weapons by default turns a
3333-row table into a ~548-row one — a >6× reduction in what a browsing user scrolls through.

---

## 2. The data facts that make this easy

Affinity is **encoded in the weapon ID**, by Elden Ring's standard convention — we do **not** need any
new extractor work or new dataset fields to derive it. The ID layout is:

```
       1 00 12 00
       │  │  │  └─ upgrade level (always 00 in our dataset)
       │  │  └──── affinity index (00–12)
       └──┴─────── base weapon group  (floor(id / 10000))
```

So from any existing row:

```ts
const affinityIndex = Math.floor(id / 100) % 100; // 0..12
const baseGroup = Math.floor(id / 10000); // shared by all affinities of one weapon
const baseId = baseGroup * 10000; // the Standard (affinity 0) row's id
```

Worked example (the Dagger group, `baseGroup === 100`):

| id      | affinity index | affinity  | name             |
| ------- | -------------: | --------- | ---------------- |
| 1000000 |              0 | Standard  | Dagger           |
| 1000100 |              1 | Heavy     | Heavy Dagger     |
| 1000200 |              2 | Keen      | Keen Dagger      |
| 1000300 |              3 | Quality   | Quality Dagger   |
| 1000400 |              4 | Fire      | Fire Dagger      |
| 1000500 |              5 | Flame Art | Flame Art Dagger |
| 1000600 |              6 | Lightning | Lightning Dagger |
| 1000700 |              7 | Sacred    | Sacred Dagger    |
| 1000800 |              8 | Magic     | Magic Dagger     |
| 1000900 |              9 | Cold      | Cold Dagger      |
| 1001000 |             10 | Poison    | Poison Dagger    |
| 1001100 |             11 | Blood     | Blood Dagger     |
| 1001200 |             12 | Occult    | Occult Dagger    |

Canonical affinity table (index → label), shared with the min-maxing/AR work:

```
0 Standard · 1 Heavy · 2 Keen · 3 Quality · 4 Fire · 5 Flame Art · 6 Lightning
7 Sacred · 8 Magic · 9 Cold · 10 Poison · 11 Blood · 12 Occult
```

Notes / edge cases:

- **Unique & somber weapons** (Moonveil, Blasphemous Blade, etc.) exist only at affinity 0 — they're
  not infusable. Collapsing is a no-op for them; they already appear once. (They make up most of the
  548 affinity-0 rows.)
- **Base name** for grouping: prefer looking up the affinity-0 sibling's `name` in the same `baseGroup`
  rather than string-stripping the prefix — robust against prefixes like "Flame Art" and weapons whose
  base name happens to contain an affinity word.
- The affinity prefix is purely cosmetic in `name`; the stats that _differ_ per affinity (attack/scaling)
  aren't in our dataset yet anyway — today every affinity row of a weapon shows the **same**
  `attackPhysical`/reqs, which makes the duplication feel even more pointless to a browsing user. (The
  per-affinity numbers land with the AR-formula work — see [§5](#5-relationship-to-the-ar-calculator).)

---

## 3. Design options

Five approaches, roughly increasing in effort. Not mutually exclusive — the recommendation combines a
couple.

### Option A — "Show affinity variants" toggle (collapse by default)

A single boolean in the toolbar, **off by default**. When off, the table shows only affinity-0 rows
(filter `affinityIndex === 0`). When on, all 3333 rows return (today's behavior).

- ✅ Dead simple; smallest change; directly matches the user's "Only show base weapons" instinct.
- ✅ Default view drops to ~548 rows — solves the new-user overwhelm immediately.
- ⚠️ Binary: you either see _only_ bases or _all_ variants. No "just show me the Heavy ones."
- Best as the **baseline** everyone gets.

### Option B — Affinity faceted filter (multi-select)

Add a derived `affinity` column and let the existing faceted-filter machinery do the rest — the toolbar
**already auto-renders a faceted filter for any column** using `defaultFacetedFilterFn`
(`data-table-toolbar.tsx:28`), and there are 13 affinities so it'd render as the plain checkbox menu
(under the `SEARCH_THRESHOLD` of 8? no — 13 > 8, so it'd be the searchable Combobox, which is fine).

- ✅ Reuses existing infra almost entirely — derive one column, get the filter for free.
- ✅ Power-user friendly: "show me only Cold + Blood weapons across the whole game."
- ⚠️ Doesn't _collapse_ anything on its own — default still shows everything unless we also default-select
  Standard. Pairs naturally with A (toggle = "Standard only" shortcut; facet = fine-grained control).

### Option C — Expandable base rows (grouping / sub-rows)

One row per base weapon; an expand chevron reveals its affinity variants as sub-rows. TanStack Table
supports this via `getGroupedRowModel` / `getExpandedRowModel` + a grouping accessor on `baseGroup`.

- ✅ Best of both worlds visually: compact by default, drill-down in place, keeps variants associated
  with their parent.
- ⚠️ Most code: new row models, an expander column, and interaction with our persisted column state and
  pagination (a collapsed group counts as 1 row; expanding changes row counts mid-page).
- ⚠️ Sorting across groups gets semantically muddy ("sort by AR" — do groups sort by their best variant?).
- A strong v2 once per-affinity stats exist and the drill-down actually shows _different_ numbers.

### Option D — One row per base weapon + in-row affinity selector

Collapse to base weapons; each row has an affinity dropdown (default Standard) that swaps the displayed
stats for that row. Mirrors how build planners present a single weapon you "configure."

- ✅ Very clean for browsing; matches mental model of "one weapon, choose its infusion."
- ⚠️ Per-row local state is awkward in a sortable table (sort by AR when each row's AR depends on a
  per-row dropdown?). Really this is a _detail-view_ interaction, not a table one.
- Better suited to a future weapon **detail panel / build sandbox** than the data table itself.

### Option E — Do nothing structural; just add a column

Add a visible `Affinity` column so at least the rows are labeled/sortable/groupable by the user manually.

- ✅ Trivial. ⚠️ Doesn't reduce the row count; only mild relief. Useful _alongside_ A/B regardless.

---

## 4. Recommendation

**Ship A + B together, with the `Affinity` column from E as the shared substrate.** Concretely:

1. **Derive once, near the data.** Add `affinityIndex` / `affinity` (label) / `baseId` / `baseName` as
   derived fields. Cleanest home is an enrichment in `lib/atoms/weapons.ts` (map over `WEAPONS` when
   building `weaponsAtom`) so every consumer — table, future AR calc, map — sees the same shape. (Pure
   derivation; no extractor change.)
2. **Add an `Affinity` column** (`commonAccessorColumnDef(..., 'affinity', 'Affinity')`) → instantly
   sortable, and auto-gets a faceted filter in the toolbar (Option B, free).
3. **Add a "Show affinity variants" toggle**, default **off** (Option A). Off ⇒ apply
   `affinityIndex === 0`. Implement as either:
   - a writable atom feeding `filteredWeaponsAtom` (consistent with the existing
     `weaponSearchAtom` pattern — _recommended_, keeps it out of per-table column-filter state), or
   - a default column filter on the new `affinity` column.

   The atom route is cleaner because the default-collapsed state shouldn't depend on persisted
   `columnFilters` (which a user might have cleared). Show the variant count next to the toggle, e.g.
   _"Showing 548 weapons · 2785 affinity variants hidden."_

4. **Defer C and D** until per-affinity stats exist (they're what make a drill-down worth the code). At
   that point, expandable rows (C) become the natural upgrade.

Why this combination: A nails the user's actual complaint (the default view) with minimal code; B gives
the min-maxer the "filter for certain affinities" they also asked about; both lean on infra that already
exists (faceted filters, the atom-driven filter pattern). No extractor work, no new row models.

---

## 5. Relationship to the AR calculator

This is the **display-side** counterpart to [`min-maxing-calculators.md`](./min-maxing-calculators.md)'s
**§A2 "best affinity for that weapon"** recommender. Today every affinity row shows identical
`attackPhysical`/reqs because the per-affinity attack & scaling numbers aren't extracted yet — so the
duplication is not just noisy, it's currently _uninformative_. Once the AR-formula work lands those
per-affinity stats:

- The table's affinity rows/sub-rows finally show **different** numbers (real AR per affinity), making
  Option C's drill-down genuinely valuable.
- We can mark the **best affinity for the player's saved stats** right in the collapsed base row
  ("best for you: **Heavy**, ~XXX AR"), turning the collapse from pure decluttering into guidance.

So: build A + B now (cheap, save-independent, fixes the complaint); let C and the save-aware "best
affinity" badge ride in on the AR work.

---

## 6. Open questions

- **Does the affinity ID convention hold for 100% of rows?** Spot-checks pass (Dagger, Parrying Dagger);
  before relying on it, assert in a test that every non-zero-affinity row has an affinity-0 sibling in
  the same `baseGroup` (and log any orphans). A handful of oddball/DLC/dummy rows (e.g. id 1000 "DLC
  dummy") may not — decide whether orphans count as their own base.
- **Default for the AR/min-max view vs. the browse view** — a theorycrafter may want variants _on_ by
  default. If the table is later reused inside a build sandbox, the toggle default may need to be
  context-dependent (per `tableId`).
- **Search interaction** — when collapsed, searching "blood" should probably still surface base weapons
  whose Blood affinity matches, or transparently reveal the matching variant. Decide whether search
  bypasses the collapse.
- **Other item types** — armor has no affinities, but does any _other_ dataset (e.g. ashes/spells) have
  an analogous variant explosion worth the same treatment? Out of scope here, but the derive-then-toggle
  pattern would generalize.
