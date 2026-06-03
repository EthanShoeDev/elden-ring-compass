# Quest Compass — save-aware "what do I do next" guidance

> **Status (2026-06-02): GREENFIELD — not started.** No quest-compass logic exists on
> `main`. This doc scopes the feature. The one hard prerequisite — **arbitrary event-flag
> access from a parsed save** — is already in place: the WASM save parser ships the full
> event-flag bitfield (trailing-zeros-trimmed, offsets preserved), so any quest flag is
> addressable in JS with zero parser changes (see `wasm-save-parser-rewrite.md` §4). What's
> missing is entirely web-side + a data-sourcing problem (quest-step → event-flag mapping).

## Why

The site already shows *what you've done* (graces, bosses, inventory). The compass answers
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

| Dependency | Status | Source |
| --- | --- | --- |
| **Read any event flag from a save** | ✅ done | Lean DTO ships full `event_flags` bitfield; `vm/events.ts` already does grace/boss bit-math. Same bit formula works for quest flags. |
| **Quest-step → event-flag id mapping** | ❌ **the hard part** | Not in any clean param. Lives in **EMEVD** event scripts + community knowledge. Same class of problem as DLC boss-defeat flags (`dlc-support.md` §3, ⚠️ hard). |
| **Objective walkthrough content** | ◐ partial | `er-objectives.ts` (hand-authored, West Limgrave only). Expand by hand or semi-derive. |
| **NPC / boss / location names + ids** | ◐ in progress | Comes from the extractor data layer (`dlc-support.md` / `client-side-db.md`, task #7). |

**The bottleneck is the flag mapping**, not the parser. Each "Speak to Ranni", "Defeat
X", "Discover Y" needs the event-flag id that flips when it's done. Sourcing options
(cheapest → most durable):

1. **Community flag tables / cheat tables** — Grand Archives CT, Elden Ring Save Manager
   (948 documented flags), wikis. Fast to start; a curated snapshot that goes stale on
   patch (log every curated boundary, per `dlc-support.md` §7).
2. **EMEVD-derived** (the durable path) — derive quest flags from the install's event
   scripts via the extractor's future EMEVD reader (`dlc-support.md` Phase 7 / soulstruct
   ships 116 decompiled DLC scripts as a reference). Self-updating, owned, but large.

Pragmatic call: **start with a curated flag overlay** (option 1) keyed into
`er-objectives.ts`, and migrate to EMEVD-derived flags later when that extractor stage
exists — mirroring the boss-flag CT-overlay-then-EMEVD strategy.

## Relationship to the other projects

- **`wasm-save-parser-rewrite.md`** — the enabler. Already done; quest flags need no further
  parser work. This was an explicit reason that doc chose to ship the *whole* flag region
  rather than a fixed grace/boss id→bool map.
- **`dlc-support.md`** — the flag-sourcing problem is the same as boss-defeat flags;
  whatever EMEVD/CT tooling lands there feeds the durable version of this feature.
- **`client-side-db.md`** — the objectives + the flag overlay become datasets/derived atoms;
  the compass UI is effect-atom derived state, same pattern as the tables.

## Open questions

1. **Completion model** — single flag per objective, or a small boolean expression
   (AND/OR/NOT over flags) for multi-condition or fork steps?
2. **Missable-step modeling** — how to encode "do A before resting at grace G / before
   boss B"? An ordering/precedes relation between objectives + the flags that "lock" a path.
3. **Scope of v1** — just NPC questlines (highest value, most missable), or the full
   region walkthrough? NPC questlines first is the likely MVP.
4. **DLC quests** — fold in once DLC names/flags resolve (task #7 + flag sourcing).
5. **UI shape** — per-quest tracker vs a single prioritized "next steps" feed vs map
   integration (pin the next objective's location on the tiled map).

## Phased plan (proposed)

- **Phase 0 — schema + spike.** Extend the `Objective` type with an optional `flag`
  (or expression). Hardcode flags for **one** NPC questline (e.g. Boc, already partly in
  `er-objectives.ts`). Prove the join: save flags → completed/next-step for that quest.
- **Phase 1 — derived state + UI.** effect-atom derived state (objectives ⨝ event_flags →
  `{completed, currentStep, nextStep}`); fill in `quests-section.tsx` with a real tracker.
- **Phase 2 — flag overlay (breadth).** Curate flag ids for the main NPC questlines (CT /
  community sources), logged as a curated boundary. Expand objective content beyond West
  Limgrave.
- **Phase 3 — missable warnings.** Encode ordering/precedence; surface "do X before Y"
  warnings from the player's current flag state.
- **Phase 4 — durable flags + DLC.** Replace the curated overlay with EMEVD-derived flags
  once that extractor stage exists; add DLC questlines. Optional: pin the next objective on
  the map.

## Resources

- Event-flag references: [soulsmods event flag index](https://soulsmods.github.io/elden-ring-eventparam/),
  Elden Ring Save Manager (948 flags), Grand Archives CT (`Elden-Ring-CT-TGA`, cloned).
- EMEVD: [soulstruct](https://github.com/Grimrukh/soulstruct) (decompiled scripts),
  [ER EMEVD tutorial](http://soulsmodding.wikidot.com/tutorial:intro-to-elden-ring-emevd).
- Quest walkthrough content: Fextralife (current source of `er-objectives.ts`).
