# Quest Compass — save-aware "what do I do next" guidance

> **Status (2026-06-02): GREENFIELD — not started.** No quest-compass logic exists on
> `main`. This doc scopes the feature. The one hard prerequisite — **arbitrary event-flag
> access from a parsed save** — is already in place: the WASM save parser ships the full
> event-flag bitfield (trailing-zeros-trimmed, offsets preserved), so any quest flag is
> addressable in JS with zero parser changes (see `wasm-save-parser-rewrite.md` §4) — though
> the _semantic_ map (which flag id → which save byte/bit) is only partially known (graces +
> bosses, ported from ClayAmore's editor; the raw bitfield is complete, the labels are not).
> What's missing is web-side + a data-sourcing problem (quest-step → event-flag mapping).
> **Update 2026-06-02:** that mapping now has a concrete anchor — the game ships a per-NPC
> quest **state machine** as named event flags (see "The quest-step spine" below). The one
> genuine R&D unknown left is _flag addressing_ (relative quest-flag id → absolute save
> byte/bit), best resolved empirically via the
> [save-flag-diff checkpoints](./save-flag-diff-checkpoints.md) tool.
>
> **Update 2026-06-03 (deferred, but a prerequisite landed):** the **EMEVD semantic layer** that
> quest-step→flag sourcing will lean on now exists. `formats/emedf.ts` plus the vendored soulstruct
> **EMEDF** dictionary decode any event-script instruction into named, typed args (verified 100%
> opcode coverage on 107k instructions / 589 EMEVDs). Built as the foundation for map-treasure
> placements (#10b), it is equally the way to mine the per-NPC quest state machine (talk-state flags,
> `SetEventFlag` / condition instructions) from the install rather than hand-authoring it.
> quest-compass itself remains deferred.
>
> **Update 2026-06-04 — THE BOTTLENECK IS GONE. A ready-made quest-flag dataset exists.**
> Reviewing the newly-cloned **[er-save-manager](https://github.com/.../er-save-manager)** (Hapfel,
> MIT; a Python reimpl of ER-Save-Lib) surfaced `src/er_save_manager/data/quest_flags_db.py`
> (9,927 lines, **36 NPC questlines**) — this **is** the "quest-step → event-flag id mapping" this
> doc has called the single bottleneck. Two findings collapse the remaining R&D:
>
> 1. **The "flag addressing" unknown is DISSOLVED — no Roderika spike needed.** The DB keys on
>    **absolute** flag ids (`11109855`, `1040529256`), _not_ the relative per-NPC ids (`3707`) this
>    doc feared. er-save-manager's `parser/event_flags.py` resolves them with the **identical
>    `eventflag_bst.txt` BST formula our extractor already vendored** (`eventFlagOffset(id)→[byte,bit]`,
>    verified 1178/1178 — `src/vendor/eventflag-bst.txt`, see `PROVENANCE.md`). **We can read every one
>    of these flags from a parsed save today, zero parser/extractor work.** Phase 0 below (the
>    addressing spike) is **obsolete**.
> 2. **The completion model is decided (Open Question #1, below).** Each step carries _multiple_ flags
>    with target values, **including `value: 0` (negations)** — i.e. a boolean **AND-expression**, not
>    a single flag. The single-flag-per-objective model is insufficient; the dataset already proves the
>    expression shape.
>
> Plus `parser/event_flags.py`'s `CorruptionDetector`/`FixFlags` encodes concrete **softlock/missable
> logic** (Ranni blocking flag `1034500738`; Radahn/Morgott/Radagon/Sealing-Tree warp-sickness gates) —
> a ready seed for **Phase 3 "atRisk" warnings**. The DB is a **CT/community-spreadsheet snapshot**
> (Phase 2's "curated overlay" — exactly the planned curated boundary; log it in `PROVENANCE.md` when
> adopted). This is reuse of already-done RE we are explicitly out-of-scope to do ourselves (CT
> scraping / live memory), consistent with how we already vendor `eventflag-bst.txt` / EMEDF / Paramdex.

## Why

The site already shows _what you've done_ (graces, bosses, inventory). The compass answers
the next question: **"given my save, what should I do next to advance quest X?"** — a
prioritized, save-aware checklist instead of a static wiki walkthrough. NPC questlines
(Ranni, Boc, Alexander, Millicent, …) are famously easy to permanently fail by progressing
the world in the wrong order; a compass that reads your actual flags and says "do this
before resting at that grace" is the headline value.

## What exists today (the seed, not the feature)

- **`apps/web/src/lib/er-objectives.ts`** — a hand-authored, hardcoded walkthrough scraped
  from Fextralife: `Region → DetailedStep[] → Objective[]`, where an `Objective` is an
  `npc` / `boss` / `location` / generic step with optional `items`, `notes`,
  `recommendedLevel`, `tags`. **Only "West Limgrave" is filled in.** Crucially it is **not
  linked to save state** — it's static prose. There is no notion of "is this objective done"
  or "which step am I on."
- **`apps/web/src/components/sections/quests-section.tsx`** — an empty placeholder `Card`
  titled "Quests". Wired nowhere meaningful.

So the feature is: **make the objectives save-aware** — each objective gains a completion
predicate over event flags, and the UI derives the player's current position + next step.

## The core idea

```
parsed save → event_flags (full bitfield)            er-objectives (quest steps)
        │                                                     │
        └──────────────┬──────────────────────────────────────┘
                       ▼
        per-objective completion predicate (flag bit set?)
                       ▼
   derived: { completed[], currentStep, nextStep, blocked/missable warnings }
                       ▼
              Quest Compass UI (effect-atom derived state)
```

Each objective gets an optional **`flag`** (or a small boolean expression over flags). A
derived atom joins `event_flags` ⨝ objectives → completion state, the first incomplete
objective is the "next step," and missable steps carry an ordering warning.

## Data dependencies

| Dependency                             | Status         | Source                                                                                                                                                                                                                                                    |
| -------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read any event flag from a save**    | ✅ done        | Lean DTO ships full `event_flags` bitfield; `vm/events.ts` already does grace/boss bit-math. Same bit formula works for quest flags.                                                                                                                      |
| **Quest-step → event-flag id mapping** | ✅ **available (curated)** | `er-save-manager/data/quest_flags_db.py` — **36 NPC questlines**, each an ordered list of steps `{description, location, flags:[{id,value}]}` keyed on **absolute** flag ids. Addressing already solved via our `eventFlagOffset()`. CT/spreadsheet-derived → a curated overlay (log in `PROVENANCE.md`). Durable EMEVD re-derivation stays the Phase-4 ideal. _(Original anchor — the soulsmods `EFID_Talk_NPCxxx` named-flag index + soulstruct decompile — remains the verification/durable source.)_ |
| **Objective walkthrough content**      | ◐ partial      | `er-objectives.ts` (hand-authored, West Limgrave only). Expand by hand or semi-derive.                                                                                                                                                                    |
| **NPC / boss / location names + ids**  | ◐ in progress  | Comes from the extractor data layer (`dlc-support.md` / `client-side-db.md`, task #7).                                                                                                                                                                    |

~~**The bottleneck is the flag mapping**, not the parser.~~ **As of 2026-06-04 the flag
mapping is no longer a bottleneck** — `quest_flags_db.py` supplies the per-step absolute
flag ids for 36 NPCs and our `eventFlagOffset()` reads them directly. The remaining work is
**web-side wiring + content breadth + missable modeling**, not R&D.

## The quest-step spine: per-NPC event-state flags (found 2026-06-02)

The community "quest" is not a first-class object in the game files — but the per-NPC
**quest state machine is**. Each questline NPC has an `EFID_Talk_NPC{nnn}` flag block (in
the soulsmods event-flag index) with two sub-blocks:

- **status** — `alive / hostile(absolvable) / hostile(not) / dead`
- **event state** — one named flag per quest checkpoint

Roderika (`NPC320`, talk id `320001110`) is the worked example:

| rel flag  | name (JP → EN)                                     |
| --------- | -------------------------------------------------- |
| 3700–3703 | status: alive / hostile(abs) / hostile(not) / dead |
| 3705      | event state: initial                               |
| 3707      | event state: came to Roundtable Hold               |
| 3708      | event state: became Spirit Tuner                   |
| 3709      | event state: Erdtree burned                        |

soulstruct's decompile of her map (`m11_10_00_00.evs.py`) reads exactly these flags —
`Event_11103710` branches on `flag=3700/3701/3703` (status) and `FlagEnabled(3707)` to pick
which Roderika to spawn. So the **event-state flags ≈ the vertical track in the flowchart**,
and the **status flags are the missable/failure detector**.

### Three sources, three roles

All cloned under `docs/cloned-repos-as-docs/dlc-data-sources/`:

| Source                                                                | Role                                                                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Fextralife "Side Quests" + thefifthmatt "All NPC Quests V5" flowchart | **Narrative** — ordering, missable gates, step prose, cross-NPC edges                                                 |
| soulsmods `elden-ring-eventparam/index.md`                            | **Flag dictionary** — named event-state + status flags per NPC (JP, machine-translatable; ~54 `EFID_Talk_NPC` blocks) |
| `soulstruct` decompile (478 `.evs.py` + per-map `enums/`)             | **Verification + logic** — confirms each flag's meaning, shows what _sets_ it, resolves English entity names          |

The earlier "curated cheat-table overlay, migrate to EMEVD later" plan is **superseded**:
soulstruct's decompile _is_ the durable EMEVD source (already on disk, more trustworthy than
a CT snapshot), and the named event-state flags make this **alignment** work, not
**reverse-engineering**.

### ~~The one real unknown: flag addressing~~ → RESOLVED (2026-06-04)

This section described the relative-id (`3707`) → absolute `(byte,bit)` problem and a
Roderika spike to settle it. **It is moot.** The curated `quest_flags_db.py` keys on
**absolute** flag ids, which our **already-vendored** event-flag addressing
(`eventFlagOffset()` / `eventflag-bst.txt`, verified 1178/1178) reads directly. The
analytical path it called for is **already implemented and shipped**.

The two paths below are retained only as the **durable / patch-robust** options for the
Phase-4 ideal (re-deriving flags from the install instead of the curated snapshot), and the
empirical one still powers the separate flag-mining / speedrun-journey feature:

- **analytical** — ER's event-flag-id → `(byte, bit)` addressing formula (✅ done:
  `er-extractor/src/game/event-flags.ts`);
- **empirical** — diff save snapshots around a known action to observe which bit flips
  (see [save-flag-diff checkpoints](./save-flag-diff-checkpoints.md); patch-robust, and the
  way to _verify_ the curated ids against a real save).

## Data model (proposed)

```
QuestTrack (per NPC):
  npc, talkId
  statusFlags: { alive, hostileAbsolvable, hostileNot, dead }   // → failure detection
  steps: [ { label, location?, guidance,
             completion: [ { id, value } ],                      // AND over flags; value 0|1 (0 = must be UNset)
             gate?, requiresBefore? } ]                          // checkpoint = all completion flags match
  dependsOn: [ other track checkpoints ]                         // cross-NPC edges

WorldGate (global, shared): GODRICK_DEAD | ERDTREE_BURNED | LEYNDELL_REACHED | ...
  → a world-progression flag (boss-defeat / grace / event) we ALREADY compute in vm/events.ts
```

Derived per save:

- `currentStep` = furthest step whose `eventStateFlag` is set (**monotonic furthest-reached
  inference** — covers wiki micro-steps that set only volatile/un-saved flags; those become
  guidance text under the current checkpoint, not independently-tracked items);
- `failed` = status is dead / hostile(not) and not at a terminal step;
- **`atRisk`** = a `requiresBefore` gate's flag is set but the gated step isn't done → the
  headline "you're about to lock yourself out" warning.

## Relationship to the other projects

- **`wasm-save-parser-rewrite.md`** — the enabler. Already done; quest flags need no further
  parser work. This was an explicit reason that doc chose to ship the _whole_ flag region
  rather than a fixed grace/boss id→bool map.
- **`dlc-support.md`** — the flag-sourcing problem is the same as boss-defeat flags;
  whatever EMEVD/CT tooling lands there feeds the durable version of this feature.
- **`client-side-db.md`** — the objectives + the flag overlay become datasets/derived atoms;
  the compass UI is effect-atom derived state, same pattern as the tables.

## Open questions

1. ~~**Completion model** — single flag per objective, or a small boolean expression?~~
   **RESOLVED:** `quest_flags_db.py` uses an **AND over `{id, value}`** per step, where
   `value: 0` means "must be unset" (a negation). Adopt that shape directly; revisit OR/fork
   only if a specific questline needs it.
2. **Missable-step modeling** — how to encode "do A before resting at grace G / before
   boss B"? An ordering/precedes relation between objectives + the flags that "lock" a path.
3. **Scope of v1** — just NPC questlines (highest value, most missable), or the full
   region walkthrough? NPC questlines first is the likely MVP.
4. **DLC quests** — fold in once DLC names/flags resolve (task #7 + flag sourcing).
5. **UI shape** — per-quest tracker vs a single prioritized "next steps" feed vs map
   integration (pin the next objective's location on the tiled map).

## Phased plan (proposed)

- **Phase 0 — ~~addressing spike~~ → dataset import (de-risked).** The addressing spike is
  obsolete (addressing already shipped). Instead: **convert `quest_flags_db.py` → a typed TS
  dataset** (`{ npc, steps: [{ description, location, completion: [{id,value}] }] }`), and
  **prove the join** against `ER0000.sl2` via the existing `eventFlagOffset()` in a vitest
  test (a fresh save → every step incomplete; flip a known flag → that step completes). Pick
  one or two NPCs (e.g. Ranni, Roderika) to validate end-to-end first.
- **Phase 1 — derived state + UI.** effect-atom derived state (objectives ⨝ event_flags →
  `{completed, currentStep, nextStep}`); fill in `quests-section.tsx` with a real tracker.
- **Phase 2 — flag overlay (breadth).** Import all **36** `quest_flags_db.py` questlines as
  the curated overlay (log the boundary in `PROVENANCE.md`); cross-check ids against a real
  save via the diff tool. Expand objective prose/content beyond West Limgrave.
- **Phase 3 — missable warnings.** Encode ordering/precedence; surface "do X before Y"
  warnings from the player's current flag state. **Seed from `er-save-manager`'s
  `parser/event_flags.py` `CorruptionDetector`/`FixFlags`** — it already encodes softlock +
  warp-sickness conditions as boolean flag expressions (e.g. Ranni blocking flag
  `1034500738`; `EventFlag(310) && !EventFlag(9130)` = Radahn-alive warp), a working model
  for `atRisk` predicates.
- **Phase 4 — durable flags + DLC.** Replace the curated overlay with EMEVD-derived flags
  once that extractor stage exists; add DLC questlines. Optional: pin the next objective on
  the map.

## Resources

- **Quest-flag dataset (curated, the unblock):** `docs/cloned-repos-as-docs/er-save-manager/
  src/er_save_manager/data/quest_flags_db.py` — 36 NPC questlines, absolute flag ids, MIT.
  Also `parser/event_flags.py` (`CorruptionDetector`/`FixFlags`) for missable/softlock logic,
  and `data/event_flags_db.py` (1,295 named flags) + `data/boss_data.py` (208 bosses w/ flags).
- Event-flag dictionary (named): `docs/cloned-repos-as-docs/dlc-data-sources/elden-ring-eventparam/index.md`
  (cloned soulsmods index; `EFID_Talk_NPCxxx` blocks = the per-NPC quest state machines).
  Also: Elden Ring Save Manager (948 flags), Grand Archives CT (`Elden-Ring-CT-TGA`, cloned).
- EMEVD logic (decompiled, English entity names): `docs/cloned-repos-as-docs/dlc-data-sources/soulstruct/src/soulstruct/eldenring/events/vanilla/`
  (478 `.evs.py` + `enums/` per map). Worked example: `m11_10_00_00.evs.py` `Event_11103710` (Roderika).
- Quest narrative/ordering/missables: Fextralife "Side Quests" (36 quests), thefifthmatt
  "All NPC Quests V5" flowchart. Current `er-objectives.ts` is scraped from Fextralife.
- Flag addressing + discovery tooling: [save-flag-diff checkpoints](./save-flag-diff-checkpoints.md).
