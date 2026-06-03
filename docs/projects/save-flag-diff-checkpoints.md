# Save-Flag Diff Checkpoints — flag mining + progression journey

> **Status (2026-06-02): GREENFIELD — idea/planning only.** No code exists. This doc scopes
> a feature that snapshots a save's event-flag bitfield over time, diffs the snapshots, and
> uses the deltas for two payoffs: (1) **reverse-engineering unknown event flags**, and (2) a
> **speedrun / progression "journey" timeline**. It is the empirical half of the "flag
> addressing" problem in [quest-compass](./quest-compass.md).

## The gap this closes

The WASM save parser already exposes the **entire raw event-flag bitfield** —
`event_flags.flags: Uint8Array` (trailing zeros trimmed), read via
`flags[byteOffset] & (1 << bit)`. So **every bit is readable today**. What's missing is the
**semantic map** (`eventId → [byteOffset, bit]`): the only labels we have are the
graces/bosses ported from ClayAmore's Rust editor (`RAW_ELDEN_RING_DB.EVENT_FLAGS` in
`apps/web/src/lib/vm/events.ts`). The vast majority of bits are unlabeled.

We can read every bit; we just don't know what most of them *mean*. This feature builds the
meaning **observationally**.

## The core idea

```
load save → snapshot flags (Uint8Array) + timestamp + label → persist to client storage
                                   │
            keep playing, do a known action (e.g. "tuned spirits with Roderika")
                                   │
load save again → snapshot #2
                                   │
       diff(#1, #2) → set of (byteOffset, bit) that flipped 0→1 (and 1→0)
                                   │
   correlate the flipped bits with what the user did between snapshots → flag label
```

A diff around a *single, known* action narrows "which bit is this quest step" to a handful of
candidates; a few such diffs (or one clean isolated action) pin it exactly. This is precisely
how we'd resolve Roderika `3708` ("became Spirit Tuner") → an absolute `(byte, bit)` for the
quest-compass spike.

## Two payoffs

### 1. Flag mining (the research engine)

- **Manual labeling**: user tags a checkpoint ("just beat Margit", "gave Boc the sewing
  needle"); the diff's flipped bits become candidate labels for that action.
- **Auto-correlation**: we *already* decode some deltas independently (a new grace lit, a boss
  flag, a new inventory item from the parsed save). Cross-referencing those known deltas with
  the raw-bit diff lets us auto-confirm/auto-label without the user typing anything.
- Output grows `eventId → [byte, bit]` coverage beyond the ClayAmore seed — feeding
  quest-compass and any other flag-driven feature.

### 2. Progression journey (the user-facing hook)

An ordered series of checkpoints is a **timeline of a playthrough**: first-grace / first-boss
/ flag-count-over-time / region unlocks / quest-step firsts. Useful for:

- speedrunners reviewing their route and splits;
- any player seeing "here's how my run progressed";
- shareable/exportable run history.

The journey makes the (otherwise invisible) research engine worth using — players opt into
snapshots because *they* get something, and we get diff data as a side effect.

## Resolution: empirical (this doc) vs analytical (formula)

Two complementary ways to map a named flag to a save `(byte, bit)`:

| | Analytical formula | Empirical diff (this feature) |
| --- | --- | --- |
| How | implement ER's event-flag-id → `(byte, bit)` addressing math once | observe which bit flips around a known action |
| Strength | instant for any flag already named upstream (soulsmods/soulstruct) | finds **un-named** flags; **patch-robust**; needs no formula |
| Weakness | brittle if the layout/formula assumption is wrong; one-time RE cost | needs a player to perform the action; noisier (many bits move at once) |

They reinforce each other: the formula proposes a `(byte, bit)`, a diff confirms it. Do both;
neither blocks the other.

## Storage — an explicit decision (tension flagged)

The committed web data-layer direction is **effect-atom-react + in-memory, NO IndexedDB**
(see the `web-data-layer-direction` memory / `client-side-db.md`). Checkpoints need to
**persist across sessions and reloads**, so this would be the **first persistent client
store** in the app — a conscious exception, not a drift. Options:

- **localStorage** — simplest. The trimmed bitfield is small (single-digit KB); even dozens of
  snapshots fit comfortably in the ~5 MB budget. Good enough for a v1 / a handful of runs.
- **IndexedDB** — if we want many snapshots, binary blobs, or multiple save slots / runs
  archived. More machinery; revisits the very thing the data-layer decision set aside.

Lean: **localStorage for v1** (measure real bitfield size first), with the schema designed so
a later IndexedDB move is mechanical. Decide consciously and record it as a boundary.

## Privacy & the static-site constraint

- The site is **client-only / static** (CLAUDE.md anti-pattern: "Don't add server-side
  logic"). All snapshotting + diffing is **local by default** — nothing leaves the browser.
- **Crowdsourced aggregation** (many users' diffs converging the flag map fast) is the obvious
  multiplier, but it requires *somewhere to send data* — which conflicts with static-only.
  Treat it as **out of scope / later**, and when it comes: opt-in only, and via a minimal
  external sink (tiny serverless endpoint, or a GitHub-PR/issue submission of a labeled diff)
  rather than adding a backend to the app. Log this as a deliberate boundary if pursued.

## Open questions

1. **Snapshot trigger** — manual "Save checkpoint" button, auto on each save-file (re)load, or
   poll a live save? (Auto-on-load is the least friction and aligns with how the app already
   ingests saves.)
2. **What to store per checkpoint** — just the flag bitfield + timestamp + label, or also a
   richer derived summary (graces/bosses/region/playtime) so the journey UI needs no re-parse?
3. **Diff granularity / noise** — a single session moves *many* bits (visited regions, killed
   mobs). How to isolate the bit for one quest step: tight-window diffs, intersection across
   multiple users/runs, or excluding bits already known.
4. **Labeling UX** — free-text tag per checkpoint vs a structured "I did: <action>" picker
   that ties into the quest-compass step list.
5. **Multiple runs / slots** — one timeline per save slot? archive completed runs?
6. **localStorage vs IndexedDB** — see Storage; gate on measured bitfield size + snapshot count.
7. **Aggregation** — if/when crowdsourcing, what's the minimal opt-in sink that respects the
   static-site constraint?

## Relationship to other projects

- **[quest-compass](./quest-compass.md)** — primary consumer. The diff tool resolves the
  relative→absolute **flag addressing** unknown and confirms which bit = which quest step
  (Roderika `3708` is the worked spike). The named-flag dictionary (soulsmods) + decompiled
  logic (soulstruct) tell us *what to look for*; the diff tool tells us *where it lives* in the
  save.
- **`wasm-save-parser-rewrite.md`** — the enabler. The full raw bitfield it ships is the only
  parser dependency; no parser changes needed.
- **`client-side-db.md` / `web-data-layer-direction`** — the storage decision lives against
  this committed in-memory direction; checkpoints are the first persistent exception.
