# Min-maxing calculators — landscape research & how Compass can beat them

> **Status (2026-06-06): v1 SHIPPED — Weapon AR Calculator.** The AR extraction + formula (see the
> appendix) and the **first calculator UI** are live. `apps/web/src/components/sections/weapon-ar-calculator.tsx`
> (the **Calculator** nav view) rates every armament's Attack Rating at the player's real stats
> (auto-filled from the connected save, editable for theorycrafting) and ranks them — "best weapon for
> my build" is the top of the table. It has three modes: **best-affinity-per-weapon** (default — a
> built-in affinity recommender, idea A2), **every affinity**, and **only weapons I own** (save-aware,
> idea A). Columns: AR + per-type damage split, upgrade level, wieldable (requirement check), owned.
> Verified end-to-end (golden tests + live render). Helper: `apps/web/src/lib/ar.ts`.
>
> Still **future**: the "go get this" map routing (idea B), respec/rune planner (D), armor optimizer
> (E), status-proc (F), and surfacing the player's *owned upgrade level* per weapon. Known data gap:
> new DLC weapon classes (Backhand Blades, Beast Claws, Great Katana, Milady, Perfume Bottles, …) fall
> into category `"Other"` because their `wepType` isn't in the extractor's `WEAPON_CATEGORY` map — they
> still rate correctly, but the inventory/category label is wrong; worth mapping in the extractor.
>
> This doc surveys the existing Elden Ring calculator/build-planner ecosystem, picks which tools to take
> inspiration from, and — the whole point — lays out what **Compass can do that none of them can, because
> we have the player's parsed save file** (current stats, equipped gear, full owned-item inventory, owned
> upgrade materials, runes held) **and extractor-derived map placements** (where every item physically is
> in the world).

The original ask (verbatim): _"provide calculators in the app for min-maxing… look up what Elden Ring
calculators are out there and see how we can make them better by having the save data available."_
Plus three steers from the conversation:

1. Focus on **calculators for people trying to come up with builds** (theorycrafting planners), not
   one-off arithmetic widgets.
2. **Suggest weapons** to the user based on their current build.
3. **Suggest the user go get a specific item** to make their current loadout stronger.

