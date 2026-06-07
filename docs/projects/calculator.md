# Calculator — from an AR table to a save-aware "Build Doctor"

> **Status (2026-06-07): playstyle-first "Build Doctor" SHIPPED.** The page is now archetype-first: a
> playstyle picker (auto-detected from the save) seeds a shared target stat-model and drives four advisor
> cards + the save-aware AR ranking. Typecheck / lint / build / 41 web tests green; SSR-verified.
>
> Files that landed this rework:
>
> - **`apps/web/src/lib/build-stats.ts`** — the shared 8-attribute model (soft caps, derived-stat curves,
>   rune math), extracted so both the section and the presets read one source of truth.
> - **`apps/web/src/lib/build-archetypes.ts`** — `BUILD_ARCHETYPES` (9 presets, §0a), `detectArchetype`,
>   `weaponScalesWith`. (Named `BUILD_` to avoid the generated `ARCHETYPES` = starting classes.)
> - **`apps/web/src/lib/weapon-rating.ts`** — `rateWeapons` / `bestAffinityPerWeapon`, the one place AR
>   ranking happens (shared by the table + advisors).
> - **`apps/web/src/lib/vm/equipped-weapon.ts`** — resolves the active right-hand armament → AR row (for
>   the respec mismatch check).
> - **`build-planner.tsx`** (`BuildPlannerSection`) — picker + Advisors A–D + the kept derived/rune cards.
> - **`weapon-ar-calculator.tsx`** (`WeaponArTable`) — now icon-bearing, archetype-filtered, fed by the
>   shared rater. Helper: `apps/web/src/lib/ar.ts`.
>
> **Design decisions from review (2026-06-07):**
>
> - **Respec counts only _offensive_ stranded points.** Vigor / Mind / Endurance are personal
>   survival/utility choices — never flagged as "waste." A respec is recommended only when ≥10 points are
>   sunk into offensive stats the chosen build doesn't scale with (≤15 in an off-stat is treated as
>   weapon-requirement splash). Copy stays terse — it states the finding, not the obvious mechanics
>   (Rennala / Larval Tear / class-is-permanent are assumed known).
> - **Level-up advice respects player preference for Vigor** — it nudges toward the Vigor _you_ set on
>   the slider (community rule of thumb ~40, stated as such, not enforced).
> - **Two distinct weapon cards, not two phrasings of the same question.** Review flagged that "best you
>   own" and "best to equip now" read as the same thing with different answers (they only differed by stat
>   context). Collapsed to **"Best [build] weapon you own"** (owned, at the target spread) + **"Aim for"**
>   (best _unowned_ build weapon — the chase goal). The single strongest owned weapon _of any build_ is a
>   labelled "hardest-hitter right now (any build)" aside inside the owned card, not a competing card.
> - **Archetype "fit" filter is `.every`, not `.some`.** A Bleed (Dex/Arc) pick was surfacing every Dex
>   weapon (and catalysts); now a weapon must scale with **all** the build's named stats (Dex _and_ Arc),
>   so Quality = Str+Dex weapons, Int/Faith = both, etc. Single-stat archetypes are unchanged. Status
>   builds (Arcane/Bleed) also carry a visible "ranked by raw AR — bleed buildup not modelled yet" caveat.
> - **Derived stats are exact from the save.** ER's HP/FP/stamina growth curves are hardcoded in the game
>   _executable_ (not in `regulation.bin` — verified across all ~194 ER params), so they can't be
>   extracted. Instead the connected character's **exact** `base_max_hp/fp/stamina` from the save are used
>   directly; the hand-fit lerp is a fallback only for hypothetical target stats / no-save. No UI caveat.
>   See [Derived-stat curves](#derived-stat-curves-why-theyre-not-extracted-resolved).
>
> **The direction (this doc's main subject).** The page's **entry point is a playstyle**, not a set of
> sliders: _"I want to play a Strength build / Dex / Arcane-bleed / Sorcery / Faith…"_ → and the page
> answers, **for that player's actual save**:
>
> 1. the **best item in your inventory** for that playstyle (highest AR you already own),
> 2. which weapon does the **most damage at your current stats**,
> 3. **where to spend your next level-up points** (soft-cap-aware, toward the chosen build),
> 4. **what weapons to aim for** as you level (targets that open up at higher stat thresholds), and
> 5. **when to respec** — flag a character that's badly specced for what they're actually wielding, and
>    cost the reallocation in Larval Tears + runes.
>
> This is the same Compass superpower (save × item-data × map) the rest of this doc describes, but routed
> through a **build archetype** the player picks instead of raw numbers. See
> [§0 The rework](#0-the-rework-playstyle-first) for the new page design and
> [§0a Build archetypes](#0a-build-archetype-taxonomy) for the presets.
>
> **Cleanup feedback folded in** (from `docs/projects/cleanup.md`):
>
> - _"The calculator does not render weapon icons in the data table."_ → planned; weapons already carry
>   an `icon` field and `itemIconUrl()` exists (we use it in every inventory table). One column add. See
>   [§0c](#0c-near-term-polish).
> - _"The 'Plan a build' card looks like you might interact with it — confusing."_ → that banner
>   (`build-planner.tsx:187`) is a non-interactive label that reads like a CTA. The rework **replaces**
>   it with the real playstyle picker (the thing it falsely implied). See [§0c](#0c-near-term-polish).
> - _"The reset button stays clickable even when you haven't interacted."_ → **DONE**: Reset is now
>   `disabled` until the build differs from the save/Vagabond baseline (`dirty` check,
>   `build-planner.tsx:160`).
> - _"Maybe we want calculators for different things… a calculator that recommends when to respec."_ →
>   the rework splits the page into purpose-built advisor cards rather than one mega-table; respec is its
>   own advisor ([§0b idea D](#0b-the-advisors)).
>
> Still **future** beyond the rework: the "go get this" map routing (idea B), armor optimizer (E),
> status-proc (F). Known data gap: new DLC weapon classes (Backhand Blades, Beast Claws, Great Katana,
> Milady, Perfume Bottles, …) fall into category `"Other"` because their `wepType` isn't in the
> extractor's `WEAPON_CATEGORY` map — they still rate correctly, but the category label is wrong; worth
> mapping in the extractor (it also matters for archetype filtering in the rework).

The original ask (verbatim): _"provide calculators in the app for min-maxing… look up what Elden Ring
calculators are out there and see how we can make them better by having the save data available."_ Plus
the rework steer (verbatim): _"the user should pick an option for like 'I want to play a strength build,
dex build, arcane build… etc' and we should be able to tell them what is the best item in the inventory
that matches their play style, which one does the most damage based on their stats, where they should
place exp points the next time they level up, what weapons would be good to move to once hitting a
certain level, etc… I could also see like a calculator that recommends when to respec your character."_

---

## 0. The rework: playstyle-first

The whole reframing in one line: **every competitor (and our own v1) makes you describe a hypothetical
character with sliders. We already _have_ the character — so the first interaction should be choosing a
goal, not typing numbers.**

### The funnel

```
   ┌─────────────────────────────────────────────────────────────┐
   │  Pick your playstyle                                         │
   │  [Strength] [Dexterity] [Quality] [Sorcery/Int] [Faith]     │
   │  [Arcane / Bleed] [Int-Faith] [Str-Faith] …  + "Custom"      │
   └─────────────────────────────────────────────────────────────┘
                              │  (also auto-detected from the save — see below)
                              ▼
   ┌──────────────────────────┐  ┌──────────────────────────────┐
   │  Build Doctor            │  │  Your loadout vs. this build  │
   │  • best weapon you OWN   │  │  equipped weapon's AR now vs. │
   │  • best weapon at your   │  │  its AR if respecced to the   │
   │    stats (own or not)    │  │  archetype's stat spread      │
   │  • next-level-up advice  │  │  → "you're 80 AR under your    │
   │  • respec verdict        │  │     weapon's potential"        │
   └──────────────────────────┘  └──────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Weapon AR table (now icon-bearing), pre-filtered to the     │
   │  archetype + the archetype's "ideal" stat spread applied to  │
   │  the sliders. Toggle "rank at MY current stats" vs.          │
   │  "rank at the archetype's target stats".                     │
   └─────────────────────────────────────────────────────────────┘
```

Picking an archetype does two concrete things to the existing machinery:

1. **Sets a target stat spread** on the shared attribute model (the `Attrs8` in `build-planner.tsx`).
   Today the sliders are seeded from the save or Vagabond defaults; an archetype seeds them from a
   curated _target_ spread (e.g. Strength → 60 STR, soft-cap vigor/end) so every downstream readout
   (derived stats, rune cost, AR ranking) reflects "if I commit to this build."
2. **Filters/weights the weapon ranking** to the archetype's relevant weapon set (so a Sorcery pick
   surfaces staffs + Int-scaling armaments, not Giant-Crusher).

The page keeps **two stat contexts side by side** — "my actual current stats" and "this archetype's
target" — and the magic is the **delta** between them (what changing build buys you, what it costs in
runes/Larval Tears).

### Auto-detect the player's current archetype

Before the player even picks, infer their _current_ archetype from the save's stat spread (highest
non-survival attributes) and equipped weapon's scaling, and pre-select it. This makes the "you're badly
specced" advisor land: _"Your stats read as an Arcane build, but you're wielding a pure-Strength
Greatsword — here's the mismatch."_

---

### 0a. Build archetype taxonomy

The community converges on a small, stable set of archetypes (sources in [§Sources](#sources)). These
become the **presets** behind the playstyle picker. Each preset is just curated data: a defining stat
set, a target spread, and an "exemplar weapons" list used for filtering + sanity-checking the AR ranking
(we still _compute_ the ranking from our own AR formula — the exemplar list is for filtering/labelling,
not for faking numbers).

| Archetype           | Primary stats     | Plays like                                                        | Exemplar S-tier armaments (for filtering/labelling)                                |
| ------------------- | ----------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Strength**        | STR (Vig/End)     | Big poise-breaking hits; two-handing scales STR ×1.5.            | Giant-Crusher, Greatsword, Ancient Meteoric Ore GS, Grafted Blade GS               |
| **Dexterity**       | DEX (Vig/End)     | Fast, precise, high attack speed.                                 | Nagakiba, Hand of Malenia, Bolt of Gransax, Bloodhound's Fang                      |
| **Quality**         | STR + DEX (even)  | Lower peak than a pure build, but wields almost everything.       | Most STR/DEX-scaling weapons at a "Quality" affinity                               |
| **Sorcery / Int**   | INT (+ Mind)      | Ranged sorceries; kill before they reach you. Staff-driven.      | Carian Regal Scepter (staff), Dark Moon GS, Moonveil, Meteorite Staff             |
| **Faith**           | FAI (+ Mind)      | Incantations + Faith-scaling melee; versatile ranged + melee.     | Blasphemous Blade, Erdtree/Golden Order seals, Golden Order weapons                |
| **Arcane / Bleed**  | ARC (+ DEX)       | Status procs (Bleed/Poison/Rot); Arcane scales status buildup.   | Rivers of Blood, Mohgwyn's Sacred Spear, Bloodfiend's Arm, Eleonora's Poleblade    |
| **Int-Faith**       | INT + FAI         | Hybrid caster; Death/elemental crossover weapons.                | Sword of Night and Flame, Dark Moon GS, Golden Order incantations                  |
| **Str-Faith**       | STR + FAI         | Heavy Faith bruiser; Blasphemous Blade is the poster child.       | Blasphemous Blade, Coded Sword, Golden Order GS                                     |
| **Bleed (Dex/Arc)** | DEX + ARC         | Bleed-focused subset of Arcane, the deadliest meta build.        | Rivers of Blood, Uchigatana (Blood affinity), Hand of Malenia                      |

Notes that matter for the implementation:

- **Survival stats are archetype-agnostic.** Every preset assumes a sane Vigor (≈40–60) and enough
  Endurance for equip load + stamina; only the _offensive_ stat(s) define the archetype. The preset's
  target spread should soft-cap Vigor first, then pour the rest into the offensive stat(s).
- **"Quality" is a STR+DEX split**, not a separate scaling letter — it's the affinity name. Our
  best-affinity-per-weapon collapse already finds it when STR≈DEX.
- **Arcane is dual-purpose:** raw Arcane scaling on a few weapons _plus_ status-buildup scaling on Blood/
  Poison/Occult affinities. The "best Arcane weapon" answer must account for status (idea F), not just
  AR — flag this as a known limitation until status buildup is extracted (see appendix A.4).
- The exemplar lists are a **maintenance liability** (they go stale per patch and per tier-list opinion).
  Keep them short, sourced, and clearly "for labelling, not scoring." The _scoring_ is always our AR
  formula against the player's stats — that's the part that can't go stale because it's extractor-derived.

---

### 0b. The advisors

Four purpose-built cards, each a thin layer over machinery that already exists (the AR calculator + the
parsed save). These replace the single mega-table as the _headline_; the table stays underneath as the
"show me everything" drill-down.

**Advisor A — Best [build] weapon you _own_.** _(shipped)_
Run the AR calc across the weapon set at the archetype's target stats, filtered to weapons that fit the
build (`weaponScalesWith`, `.every`), owned only → the top row. _"Equip this: **Heavy Greatsword**
(~XXX AR), best fit at a Strength stat spread."_ Carries a labelled aside — the single hardest-hitting
owned weapon at your _current_ stats, **any build** — so "what hits hardest right now" is answered
without masquerading as a build pick. (Original design split this into two cards — "best you own" and
"best to equip now" — which read as the same question with different answers; merged after review.)

**Advisor B — Aim for.** _(shipped)_
The best _unowned_ build weapon at the target stats — the chase goal, with the AR gain over your best
owned. _"Don't own yet: **Giant-Crusher**, +140 AR over your best owned."_ → feeds idea B (map: where to
get it).

**Advisor C — Next-level-up advisor.**
Given the chosen archetype's target spread and the player's current stats, recommend **where the next N
points go**, soft-cap-aware. The soft-cap breakpoints are already encoded (`ATTR_META` in
`build-planner.tsx`: STR/DEX/INT/FAI/ARC at 20/55/80; Vig 40/60; Mind/End 50/60). The rule of thumb:
fill Vigor to its soft cap first, then push the offensive stat toward its 55 soft cap, then survival.
Surface it as: _"Your next 5 points → Vigor (you're at 32, soft cap 40). After that, Strength."_ This is
the soft-cap cheat sheet personalized against the real character (old idea D, now first-class).

**Advisor D — Respec verdict.** _(shipped — see the review decisions in the status block)._
"Stranded" points = **offensive** points (Str/Dex/Int/Fai/Arc) sunk into a stat the chosen build
doesn't scale with, above a ~15 splash allowance (that much in an off-stat is usually just meeting a
weapon's requirement). **Vigor / Mind / Endurance are never counted** — how tanky/utility-heavy you want
to be is personal preference, not waste. Recommend a respec only when stranded ≥ 10; otherwise check the
equipped-weapon mismatch (does it scale with the build's stats?) and, failing that, "no respec needed."

- price it: **1 Larval Tear** (cap 18/playthrough) + the rune delta only if the target level is higher
  than the current level (`runesBetween`),
- verdict copy: _"~18 points sit in Dexterity — a stat a Strength build doesn't use. Rennala
  redistributes your attributes for 1 Larval Tear."_

Respec mechanics: reallocation happens at **Rennala (Raya Lucaria Grand Library)**, consuming a **Larval
Tear**; it **redistributes attributes only — the starting class is permanent** (the UI says so
explicitly). Stats can't go below the starting-class base.

---

### 0c. Near-term polish (the small cleanup items)

1. **Weapon icons in the AR table.** ✅ DONE — `RatedWeapon` carries `icon`; the table renders a
   `TooltipImg` of `itemIconUrl(icon)` (module-scoped column so it isn't a nested component).
2. **Kill the "Plan a build" banner.** ✅ DONE — replaced by the real playstyle picker ("What do you
   want to play?"). The Reset button moved onto the Target-attributes card, still `disabled` until the
   sliders differ from the seeded preset.
3. **DLC weapon category mapping** (extractor): still TODO — map the new `wepType`s out of `"Other"` so
   archetype filtering and category labels are correct. Needs an extractor change + an extract run.

### Derived-stat curves: why they're not extracted (resolved)

The Derived-stats card (HP←Vigor, FP←Mind, stamina/equip-load←Endurance) can't be sourced the way AR is:
**ER's growth curves are hardcoded in the game executable, not in `regulation.bin`.** Verified by
inspecting all ~194 ER param defs — none carry an HP/FP/stamina growth field. That's why every other
calculator hardcodes these tables; "just extract it" isn't available here.

**Resolution (shipped):** for a _connected_ character we don't need to extract anything — the save
already carries the **exact** attribute-derived values `base_max_hp` / `base_max_fp` / `base_max_stamina`
(`player_game_data`). The Build Doctor uses those directly, and only falls back to the hand-fit lerp in
`build-stats.ts` for a stat the user has **dragged to a hypothetical target** (or when no save is
loaded). Equip-load capacity isn't in the save, so it stays modelled. The UI no longer carries any
"approx" caveat. The only remaining hand-fit surface is hypothetical-target HP/FP/stamina + all
equip-load — if that ever needs to be exact, the source is the executable's tables (out of scope; never
hardcode the wiki's tables — that breaks the extractor-derived rule, cf. [[no-scraped-map-coords]]).

---

## 1. The existing landscape

Two families of tool exist. **Build planners** (theorycrafting sandboxes — the thing the user cares
about) and **single-purpose calculators** (AR, armor, status, runes). The good planners absorb the
single-purpose calcs as panels.

### 1a. Build planners (theorycrafting sandboxes — the category we care about)

| Tool                                                                                     | What it does                                                                                                                                                                                                                                                                                                                  | Strengths                                                                                                                                | Weaknesses                                                                                                   |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **tarnished.dev** (Build Planner + AR Calc + Armor Optimizer + Spell Calc + Damage Calc) | The most complete suite. Build Calculator integrates weapons, spells, armor, talismans, physick — and crucially tracks **which active effects actually stack** (buff scaling on spells, healing). AR calc has CSV export, DPS, poise damage. Armor optimizer accounts for Great Runes + Physick.                              | Effect-stacking correctness is the standout — most tools get buff interactions wrong. Cohesive multi-tool suite. Clean, fast.            | Manual entry of everything. No notion of what you own or where things are.                                   |
| **EIP Gaming Build Planner** (eip.gg)                                                    | Class-based character planner: stats, runes-to-reach-level, all 4 talismans, both hand slots, armor, spells; shows AR, defense, resistances.                                                                                                                                                                                  | Polished, popular, good "pick a class → allocate" funnel. Rune cost to reach a target level is shown inline.                             | 403s to scrapers (gated); manual entry; SEO-heavy.                                                           |
| **Fextralife Build Calculator**                                                          | Wiki-integrated. Class + level + full stat allocation + full loadout (helm/chest/gauntlets/legs, weapons w/ upgrade + ash of war, 4 talismans, spells w/ memory slots, spirit ashes, great runes, flasks, ammo). Outputs AR (phys + elemental split), all defenses/resistances, poise, equip-load %. "Get build URL" sharing. | Most **complete input surface** of any tool — it models nearly every slot the game has. Deep wiki cross-links.                           | Self-described **beta with known bugs** in poise, equip-load bonuses, status calcs. Share-URL flaky. Clunky. |
| **er-build-planner.nyasu.business**                                                      | "Build & **Inventory** Planner" — bundles Stamina/Endurance calc, Armour Optimiser, Summon Range calc, Health calc, Fall Damage calc, Effects.                                                                                                                                                                                | Breadth of niche sub-calculators (summon range, fall damage) nobody else bothers with. The only one that even uses the word "inventory." | Couldn't fully scrape; appears manual-entry still.                                                           |
| **soulsplanner.com**                                                                     | The classic Souls planner (DS1–3, BB). Lets you build around a weapon or find weapons that work on a build; community build sharing/profiles.                                                                                                                                                                                 | Gold standard for **shareable community builds** + "find weapons that fit a build."                                                      | **No Elden Ring support** — the author stopped at DS3. Leaves an open niche.                                 |

### 1b. Single-purpose calculators (become panels inside a planner)

- **AR / weapon calculators** — `nyedr/elden-ring-ar-calculator` (open-source, MIT, TS/Next.js — worth
  reading for formulas/data shape), tclark.io (supports mods: Reforged, Convergence), salarysacrifice
  (claims community-verified soft-cap breakpoints at 20/55/80). Core job: given stats + affinity +
  upgrade level, compute AR; **sort/filter/graph weapons** to find the best for a stat spread.
- **Armor optimizers** — `jerpdoesgames/EldenRingArmorOptimizer` (jerp.tv, open-source) is the canonical
  one: a knapsack-style solver — "given a weight budget, maximize poise / a chosen negation/resistance,
  excluding pieces I dislike." This is a genuine **optimization** problem, not just display.
- **Status-buildup calculators** — statusttp.xyz computes **exact number of hits to proc** bleed/frost/
  rot/madness/sleep on a _specific boss_ (uses target Robustness/Focus/etc. + the +25%-per-proc
  threshold ramp). Niche but beloved — and the right home for the Arcane archetype's "real" ranking.
- **Rune / level cost calculators** — runes-from-level-A-to-B via the game's exponential formula
  (eldenringrunecalculator, procalculator). Trivial math, high search volume.
- **Equip-load / roll-type calculators** — weight → roll speed (≤30% / ≤70% / >70%) + poise.
- **Soft-cap cheat sheets** — not interactive; just "stop leveling X at N" tables. Begs to be made
  interactive _against the player's actual current stats_ — exactly what Advisor C does.

### Cross-cutting observations

- **Every single one is stat-entry-first.** You type in your stats (or pick a class and allocate from
  scratch). **None of them know your actual character.** This is the entire opening for Compass — and
  the playstyle picker is the UX that exploits it.
- The hard/interesting ones are **optimizers** (armor knapsack, "best weapon for these stats,"
  hits-to-proc), not display widgets. Those are the ones worth building.
- **Effect stacking is where tools are wrong most often** (tarnished.dev's correctness here is its moat).
- **Nobody connects a build to the world** — no tool tells you _where_ a weapon is or _whether you own
  it_. We already have map placements + inventory. That's a category nobody occupies.

---

## 2. Which to take inspiration from

1. **tarnished.dev** — copy the **architecture**: a unified build sandbox with the single-purpose calcs
   as panels that share one character model, plus rigorous **effect-stacking** logic. This is the
   correctness bar.
2. **jerp's Armor Optimizer** — copy the **optimizer mindset**: pose build questions as
   constraint-solving ("maximize X subject to weight ≤ W"), not just readouts. MIT, readable.
3. **Fextralife Build Calculator** — copy the **completeness of the input surface** (every slot the game
   models) — but do it _prefilled from the save_ instead of by hand, and without their beta bugs.
4. **EIP Gaming** — copy the **"pick a class/playstyle → allocate" funnel**; this is the closest existing
   tool to our playstyle-first rework, just without save awareness.
5. **nyedr AR calculator** (read the source) + **soulsplanner** (the "find weapons that fit a build"
   feature + shareable community builds — and note ER is an unoccupied niche there).

What we deliberately do **not** chase: SEO arithmetic widgets (rune cost, equip-load %). We'll include
them as trivial readouts, but they're not products.

---

## 3. The Compass advantage

Every competitor starts from a blank form. **We start from the player's actual save.** We uniquely hold
three datasets at once:

- **Parsed save** — the 8 attributes (vig/mind/end/str/dex/int/fai/arc), level, HP/FP/stamina,
  **equipped** weapons+armor+talismans+spells, the **full inventory of owned items** (`equip_inventory`,
  `storage_inventory`, resolved via the `ga_items` table), **runes held**, and status-buildup state.
  _(See `packages/save-parser/src/types.ts`.)_
- **Item datasets** — weapons (reqs, scaling `effects[]`, `upgradeMaterial` + per-level `upgradeCosts[]`,
  weight, attack, `icon`), armor, talismans, spells, ashes-of-war, spirit-ashes, sp-effects.
  _(See `packages/data/src/generated/`.)_
- **Map placements** — extractor-derived world coordinates for items (the `placements`/`markers`
  datasets, incl. exact EMEVD event-drop coords). **No other calculator has this.**

The combination means we can answer questions phrased in terms of the player's _real, specific
situation_ — "for **me**, right now, with what **I own**, for the **build I want**" — which no stat-entry
tool can.

---

## 4. Concrete feature ideas

Ordered roughly by value-to-effort. The rework (§0) reorganizes A/A2/D into the advisor cards; the rest
stay as written. Each is gated on data we already have.

### ⭐ A. "Best weapon for _you_" — recommender (now Advisors A + B)

Run the AR calc across the weapon dataset **using the save's real stats** (Advisor B) and the chosen
archetype's target stats (Advisor A), then split results into ranked lists partitioned by ownership:

- **Weapons you already own** → _"For your 40 STR / 18 DEX, the best thing in your inventory is the Heavy
  Greatsword +12 at ~XXX AR. You're under-using it."_
- **Weapons you don't own yet** → feeds idea B.

This is soulsplanner's "find weapons for my stats" but **auto-fed from the save and partitioned by
ownership** — something no existing tool does. Also surface: weapons you **just barely** can't wield
("+2 STR and the Greatsword opens up") and weapons whose **affinity** you could swap into a better fit.

### ⭐ A2. "Best affinity for _that_ weapon" — affinity recommender

For any weapon (especially the one equipped), sweep **all legal affinities** (Heavy/Keen/Quality/Magic/
Fire/Flame Art/Lightning/Sacred/Cold/Poison/Blood/Occult/Standard) through the AR formula **against the
save's real stats** and rank them. _"You're running Keen on your Longsword, but at your 40 STR / 12 DEX,
**Heavy** gives ~XX more AR."_ Extend both ways:

- **Save-aware:** does the player **own the Ash of War / Whetblade** needed to apply that affinity?
  "Heavy is best _and_ you already own the Whetstone Knife + a Heavy ash — you can do this now." vs.
  "best affinity needs the Black Whetblade — it's at [location]" → routes to idea B.
- **Status-aware:** flag when an affinity that _lowers_ raw AR is actually better because it adds bleed/
  frost (Blood/Cold with Arcane) — tie into idea F: "−20 AR but procs bleed in 4 hits."
- Small search space per weapon, so cheap once the AR formula exists, and a question players ask
  constantly that **no save-aware tool answers**. (The default mode of `WeaponArTable` already does the
  best-affinity-per-weapon collapse — A2 is the per-weapon drill-down view of that.)

### ⭐ B. "Go get this" — world-aware upgrade suggestions

The killer feature, because it fuses all three datasets + the map we already render:

- _"The Blasphemous Blade scales better for your FAI build than anything you own — it's at Mt. Gelmir.
  [Show on map]."_ Uses placements → drop a marker / route on the existing Compass map.
- _"You own the materials to take your Uchigatana from +6 to +12 right now"_ — diff
  `weapon.upgradeCosts[]` against owned Smithing Stones in inventory.
- _"You're 2 Somber Smithing Stone (6) short of maxing your Moonveil — the nearest one is at X."_

No calculator can do this; they don't know the world, your bag, or your forge progress. **Compass does.**

### C. Save-prefilled build sandbox (the current page, kept as the drill-down)

The slider sandbox already exists (`BuildPlannerSection`). It stays as the "advanced / custom" surface
under the advisors: open it and it's **already your character**; theorycraft _from reality_. The rework
demotes it from headline to drill-down, with the archetype picker seeding its sliders.

### D. Respec & level-up planner grounded in real runes (now Advisors C + D)

Covered by Advisors C (next-level-up) and D (respec verdict) in §0b. Also: "reaching the meta PvP level
(125) from your current level costs N runes" as a trivial readout.

### E. Armor optimizer, save-aware

jerp's knapsack, but constrained to **armor you own** by default (toggle to "include unobtained, show me
where they are" → idea B again). "Best poise under your _current_ equip load, from your _current_
wardrobe." A natural second archetype dimension (light-roll vs. poise-tank).

### F. Status-proc calculator using equipped weapon + real Arcane

statusttp's "hits to proc on boss X" but auto-fed from the equipped weapon's buildup + the save's Arcane.
**This is what makes the Arcane/Bleed archetype's ranking honest** — until it lands, the Arcane preset's
"best weapon" answer is AR-only and will under-rate bleed weapons. Cross-ref the boss list against
**which bosses the save hasn't beaten yet** (boss flags from quest-compass) → "for your next boss, your
current weapon procs bleed in 4 hits."

### G. Trivial readout panels

Rune-cost, equip-load %, summon range, fall damage — cheap to include once the character model exists.
Not headline features, but they round out the sandbox and capture search traffic.

---

## 5. Suggested build-out

The AR foundation is **done** (formula + extraction + golden tests + the v1 table). Remaining order:

1. **Polish first** (§0c) — weapon icons + retire the misleading banner. Tiny, independent, removes the
   two concrete UI complaints.
2. **Archetype presets + picker** (§0a, §0) — curate the preset data (defining stats, target spread,
   exemplar lists), add the picker, wire it to seed the shared `Attrs8` model and filter the table.
   This is the structural change that turns the page playstyle-first.
3. **Advisors A–D** (§0b) — thin layers over the existing AR calc + save. A/B are nearly free (re-run
   the calc at two stat contexts, read the top row). C/D are the soft-cap + respec logic, mostly already
   present in `build-planner.tsx` (`ATTR_META` soft caps, `runesBetween`).
4. **The wow moment = idea B** ("go get this" on the map). Plug A's "don't own yet" list + the
   materials-gap check into placements + the existing map. This is the feature to demo.
5. **Then E–F** as the sandbox matures (armor optimizer; status-proc to make Arcane honest). Mirror
   tarnished.dev's panels-on-one-character-model architecture so each calc reuses the same parsed-save
   character object.

**Throughline:** every competitor makes you describe a hypothetical character. Compass already _has_ your
character — so frame the page as **"pick how you want to play, and here's the move for you, right now,
with what you own, and here's where to go."** That's the whole differentiation.

---

## Sources

- [tarnished.dev — calculators suite](https://www.tarnished.dev/) ([Build Planner](https://www.tarnished.dev/build-planner), [Armor Optimizer](https://www.tarnished.dev/armor-optimizer), [Weapon AR Calc](https://www.tarnished.dev/weapon-calculator))
- [EIP Gaming — Build Planner](https://eip.gg/elden-ring/build-planner/)
- [Fextralife — Build Calculator](https://eldenring.wiki.fextralife.com/Build+calculator) · [Builds](https://eldenring.wiki.fextralife.com/Builds) · [Classes](https://eldenring.wiki.fextralife.com/Classes) · [Stats](https://eldenring.wiki.fextralife.com/Stats) · [Damage Types](https://eldenring.wiki.fextralife.com/Damage+Types)
- [er-build-planner.nyasu.business — Build & Inventory Planner](https://er-build-planner.nyasu.business/)
- [soulsplanner.com](https://soulsplanner.com/) (DS/BB only; ER niche unoccupied)
- [nyedr/elden-ring-ar-calculator — open-source AR calc (MIT, TS/Next.js)](https://github.com/nyedr/elden-ring-ar-calculator)
- [jerpdoesgames/EldenRingArmorOptimizer — open-source armor knapsack](https://github.com/jerpdoesgames/EldenRingArmorOptimizer) · [hosted](https://jerp.tv/eldenring/armor/)
- [statusttp.xyz — hits-to-proc status calculator](https://www.statusttp.xyz/)
- [eldenring.tclark.io — weapon calc (mod support)](https://eldenring.tclark.io/)
- Build-archetype + tier-list research (2025–26): [GeekyInc — Best Builds 2026](https://www.geekyinc.com/elden-ring-best-builds-2026-beginner-to-advanced-guide/), [GamesRecon — Best Build for Each Stat](https://www.gamesrecon.com/best-elden-ring-builds), [ExitLag — Builds for Every Playstyle](https://www.exitlag.com/blog/elden-ring-builds/), [u4gm — 2025 Weapon Tier List](https://www.u4gm.com/elden-ring/blog-elden-ring-2025-ultimate-weapon-tier-list-meta-picks), [aoeah — Build & Weapon Tier List 2025 (DLC)](https://www.aoeah.com/news/3778--elden-ring-best-build--weapon-tier-list-2025-dlc)
- Respec / soft caps: [Fextralife — Rebirth](https://eldenring.wiki.fextralife.com/Rebirth), [SamuraiGamers — SotE Stat Soft Caps](https://samurai-gamers.com/elden-ring/stat-soft-caps-guide/), [ggrecon — Stats explained & reset](https://www.ggrecon.com/guides/elden-ring-stats-explained/)
- [Elden Ring Rune Calculator](https://eldenringrunecalculator.vercel.app/)

---

# Appendix: AR-formula port — scope

> **Status (2026-06-06): IMPLEMENTED (extraction + formula + tests).** The AR scaling model is now
> extracted and the formula ported & golden-tested. What landed:
>
> - **Extractor** (`packages/extractor/src/stages/join.ts`): decodes the AR fields off `EquipParamWeapon`
>   (per-damage-type base attack, `correctX` scaling/100, requirements, `correctType_*` graph ids,
>   `attackElementCorrectId`, `reinforceTypeId`) and builds three shared tables (`ReinforceParamWeapon`,
>   `AttackElementCorrectParam`, `CalcCorrectGraph`), emitting only the rows weapons reference. Codegen
>   writes `weapon-scaling.ts`, `reinforce-types.ts`, `attack-element-correct.ts`,
>   `calc-correct-graphs.ts` into `@elden-ring-compass/data`.
> - **Runtime formula** (`packages/data/src/ar.ts`, exported as `@elden-ring-compass/data/ar`):
>   `createArCalculator(tables).compute(weaponScaling, attributes, upgradeLevel, {twoHanding})` →
>   per-damage-type AR + total + ineffective flag. Ported faithfully from the reference.
> - **Golden test** (`packages/data/src/ar.test.ts`): pins our output to reference values (Dagger +0 =
>   82.62, +25 = 337.67; Heavy Dagger +25 = 398.1; Moonveil +10 split phys 231.98 / magic 408.82 = 640.8;
>   under-req −40% penalty = 44.4). All passing.
> - **Game version** (separate ask): `game/game-version.ts` reads `eldenring.exe`'s PE FileVersion →
>   `game-meta.ts` (`GAME_VERSION`), shown in the web sidebar (`app-sidebar.tsx`).
>
> **To populate real data, run `bun run extract` against an install** — the committed datasets are
> placeholders (`GAME_VERSION` is `null`, AR tables are generated on extract). Still **deferred**: status
> buildup (bleed/frost/…) base values + their `statusSpEffectParam` offsets (the formula structure is the
> same; only damage AR is wired today — this is the blocker for an honest Arcane/Bleed archetype ranking,
> idea F), buffs/talisman/physick layering, and the advisor UI itself (§0).
>
> The reference implementation is `ThomasJClark/elden-ring-weapon-calculator` and its derivative
> [`nyedr/elden-ring-ar-calculator`](https://github.com/nyedr/elden-ring-ar-calculator) (MIT) — the
> formula below is transcribed from `getWeaponAttack` / `buildData.ts`. It is the community-canonical
> model and matches tarnished.dev's numbers.

## A.1 The exact formula

AR is computed **per damage type** (Physical, Magic, Fire, Lightning, Holy) and per status type
(Bleed/Frost/Poison/Rot/Sleep/Madness), then summed. For one damage type:

```
totalScaling = 1
for each attribute (str, dex, int, fai, arc) that this damage type scales with:
    if the player fails to meet ANY requirement that this damage type depends on:
        totalScaling = 1 - 0.4          // the "ineffective" penalty (−40%), replaces all scaling
        break
    else:
        scaling = attributeScaling[upgradeLevel][attribute]          // from ReinforceParamWeapon
        saturation = calcCorrectGraph[damageType][ playerAttributeValue ]   // 0..1 soft-cap curve
        totalScaling += saturation * scaling

AR_for_damageType = baseAttackPower[upgradeLevel][damageType] * totalScaling
//   "scaled" portion = AR_for_damageType − baseAttackPower   (what the stats added)
```

Key mechanics baked in:

- **Two-handing:** multiply effective `str` by 1.5 (floored) _before_ the loop — except paired weapons
  (no bonus) and bows/ballistae (always two-handed). Affects only damage-type scaling, not status.
- **Soft caps are the `calcCorrectGraph`.** There is no "20/55/80 breakpoint" constant — the saturation
  curve _is_ the soft-cap behaviour, looked up by the player's current attribute value (0–99, DLC 0–150).
  (The 20/55/80 ticks in the slider UI are a _communication_ aid, not the math.)
- **Requirement penalty:** missing a stat requirement doesn't zero the weapon — it sets that damage
  type's multiplier to `1 − 0.4 = 0.6` (a −40% penalty), and flags the type ineffective.
- **`attackElementCorrect`** (AttackElementCorrectParam) decides _which_ attributes correct _which_
  damage type. An entry can be `true` (use the weapon's raw scaling) or a numeric override coefficient
  (then `scaling = override * attributeScaling[lvl] / attributeScaling[0]`).
- **Spell tools** (staffs/seals) reuse the same loop to produce "Sorcery/Incantation Scaling" =
  `100 * totalScaling` — relevant for the Sorcery/Faith archetypes' "best catalyst" answer.

Damage **vs. an enemy** (for the future "hits to kill" / idea F) is a separate, also-documented step:
`baseDamage = AR * motionValue/100`, then `× (1 − negation%) × defenseMultiplier(attackRatio)`, where
`defenseMultiplier` is a 4-piece curve of `attackRatio = AR / enemyDefense`. Out of scope for the AR
MVP, but the formula is captured in the reference file if/when we add per-enemy damage.

## A.2 Data the formula needs (four regulation params)

| #   | Param (regulation.bin)        | Provides                                                                                                                                                                             | Shape needed by the calc                                                              |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | **EquipParamWeapon**          | base attack per damage type, requirements, status buildup, and the IDs linking the other three params (`reinforceTypeId`, `attackElementCorrectId`, `correctType_*` per damage type) | per-weapon row                                                                        |
| 2   | **ReinforceParamWeapon**      | per-`+N` multipliers for **both** base damage and each scaling coefficient                                                                                                           | indexed by `reinforceTypeId + upgradeLevel` → multipliers                             |
| 3   | **AttackElementCorrectParam** | which attributes correct which damage type (the `true`/override map)                                                                                                                 | indexed by `attackElementCorrectId`                                                   |
| 4   | **CalcCorrectGraph**          | the saturation/soft-cap curves                                                                                                                                                       | indexed by `correctType_*`; **pre-evaluate to a 0..150 lookup array** per damage type |

Derived per-weapon outputs the web calc consumes (mirror the nyedr `Weapon` model):
`attack[upgradeLevel][damageType]`, `attributeScaling[upgradeLevel][attribute]`,
`attackElementCorrect[damageType][attribute] = true|number`, and
`calcCorrectGraphs[damageType] = number[]` (pre-sampled curve).

## A.3 Gap analysis — what we have vs. need

Our generated `packages/data/src/generated/weapons.ts` carries the _display_ fields (`attackPhysical`,
requirements, `upgradeCosts`, `effects[]`, `icon`); the AR scaling lives in the separate generated
`weapon-scaling.ts` + the three shared tables (done — see the status block). The web side consumes them
via `apps/web/src/lib/ar.ts` (`arCalculator`, `weaponScalingById`, `maxUpgradeFor`). This satisfies the
"extractor-derived, never scraped" principle (cf. [[no-scraped-map-coords]], [[map-treasure-source]]) —
no vendored regulation JSON that goes stale per patch.

## A.4 Remaining formula-adjacent work

- **Status buildup** (Bleed/Frost/Poison/Rot/Sleep/Madness): same scaling structure, own base + curve +
  `statusSpEffectParam` offsets. **Blocker for an honest Arcane/Bleed archetype ranking** (idea F). The
  Arcane preset should warn "ranked by AR only; bleed not yet modelled" until this lands.
- **Buffs/talismans/physick** (+X% AR, flat adds): a _layer on top_ of base AR — the reference models
  these as `activeBuffs`/`passiveBuffs`. Defer; base AR first.
- **Upgrade cap:** somber weapons go to +10, normal to +25 — already read from the reinforce chain
  length (`maxUpgradeFor`), never assumed.
- **Affinities (A2):** affinity variants are distinct `EquipParamWeapon` rows in our dataset; the
  best-affinity-per-weapon collapse in `WeaponArTable` already enumerates them. The
  [`coalesce-items-with-affinities.md`](./complete/coalesce-items-with-affinities.md) work is the
  display-side counterpart.
