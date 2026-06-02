/**
 * Elden Ring dvdbnd layout, vendored from UXM's `res/EldenRingGameInfo.xml`.
 *
 * - `archives`   — the split archives to unpack, in order. `.bhd`/`.bdt` pairs
 *                  live directly in the game (Game/) dir; `sd/*` are nested.
 * - `backupDirs` — real install dirs we copy to `_backup/` before unpacking
 *                  into them (so `--clean` can restore the originals).
 * - `deleteDirs` — dirs the unpack CREATES; `--clean` removes these to force a
 *                  fresh re-extract (e.g. after a game patch).
 */
export const ER_GAME_INFO = {
  archives: ['Data0', 'Data1', 'Data2', 'Data3', 'DLC', 'sd/sd', 'sd/sd_dlc02'],
  backupDirs: ['sd'],
  deleteDirs: [
    '_unknown',
    'asset',
    'action',
    'chr',
    'cutscene',
    'event',
    'expression',
    'facegen',
    'font',
    'map',
    'material',
    'mtd',
    'menu',
    'msg',
    'other',
    'param',
    'parts',
    'script',
    'sound',
    'sfx',
    'shader',
  ],
} as const;

/** The two archives whose extracted paths are prefixed with `/sd` (UXM parity). */
export const SD_ARCHIVES = new Set(['sd/sd', 'sd/sd_dlc02']);