All three converge on the same Compass-only superpower (see [§3](#3-the-compass-advantage) and
[§4](#4-concrete-feature-ideas)).

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
| **soulsplanner.com**                                                                     | The classic Souls planner (DS1–3, BB). Lets you build around a weapon or find weapons that work on a build; community build sharing/profiles.                                                                                                                                                                                 | Gold standard for **shareable community builds** + "find weapons that fit these stats."                                                  | **No Elden Ring support** — the author stopped at DS3. Leaves an open niche.                                 |

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
  threshold ramp). Niche but beloved.
- **Rune / level cost calculators** — runes-from-level-A-to-B via the game's exponential formula
  (eldenringrunecalculator, procalculator). Trivial math, high search volume.
- **Equip-load / roll-type calculators** — weight → roll speed (≤30% / ≤70% / >70%) + poise.
- **Soft-cap cheat sheets** — not interactive; just "stop leveling X at N" tables. Begs to be made
  interactive _against the player's actual current stats_.

### Cross-cutting observations

- **Every single one is stat-entry-first.** You type in your stats (or pick a class and allocate from
  scratch). **None of them know your actual character.** This is the entire opening for Compass.
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
4. **nyedr AR calculator** (read the source) + **soulsplanner** (the "find weapons that fit my stats"
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
  weight, attack), armor, talismans, spells, ashes-of-war, spirit-ashes, sp-effects.
  _(See `packages/data/src/generated/`.)_
- **Map placements** — extractor-derived world coordinates for items (the `placements`/`markers`
  datasets, incl. exact EMEVD event-drop coords). **No other calculator has this.**

The combination means we can answer questions phrased in terms of the player's _real, specific
situation_ — "for **me**, right now, with what **I own**" — which no stat-entry tool can.

---

## 4. Concrete feature ideas

Ordered roughly by value-to-effort. Each is gated on data we already have.

### ⭐ A. "Best weapon for _you_" — recommender (the user's idea #2)

Run the AR calc across the weapon dataset **using the save's real stats**, then split results into two
ranked lists:

- **Weapons you already own** (intersect against parsed inventory) → _"For your 40 STR / 18 DEX, the best
  thing in your inventory is the Heavy Greatsword +12 at ~XXX AR. You're under-using it."_
- **Weapons you don't own yet** → feeds idea B.

This is soulsplanner's "find weapons for my stats" but **auto-fed from the save and partitioned by
ownership** — something no existing tool does. Also surface: weapons you **just barely** can't wield
("+2 STR and the Greatsword opens up") and weapons whose **affinity** you could swap into a better fit.

### ⭐ A2. "Best affinity for _that_ weapon" — affinity recommender (the user's idea #4)

For any weapon (especially the one equipped), sweep **all legal affinities** (Heavy/Keen/Quality/
Magic/Fire/Flame Art/Lightning/Sacred/Cold/Poison/Blood/Occult/Standard) through the AR formula
**against the save's real stats** and rank them. _"You're running Keen on your Longsword, but at your
40 STR / 12 DEX, **Heavy** gives ~XX more AR. Want it?"_ Extend it both ways:

- **Save-aware:** does the player **own the Ash of War / Whetblade** needed to apply that affinity?
  (Whetblades and Ashes are in the item data + inventory.) "Heavy is best _and_ you already own the
  Whetstone Knife + a Heavy ash — you can do this now." vs. "best affinity needs the Black Whetblade —
  it's at [location]" → routes to idea B.
- **Status-aware:** flag when an affinity that _lowers_ raw AR is actually better for the build because
  it adds **bleed/frost/etc.** (Blood/Cold scaling with Arcane) — tie into idea F so the tradeoff is
  shown as "−20 AR but procs bleed in 4 hits."
- This is genuinely a small search space per weapon, so it's cheap once the AR formula exists, and it's
  a question players ask constantly that **no save-aware tool answers**.

### ⭐ B. "Go get this" — world-aware upgrade suggestions (the user's idea #3)

The killer feature, because it fuses all three datasets + the map we already render:

- _"The Blasphemous Blade scales better for your FAI build than anything you own — it's at
  Mt. Gelmir. [Show on map]."_ Uses placements → drop a marker / route on the existing Compass map.
- _"You own the materials to take your Uchigatana from +6 to +12 right now"_ — diff
  `weapon.upgradeCosts[]` against owned Smithing Stones in inventory.
- _"You're 2 Somber Smithing Stone (6) short of maxing your Moonveil — the nearest one is at X."_
  Materials-you-lack → where to find them, on the map.

No calculator can do this; they don't know the world, your bag, or your forge progress. **Compass does.**

### C. Save-prefilled build sandbox (the tarnished.dev/Fextralife pattern, but auto-populated)

Open the planner and it's **already your character** — equipped loadout, stats, level. Then
theorycraft _from reality_: toggle a talisman, swap an ash of war, see AR/defense/poise/equip-load
deltas **vs. your current actual setup** (not vs. an empty form). "What changes if I…" beats "build
from scratch."

### D. Respec & level-up planner grounded in real runes

You know their **current level + runes held**. So:

- "A respec to a 50-INT Moonveil build costs N runes to reallocate; you can afford it / you're short."
- Interactive **soft-cap advisor against current stats**: "your next 5 points are worth more in MIND
  than STR (you're past the STR softcap)" — the soft-cap cheat sheet, personalized.
- "Reaching the meta PvP level (125) from your current level costs N runes."

### E. Armor optimizer, save-aware

jerp's knapsack, but constrained to **armor you own** by default (toggle to "include unobtained, show me
where they are" → idea B again). "Best poise under your _current_ equip load, from your _current_
wardrobe."

### F. Status-proc calculator using equipped weapon + real Arcane

statusttp's "hits to proc on boss X" but auto-fed from the equipped weapon's buildup + the save's Arcane.
Optionally cross-ref the boss list against **which bosses the save hasn't beaten yet** (we have boss
flags from quest-compass work) → "for your next boss, your current weapon procs bleed in 4 hits."

### G. Trivial readout panels

Rune-cost, equip-load %, summon range, fall damage — cheap to include once the character model exists.
Not headline features, but they round out the sandbox and capture search traffic.

---

## 5. Suggested build-out

- **Foundation:** port/verify the **AR formula** (read `nyedr/elden-ring-ar-calculator`, MIT) against
  our `weapons` dataset incl. scaling `effects[]` and upgrade levels. This unblocks A, B, C, F. Validate
  numbers against tarnished.dev for a handful of weapons.
- **MVP = idea A** ("best weapon for you," ownership-partitioned). It's the smallest slice that already
  feels magical and proves the formula. Pure save × weapon-data; no map needed yet.
- **The wow moment = idea B** ("go get this" on the map). Plug A's "don't own yet" list + the
  materials-gap check into placements + the existing map. This is the feature to demo.
- **Then C–F** as the sandbox matures. Mirror tarnished.dev's panels-on-one-character-model
  architecture so each calc reuses the same parsed-save character object.

**Throughline:** every competitor makes you describe a hypothetical character. Compass already _has_
your character — so frame every calculator as _"for you, right now, with what you own, here's the
move, and here's where to go."_ That's the whole differentiation.

---

## Sources

- [tarnished.dev — calculators suite](https://www.tarnished.dev/) ([Build Planner](https://www.tarnished.dev/build-planner), [Armor Optimizer](https://www.tarnished.dev/armor-optimizer), [Weapon AR Calc](https://www.tarnished.dev/weapon-calculator))
- [EIP Gaming — Build Planner](https://eip.gg/elden-ring/build-planner/)
- [Fextralife — Build Calculator](https://eldenring.wiki.fextralife.com/Build+calculator) · [Stats](https://eldenring.wiki.fextralife.com/Stats) · [Damage Types](https://eldenring.wiki.fextralife.com/Damage+Types)
- [er-build-planner.nyasu.business — Build & Inventory Planner](https://er-build-planner.nyasu.business/)
- [soulsplanner.com](https://soulsplanner.com/) (DS/BB only; ER niche unoccupied)
- [nyedr/elden-ring-ar-calculator — open-source AR calc (MIT, TS/Next.js)](https://github.com/nyedr/elden-ring-ar-calculator)
- [jerpdoesgames/EldenRingArmorOptimizer — open-source armor knapsack](https://github.com/jerpdoesgames/EldenRingArmorOptimizer) · [hosted](https://jerp.tv/eldenring/armor/)
- [statusttp.xyz — hits-to-proc status calculator](https://www.statusttp.xyz/)
- [eldenring.tclark.io — weapon calc (mod support)](https://eldenring.tclark.io/)
- [Elden Ring Rune Calculator](https://eldenringrunecalculator.vercel.app/)
- [utplay — damage calc guide (split scaling, negation)](https://www.utplay.com/news/2627--elden-ring-damage-calculator-guide-split-scaling-stats-negation--damage-calculation-explained)

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
> same; only damage AR is wired today), buffs/talisman/physick layering, and the calculator UI itself
> (features A/A2/B/C/F).
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
- **Requirement penalty:** missing a stat requirement doesn't zero the weapon — it sets that damage
  type's multiplier to `1 − 0.4 = 0.6` (a −40% penalty), and flags the type ineffective.
- **`attackElementCorrect`** (AttackElementCorrectParam) decides _which_ attributes correct _which_
  damage type. An entry can be `true` (use the weapon's raw scaling) or a numeric override coefficient
  (then `scaling = override * attributeScaling[lvl] / attributeScaling[0]`).
- **Spell tools** (staffs/seals) reuse the same loop to produce "Sorcery/Incantation Scaling" =
  `100 * totalScaling`.

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

Our generated `packages/data/src/generated/weapons.ts` **today** has: `attackPhysical` (single number,
+0, physical only), requirements, `upgradeCosts` (rune cost — **not** the reinforce damage/scaling
multipliers), and `effects[]` (passive sp-effects). **It has none of the four fields the AR formula
needs.** So the AR calc cannot be built on the current dataset.

**Good news — the hard infra already exists in our extractor:**

- `formats/paramdef.ts` loads any vendored Paramdex def by ParamType; `game/regulation.ts` decrypts
  regulation.bin into param tables; `stages/params.ts` reads rows generically.
- `stages/join.ts:435` **already** reads `EquipParamWeapon` rows and follows `reinforceTypeId` into
  **`ReinforceParamWeapon`** (for upgrade chains). So params #1 and #2 are already in hand.
- Remaining work is reading **more columns** off rows we already load, plus loading **two more tables**
  (#3 `AttackElementCorrectParam`, #4 `CalcCorrectGraph`) via the existing generic loader.

This fits our "**extractor-derived, never scraped**" principle (cf. [[no-scraped-map-coords]],
[[map-treasure-source]]) — no need to vendor someone else's precomputed regulation JSON, which would go
stale every patch and break our provenance story.

## A.4 Plan

**Extractor (packages/extractor):**

1. In the weapon join, additionally read off each `EquipParamWeapon` row: per-damage-type base attack
   (`attackBasePhysical/Magic/Fire/Thunder/Dark`), per-attribute scaling (`correctStrength`/`Agility`/
   `Magic`/`Faith`/`Luck`), the `correctType_*` curve ids per damage type, `attackElementCorrectId`,
   and status-buildup fields. (We already have requirements + `reinforceTypeId`.)
2. Load `AttackElementCorrectParam` and `CalcCorrectGraph` via the generic loader.
3. Apply `ReinforceParamWeapon[reinforceTypeId + level]` to produce the per-`+N` `attack[]` and
   `attributeScaling[]` arrays (cap = 25 for normal stones, 10 for somber — derive from the row, don't
   hardcode).
4. **Pre-sample each CalcCorrectGraph** referenced by weapons into a `number[]` (index = attribute value
   0..150) so the web side does a pure array lookup.
5. Emit an extended `Weapon` (or a sibling `weapons-scaling.ts`) with `attack`, `attributeScaling`,
   `attackElementCorrect`, `calcCorrectGraphs`, plus base status buildup + scaling.

**Web (packages/web):** port `getWeaponAttack` (~80 lines, pure function — transcribe from the
reference `calculator.ts`, no deps) into a `@elden-ring-compass/...` util. Input = our extended weapon +
the player's attributes (from the **parsed save** — the whole point) + upgrade level + two-handing flag.
Output = AR per damage type + total + ineffective flags.

**Validation:** golden-file test — pick ~10 weapons spanning archetypes (Dagger, Heavy/Keen affinities,
a split-damage weapon like Moonveil, an Arcane bleed weapon, a staff, a somber weapon) at a few stat
spreads and upgrade levels, and assert our AR matches tarnished.dev / the nyedr calc within ±1.

## A.5 Gotchas / open questions

- **Affinities (idea A2):** an affinity is a different `EquipParamWeapon` row (or a Gem applied to a
  base). Confirm how our weapon dataset currently represents affinity variants — the AR calc must be
  able to enumerate all affinity rows for a base weapon to rank them. (May already be distinct rows.)
- **Upgrade cap:** somber weapons go to +10, normal to +25 — read from the reinforce chain length, never
  assume 25.
- **Status buildup** (for idea F) follows the _same_ scaling structure but with its own base + curve;
  scope it as a fast-follow once damage AR is verified.
- **Buffs/talismans/physick** (e.g. +X% AR, flat adds) are a _layer on top_ of base AR — the reference
  models these as `activeBuffs`/`passiveBuffs`. Defer; base AR first.
- **Param field names** vary by Paramdex version — verify exact column names against our vendored
  paramdefs rather than trusting the names above.
- If reading `CalcCorrectGraph` proves fiddly, a **temporary** unblock is to borrow the reference's
  precomputed curves to validate the web port while the extractor side lands — but the shipping source
  must be our own extractor output.
