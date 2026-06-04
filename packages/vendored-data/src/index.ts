/**
 * `@elden-ring-compass/vendored-data` — verbatim external constants we cannot
 * derive from the installed game ourselves (event-flag BST, AES/RSA keys, the
 * Paramdex PARAMDEFs, the EMEDF opcode dictionary, the dvdbnd path dictionary &
 * layout). When the game patches, these are updated by *external* maintainers and
 * we re-copy them — that provenance is what earns them their own package. See
 * `README.md` for the source, license, and refresh procedure of every entry.
 *
 * BUILD-TIME ONLY. The only consumer is `@elden-ring-compass/extractor`, which
 * joins these against the installed game and bakes whatever the runtime needs into
 * `@elden-ring-compass/data` (the sole runtime data source). Nothing here — least
 * of all the 9 MB path dictionary or the 194 Paramdex XMLs — should ever reach the
 * web bundle. Do not import this package from `apps/web` or the save parser.
 */

// --- Baked TS constants (small; imported directly by the extractor) ---
export { ER_ARCHIVE_KEYS } from './er-archive-keys.ts';
export { ER_GAME_INFO, SD_ARCHIVES } from './er-game-info.ts';
export { ER_REGULATION_KEY } from './er-regulation-key.ts';

// --- Asset file URLs (resolve to a path via effect `Path.fromFileUrl`, or pass
//     straight to `Bun.file`). These point at large vendored data files under
//     `assets/`; consumers stream them, they are never bundled. ---

/** dvdbnd file-path → hash dictionary (`er-dictionary.txt`, ~9 MB). */
export const erDictionaryUrl = new URL(
  '../assets/er-dictionary.txt',
  import.meta.url,
);

/** Event-flag block→multiplier addressing table (`eventflag-bst.txt`). */
export const eventFlagBstUrl = new URL(
  '../assets/eventflag-bst.txt',
  import.meta.url,
);

/** Soulstruct EMEDF instruction dictionary (`er-common.emedf.json`, ~415 KB). */
export const erCommonEmedfUrl = new URL(
  '../assets/er-common.emedf.json',
  import.meta.url,
);

/**
 * Directory holding the Paramdex PARAMDEF XMLs. Resolve a single def with
 * `new URL(`${defName}.xml`, paramdexDefsUrl)` (note the trailing slash).
 */
export const paramdexDefsUrl = new URL(
  '../assets/paramdex/ER/Defs/',
  import.meta.url,
);
