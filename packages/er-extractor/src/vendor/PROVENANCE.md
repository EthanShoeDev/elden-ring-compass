# Vendored data — provenance & patch-update guide

Everything in this directory is **baked/reverse-engineered data that the extractor
cannot derive from the game install** (plan: `docs/projects/dlc-support.md` §7
"Dependency robustness"). It's vendored verbatim from upstream tools and pinned here
so the extractor is self-contained and reproducible.

This file exists so that **after an Elden Ring patch** you know exactly what might go
stale, what the symptom is, and how to refresh it. Most of this is stable across
*content* patches; only a *save-format* or *param-schema* revision forces updates.

> Note: the runtime **save parser** (`packages/er-save-lib`, our ER-Save-Lib fork →
> WASM) carries its *own* copies of the save-format constants (event-flag table, AES
> key, struct offsets). The files here are the **extractor's** copies, used at build
> time to emit `@elden-ring-compass/data`. They come from the same upstreams, so they
> update together.

| File | What it is | Upstream source | Goes stale when… | Symptom | Refresh |
| --- | --- | --- | --- | --- | --- |
| **`eventflag-bst.txt`** | Event-flag `block → byte-offset multiplier` table (11,919 rows). Drives `eventFlagOffset(id) → [byte,bit]` into the save's event-flag bitfield. | **ER-Save-Lib** `src/res/eventflag_bst.txt` | The **save event-flag layout** is revised (major patch / DLC reshuffling flag blocks). Content patches that only add new flag *ids* keep working. | Grace/boss/quest flags read from the wrong bit → wrong "discovered/defeated" state. | Re-copy from ER-Save-Lib upstream; **or** re-derive empirically via save-diffing (`docs/projects/save-flag-diff-checkpoints.md`). Verify with the 1178-id diff vs the legacy `apps/web/.../EVENT_FLAGS.ts`. |
| **`er-regulation-key.ts`** | AES-256-CBC key for decrypting `regulation.bin`. | **ER-Save-Lib** `src/regulation/regulation.rs` | FromSoft rotates the regulation key (very rare). | `params` stage fails to decrypt `regulation.bin`. | Re-copy the key from ER-Save-Lib. |
| **`er-archive-keys.ts`** | Per-archive **RSA public keys** for the encrypted BHD5 dvdbnd headers (`Data0-3`, `DLC`, `sd/*`). | **UXM-Selective-Unpack** `UXM/ArchiveKeys.cs` (`EldenRingKeys`) | A patch changes archive encryption keys (rare). | `unpack` stage can't RSA-decrypt a `.bhd`. | Regenerate from the UXM clone (`spike/gen-keys.ts`). |
| **`er-dictionary.txt`** | Known file-path list (9 MB) whose hashes are matched to recover real filenames during dvdbnd unpack. | **UXM-Selective-Unpack** `EldenRingDictionary.txt` | A patch **adds new game files** not yet in the dictionary. (Coverage, not correctness — does not break the format.) | New files unpack only as hash-named blobs / are silently missed. | Re-copy from UXM once they add the new paths. |
| **`er-game-info.ts`** | dvdbnd layout: which split archives to unpack + backup/clean dirs. | **UXM-Selective-Unpack** `res/EldenRingGameInfo.xml` | FromSoft adds a **new archive** (e.g. a future DLC `Data4`/`sd_dlcNN`). | New archive isn't unpacked. | Add the archive name (re-copy from UXM). |
| **`paramdex/ER/Defs/*.xml`** (194) | PARAMDEF **field schemas** — names/types/offsets for `regulation.bin` params (not shipped in-game). | **soulsmods/Paramdex** (pinned commit; see `paramdex/PROVENANCE.md`) | A patch **adds/moves param fields** (every regulation bump). | `decodeRow` reads wrong fields → garbage stats; the `join` stage logs a **DataVersion drift warning**. | `bun run update-paramdex` (re-pins to the latest soulsmods commit). |

## Not vendored (auto-current with the install)

- **Oodle** (`oo2core_6_win64.dll`) — loaded from the game dir via `bun:ffi`, so it
  always matches the installed game. Decompresses `DCX_KRAK` game files.
- **FMG text, PARAM rows, TPF textures, MSB/EMEVD** — all read live from the unpacked
  install, so names/stats/markers/flags refresh automatically when you re-run
  `bun run extract` against a patched install. (Their *parsers* are our own code in
  `src/formats/`; the *content* is the install's.)

## TL;DR after a patch

1. **Always:** `bun run extract` re-reads the install → names/stats/markers/icons/graces
   auto-update.
2. **Watch for** the `DataVersion drift` warning → `bun run update-paramdex`.
3. **Only on a save-format change** (rare, signalled by the save parser misreading
   flags): refresh `eventflag-bst.txt` (+ the save parser's offsets) from ER-Save-Lib,
   or re-derive by save-diffing.
4. **Only on new archives/files:** refresh `er-game-info.ts` / `er-dictionary.txt` from UXM.
