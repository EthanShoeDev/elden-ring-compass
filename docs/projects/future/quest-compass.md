# Quest Compass: save-aware "what do I do next" for NPC questlines

> **Status (2026-11-24): BUILT, in review.** All 49 flowchart questlines (37 base game, 12 Shadow
> of the Erdtree) are authored in `apps/web/src/lib/quests/lines/`. The `/quests` page is built
> (`components/quests/*`, `components/shell/quests-view.tsx`) with an "Up next" panel, Endings,
> list and checklist detail, wiki links and rewards. Rewards and the cross-questline links are
> being filled in. Remaining gaps are tracked as `flagTodo` / `assumed` steps (`knownGaps()`).
> This doc replaces the 2026-06 scoping notes.
> Several of those notes are now stale: the WASM parser is retired, `er-objectives.ts` is gone, and
> the "`quest_flags_db.py` is the completion model" conclusion was wrong (see §2).

## 1. What we're building

Load a save and the `/quests` page answers three questions for every NPC questline:

1. **Where am I?** Each questline shows its steps, with the steps you've done checked and your
   current step highlighted.
2. **What do I do next?** The next step, with where to do it (a grace or map location you can pin).
3. **What am I about to lose?** A missable step whose deadline is coming up (for example, "give
   Roderika the Memento **before** you reach a Liurnia grace"), and questlines that are already
   failed (the NPC is dead or permanently hostile, or the quest ended early).

Without a save loaded, the page works as a static guide: the same step lists, with nothing
checked.

### Reference: the flowcharts

There are two community flowcharts. They are the **narrative and ordering source** for authoring
the steps:

- `tmp/guide-all-npc-quests-v5-shadow-of-the-erdtree-edition-v0-cwlfvdm9e7dg1.png`: base game,
  about 47 NPC columns ("NPC Quests & Endings Guide", u/Saiocomantis, v5 by u/3ceceus)
- `tmp/guide-all-npc-quests-v5-shadow-of-the-erdtree-edition-v0-98t48aw9e7dg1.png`: Shadow of
  the Erdtree, 13 NPC columns, behind the "Accessing the Shadowlands" gate

Both are 15354×8268. `tmp/` is gitignored, and the originals are in `~/Downloads`. They are
**reference only**: we don't ship the images and we don't copy their wording. Step labels are
written in our own words. Their visual language is effectively our schema:

| Flowchart element                                 | Our model                                         |
| ------------------------------------------------- | ------------------------------------------------- |
| One colored column per NPC                        | `QuestLine`                                       |
| Box (parallelogram = player action, rect = event) | `Step` (`kind: 'action' \| 'event'`)              |
| Boss banner                                       | `Step` with `kind: 'boss'` (done = defeat flag)   |
| Blue ↻ "reload area"                              | `Step.reload = true` (shown as a hint)            |
| Dotted "Missable" box + trigger note at the top   | `MissableWindow { steps, closesWhen: Predicate }` |
| Padlock open/closed                               | `Step.requires` (NPC available / unavailable)     |
| Diamond / branch, ending icons                    | `Branch` → mutually exclusive outcomes            |
| Red ✗ "questline ended prematurely"               | `failWhen: Predicate`                             |
| Green ✓ "ENDS X's questline"                      | terminal step                                     |
| Arrows across columns / top banner gates          | `requires` referencing another line or a world gate |

## 2. How the save tells us quest state (findings, verified 2026-11-23)

### `quest_flags_db.py` is a transition log, not a completion predicate

The 2026-06 notes adopted er-save-manager's `quest_flags_db.py` (36 lines) as "each step = an
AND over `{id, value}`". **That doesn't work.** The DB is a record of which flags changed while
someone performed each action, which is how CT spreadsheets are made:

- The same flag appears flipping within a step: Corhyn's step "Choosing 'About the noble
  Goldmask'" lists `1040529256: 0` **and** `1040529256: 1`.
- Later steps undo earlier ones: Corhyn's `11109857` is required `0` in step 1, set to `1`, then
  `0` again ("Talk option disappears"). A save can't satisfy every completed step at the same
  time.
- It includes **volatile** flags that are meaningless in a save file. Roderika's first step is
  `1041382735`, which soulsmods names `揮発フラグ_初期状態_今ロード話しかけた` ("volatile: talked to
  her this load").
- It's missing major lines (Boc, Blaidd, Yura, Edgar, Hewg, Goldmask, …) and all DLC.

**New role:** a **mining aid** that tells us which flags to look at and what the community
thinks they mean. It is not a runtime dataset.

### The real spine: a one-hot event-state enum per NPC

Each questline NPC has a `EFID_Talk_NPCnnn` block (54 in
`dlc-data-sources/elden-ring-eventparam/index.md`). The ids in these blocks are **absolute** flag
ids that `eventFlagOffset()` can read directly; the "relative id" worry in the old notes was
unfounded. Each block has:

- **Status** (`キャラ状態フラグ`), ids `nnn0–nnn4`: alive / hostile (absolvable) / hostile
  (permanent) / dead. This detects failure.
- **Event state** (`イベント状態`), ids `nnn5–nnn19`: one flag per major checkpoint.
- **Talk flags** (`会話用フラグ`, map-local ids like `1041389406`): persistent "this dialogue has
  played" flags. These are the fine-grained steps.
- **Volatile flags** (`揮発フラグ`): reset on load. **Never use these.**

`soulstruct`'s `common.evs.py` shows that **event state is one-hot**: each transition is
`DisableNetworkConnectedFlagRange((3705, 3719))` followed by `EnableNetworkFlag(next)`. Their
**trigger conditions** are also spelled out. Roderika, from `Event_3719`:

```
3705 initial ─(3705 ∧ talk 1041389413 "post-Memento talk played") ∨ 3062 ─▶ 3707 came to Roundtable
3707 ─(11109213 Hewg conversation)──────────────────────────────────────────▶ 3708 Spirit Tuner
any  ─(flag 110 Erdtree burned)─────────────────────────────────────────────▶ 3709
```

So each NPC's **state is a single readable enum, along with the exact conditions that advance
it**. `common.evs.py` has 272 of these range resets. This is the durable backbone. Flowchart
steps map onto it like this:

- **Checkpoint steps** have `done = state ≥ S`. This is monotonic, so it survives earlier flags
  being cleared.
- **Steps between checkpoints** use persistent talk flags, item possession (inventory),
  boss-defeat or grace flags (`vm/events.ts`), or "the item has left your inventory" (for
  example, a Memento that was given away).
- **Steps with no saved trace** (pure dialogue with no flag) are never independently checked.
  They are inferred done when any later step is done, and otherwise shown as guidance.

## 3. Data model

**Built** in `apps/web/src/lib/quests/`: curated TypeScript, same pattern as `lib/boss-meta.ts`,
with one file per questline under `lines/`. Every union is a `Data.taggedEnum`, and code
branches with `$match`/`$is`. Evaluation is pure and synchronous, with no Effect runtime.

| File          | What it holds                                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cond.ts`     | `Cond`: a data AST (`Flag` / `Has` / `Reached` / `Not` / `All` / `Any`), not closures, so it can be evaluated, `explain`ed flag-by-flag in a debug view, and statically checked. Builders `talk`, `pickup`, `boss`, … |
| `gates.ts`    | Shared world-progression `GATES` (Liurnia grace lit, Godrick, Erdtree burned, Maliketh). A gate's label is imperative so it reads both "do X before you …" and "locked: …".                    |
| `model.ts`    | `QuestNode` = `Step` \| `Choice` (exclusive `Path`s, optional `ending`) \| `Detour`; `Lock` = `Gate` \| `Decision` \| `When`; `defineQuest` (stage names are type-checked); `flatten`.       |
| `progress.ts` | `deriveQuests(quests, facts)` → per questline `{ outcome, states, chosen, next, warnings, done/total }`.                                                                                       |
| `facts.ts`    | `SaveFacts` from a parsed slot (flags + goods) or from a flag set (tests, the no-save guide).                                                                                                  |

The rules (the doc comment on `model.ts` is the canonical version):

1. **Evidence, then inference.** `done` is the save evidence for a step. A step with no evidence
   is still inferred done when anything after it in its sequence has evidence. Each `done`
   carries an `evidence` tag (`script` / `observed` / `assumed`) so the shaky ones are easy to find
   and fix.
2. **World progression is never evidence.** Bosses and burning the Erdtree happen whether or not
   you did a questline, so they're `requires` (rendered as a banner before the step), never a
   step's `done`. A test enforces this.
3. **Lockouts are first-class.** Three causes:
   - progressing the world past a step (`Lock.Gate`),
   - a decision: taking a path locks its sibling paths automatically, and `Lock.Decision` locks
     steps in *other* questlines,
   - an ad-hoc condition (`Lock.When`).

   A locked required step locks out the whole questline (`Outcome.LockedOut`, with the step and
   the reason). The steps after it become `Locked: upstream`. A dead or permanently hostile NPC
   locks out the questline unless it was already complete.
4. **Detours** are the flowchart's dotted "missable" boxes: an ordered side-sequence with a
   `reward` and usually a lock. They never block the main line, and evidence never crosses
   between a detour and the main line in either direction. A locked detour only costs its
   reward.
5. **Untracked steps don't hide their follower.** A step with no `done` can never be confirmed
   by the save, so it and the next step both show as next.
6. **Unknown flags are marked, not guessed.** A step whose flag isn't known gets no `done`, plus
   `flagTodo`: the in-game action to record in a
   [save-flag diff](./save-flag-diff-checkpoints.md) to find it. `knownGaps()` (`index.ts`) lists
   every `flagTodo` and every `evidence: 'assumed'` step. That list is the diff tool's work queue.

### Derived per save

- **Step states:** `Done`, `Inferred`, `Available`, `Blocked { needs }`, `Upcoming`,
  `Locked { by: gate | decision | condition | upstream | ending | npc, reason }`, and `Unknown`
  (behind the player's progress and unprovable, e.g. which side of a fork was taken).
- **Outcomes:** `NotStarted`, `InProgress`, `Completed { ending }`, `LockedOut { reason, step }`.
- **Warnings**, raised only while the questline is still open:
  - `Deadline`: do *step* before *gate or decision*, with `stakes: questline | reward`, the
    `gate` id (so the UI can group warnings by trigger), and whether it's actionable `now`.
  - `Decision`: the player is at a fork, with what each option locks, including steps in other
    questlines.
  - `Hostile`: the NPC is hostile but can still be absolved.
- **Still to port:** er-save-manager's `CorruptionDetector`/`FixFlags` rules (the Ranni blocking
  flag `1034500738`, warp-sickness gates), as `Lock.When` or `Deadline` sources.

**Verified on `ER0000.sl2`:** the golden snapshot (`quests.test.ts`) shows plausible states for
all five characters. For example, "shoe" met Roderika and found the Memento but lit a Liurnia
grace first, so the Memento hand-in is `Locked: gate`. A character who has done nothing shows
`NotStarted`, with "Light any Site of Grace in Liurnia" deadlines on the Stormhill detour.

## 4. Authoring workflow (the real cost)

Hand-authoring about 60 lines from a picture is the bulk of the work, so we build a workbench
first:

**`scripts/quest-workbench` (dev-only, not shipped)**: for a given NPC it prints one sheet
joining:

1. its soulsmods `EFID_Talk_NPCnnn` block, with machine-translated names and flags categorized
   as status / state / talk / volatile (volatile ones struck out),
2. the state-transition conditions pulled from `common.evs.py` (grep the `flag_range=` reset for
   that block),
3. the `quest_flags_db.py` rows that mention any of those flags, as community descriptions,
4. optionally, those flags' current values in a given `.sl2` slot.

An author (us, with Claude) reads the flowchart column alongside the sheet and writes
`lines/<npc>.ts`. The NPC ↔ talk-block mapping comes out of this too, since the shared ids in
`quest_flags_db.py` name the NPC.

**Step detail comes from the wikis.** The flowchart gives the high-level order and the forks. The
wikis (Fextralife and Fandom NPC quest pages) supply the detail: exact dialogue triggers,
conditions, item and reward names, and missable notes. We write steps in our own words. Flag ids
come only from the game-script sources above. Wikis are not used for map positions; `where` uses
grace flag ids and extractor data (see the no-scraped-coords rule).

**Verification**

- Unit tests against `packages/save-parser/test/fixtures/ER0000.sl2`. It has multiple slots, so
  we can assert the outcome for each line in each slot. These act as golden snapshots.
- Your live save (`%APPDATA%/EldenRing/…`) for spot checks. The
  [save-flag-diff checkpoints](./save-flag-diff-checkpoints.md) tool, if built, is the way to
  confirm unclear steps.
- An invariant test over all lines: every flag id resolves through `eventFlagOffset()`, no
  volatile flag is used in a `Pred`, and state ids fall inside their block's range.

## 5. UI

**As built (2026-11-24),** after user review, the page is simpler and calmer than the plan below:
- "Up next" instead of "Act now", with no alarm styling.
- A checklist-style detail view.
- **No internal ids anywhere:** flag numbers, step ids and evidence labels never reach players.
- Locked steps say *what was lost* ("Missed: … The questline continues.").
- Wiki links per questline (`lib/quests/wiki.ts`, HEAD-checked by `scripts/wiki-link-check.ts`).
- An **Endings** row (`lib/quests/endings.ts`): each of the six endings is Secured / In progress /
  Not started / Locked out, or Overridden by an uncured Frenzied Flame (flags 108 / 116).
- **Rewards** (`Step.rewards` = exact catalog item names, `Step.unlocks` = services, shops and
  endings; `lib/quests/rewards.ts`) as a per-questline summary and per-step chips.

Original plan, kept for reference:

- **Top: "Act now" feed.** This is the headline value. It shows `Deadline` warnings grouped by
  trigger ("Before you light a grace in Liurnia: …", with questline-ending stakes above
  reward-only ones), then pending `Decision`s spelled out ("choosing X locks Y and Z in Ranni's
  questline"), then the next step of each in-progress line.
- **Lockouts are always explicit.** A locked step shows its cause: "Locked: you lit a grace in
  Liurnia" or "Locked: you chose …". A locked-out questline shows the step that killed it and
  why, never just a red X.
- **Left: questline list.** NPC portrait or initial, a status chip (not started / in progress /
  at risk / done / failed / missed), and step progress (`4/11`). Filters by outcome. Respects the
  existing Base/DLC/All scope (`lib/dlc-scope.ts`).
- **Right: line detail.** A vertical timeline mirroring the flowchart column: checked steps, a
  highlighted current step, missable windows drawn as a bracket with their "closes when" text,
  branch choices, boss steps linked to the Bosses page, and a "pin on map" button for `where`.
- **Without a save:** the same layout as a pure guide, with every line expanded and no status.

Map integration (pinning the next step) reuses the existing pin store. It's cheap once `where`
uses grace flags, since graces already have pixels.

## 6. Phases

| #  | Deliverable                                                                                                                                                                                                                                                               | Done when                                                                         |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 0  | ✅ `lib/quests/` model + `Cond` evaluator + derivation, 12 synthetic-rule tests + invariant tests + a fixture golden snapshot. ⏳ The workbench script is not built yet.                                                                                                     | Evaluator tests are green, and the workbench prints a correct Roderika sheet.    |
| 1  | **Pilot three lines**: ✅ Roderika & Hewg (detours, a gate lock, untracked steps). Next: Ranni (long, branchy, ending, the blocking-flag warning), Millicent or Sellen (branch with a fail path). Golden tests on `ER0000.sl2` slots.                                         | Outcomes for all fixture slots match a manual reading of the save.               |
| 2  | **UI v1**: list + detail + "Act now" feed for the pilot lines, plus the static-guide mode.                                                                                                                                                                              | Usable end to end with a real save.                                               |
| 3  | **Breadth, base game**: the remaining ~44 flowchart columns, the most missable first (Boc, Alexander, Fia/D, Nepheli/Kenneth, Irina/Edgar, Rogier, Volcano Manor/Tanith, Hyetta, Gowry/Millicent, Dung Eater, Seluvis, Jar-Bairn, …). World gates as shared predicates. | Every base-game column has a line, and the invariant test passes.                 |
| 4  | **DLC**: the 13 Shadowlands lines (DLC flowchart). Their talk blocks are in the 2000xxxx/DLC ranges, so the workbench needs the DLC soulstruct maps.                                                                                                                       | DLC scope shows those lines.                                                      |
| 5  | **Map pins + polish**: pin the next step, deep links from the Bosses/Graces pages ("this boss advances 3 questlines").                                                                                                                                                  |                                                                                   |
| 6  | _(Optional, durable)_ An **extractor stage** that pulls the state-transition graph straight from `common.emevd` using the existing EMEDF decoder, so state ids and trigger conditions are install-derived. Curated steps stay curated.                                       | Curated `states` match the extracted ones in a test.                              |

**Status of the phases (2026-11-24):**
- **Phases 0–4 are done.** That covers the model, all 49 questlines (authored in parallel by
  subagents, one batch per story cluster), the UI and DLC. The workbench script was skipped;
  authors used grep recipes instead.
- **Phase 5 (map pins) is open.**
- **Phase 6 is still optional.**

**Follow-ups found while authoring:**
- **The extractor misses lot-level item pickup flags.** `game/item-lots.ts` misses ItemLotParam's
  lot-level `getItemFlagId` and only reads the per-slot `getItemFlagId0N`. Emitting it would give
  exact pickup evidence for many reward steps.
- **No DLC talk-script decompiles.** Without them, most DLC conversation steps are `flagTodo`.
  Extracting ESD talk scripts would close most of those gaps.
- **Gesture flags (60xxx) carry over into NG+.** They are never valid as sole evidence.
- **NPC block numbers in the soulsmods index don't match the NPCs** (e.g. the "Yura" block is Fia).
  Status bases were confirmed per NPC from the `common.evs.py` stage machines.

## 7. Open decisions

1. **v1 scope.** Recommend: Phases 0–2 with the three pilot lines, then fill in breadth one line
   at a time. The alternative is to author every base-game line before any UI ships.
2. **Granularity.** Mirror the flowchart's steps (about 10–25 per line, including untracked
   guidance steps), or only show flag-backed checkpoints? Recommend mirroring the flowchart with
   inferred steps. It matches what players expect and still gives a correct "next".
3. **Branches/endings.** Show all branches, or pick the path (for example, the Ranni vs Fia vs
   Goldmask endings are exclusive)? Recommend showing all branches, and auto-detecting the chosen
   one once its first flag is set.
4. **Where the curated data lives.** `apps/web/src/lib/quests/` (like `boss-meta.ts`) or
   `packages/data` (shared with the extractor for Phase 6)? Recommend `apps/web` now and moving it
   if Phase 6 happens.

## Resources

- Flowcharts: `tmp/guide-all-npc-quests-v5-*.png` (see §1).
- Talk-flag dictionary (JP names, absolute ids):
  `docs/cloned-repos-as-docs/dlc-data-sources/elden-ring-eventparam/index.md`, the `EFID_Talk_*` blocks.
- State-machine transitions:
  `docs/cloned-repos-as-docs/dlc-data-sources/soulstruct/src/soulstruct/eldenring/events/vanilla/common.evs.py`
  (e.g. `Event_3719`, Roderika); per-map `m*.evs.py` for spawn and branch logic.
- Community flag log (mining aid only):
  `docs/cloned-repos-as-docs/er-save-manager/src/er_save_manager/data/quest_flags_db.py`.
  Softlock rules: `parser/event_flags.py` (`CorruptionDetector`/`FixFlags`).
- Runtime flag read: `isEventFlagOn(slot, flagId)` in `apps/web/src/lib/vm/events.ts`
  (via `eventFlagOffset` from `@elden-ring-compass/data`). Item possession: `vm/inventory.ts`.
