import { cp, mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

import { decryptBhdHeader } from '../crypto/rsa.ts';
import { decryptAesRanges, parseBhd5 } from '../formats/bhd5.ts';
import { erPathHash } from '../formats/path-hash.ts';
import { ER_ARCHIVE_KEYS } from '../vendor/er-archive-keys.ts';
import { ER_GAME_INFO, SD_ARCHIVES } from '../vendor/er-game-info.ts';

export interface ArchiveSummary {
  readonly archive: string;
  readonly present: boolean;
  readonly total: number;
  readonly extracted: number;
  readonly skipped: number; // already present on disk
  readonly unknown: number; // hash not in dictionary
}

export interface UnpackSummary {
  readonly cleaned: boolean;
  readonly archives: ArchiveSummary[];
  readonly extracted: number;
  readonly skipped: number;
  readonly unknown: number;
}

export interface UnpackOptions {
  /** The `…/ELDEN RING/Game` dir — where the `.bhd`/`.bdt` archives live and
   *  where loose files are written (UXM parity: unpack target == game dir). */
  readonly gameRoot: string;
  /** Restore backups + delete previously-unpacked dirs, then re-extract. */
  readonly clean: boolean;
  /** Progress/summary sink. */
  readonly log: (msg: string) => void;
}

const pathExists = (p: string) =>
  stat(p).then(
    () => true,
    () => false,
  );

// Cheap magic→extension guess for files whose hash isn't in the dictionary.
// (UXM recurses through DCX/BND here; we only need the dictionary-known files,
// so the unidentified remainder gets a best-effort extension.)
function guessExtension(b: Uint8Array): string {
  const a = (o: number, n: number) => new TextDecoder('latin1').decode(b.subarray(o, o + n));
  if (b.length >= 4 && a(0, 4) === 'DCX\0') return '.dcx';
  if (b.length >= 3 && a(0, 3) === 'GFX') return '.gfx';
  if (b.length >= 4 && a(0, 4) === 'FSB5') return '.fsb';
  if (b.length >= 4 && a(0, 4) === 'DDS ') return '.dds';
  if (b.length >= 4 && a(0, 4) === '#BOM') return '.txt';
  if (b.length >= 4 && a(0, 4) === 'BND4') return '.bnd';
  if (b.length >= 4 && a(0, 4) === 'BHF4') return '.bhd';
  if (b.length >= 4 && a(0, 4) === 'BDF4') return '.bdt';
  if (b.length >= 4 && a(0, 4) === 'RIFF') return '.wem';
  if (b.length >= 4 && a(0, 4) === 'BKHD') return '.bnk';
  if (b.length >= 4 && a(0, 4) === 'ENFL') return '.entryfilelist';
  return '.unk';
}

let dictionaryCache: Map<bigint, string> | null = null;
async function loadDictionary(): Promise<Map<bigint, string>> {
  if (dictionaryCache) return dictionaryCache;
  const text = await Bun.file(
    new URL('../vendor/er-dictionary.txt', import.meta.url),
  ).text();
  const map = new Map<bigint, string>();
  for (const line of text.split(/[\r\n]+/)) {
    if (line.startsWith('#')) continue;
    const trimmed = line.trim();
    if (trimmed.length > 0) map.set(erPathHash(trimmed), trimmed);
  }
  dictionaryCache = map;
  return map;
}

/** `--clean`: restore backed-up dirs and remove previously-unpacked dirs. */
async function cleanInstall(gameRoot: string, log: (m: string) => void): Promise<void> {
  for (const dir of ER_GAME_INFO.backupDirs) {
    const backup = `${gameRoot}/_backup/${dir}`;
    if (await pathExists(backup)) {
      await rm(`${gameRoot}/${dir}`, { recursive: true, force: true });
      await rename(backup, `${gameRoot}/${dir}`);
      log(`  restored ${dir}/ from _backup/`);
    }
  }
  await rm(`${gameRoot}/_backup`, { recursive: true, force: true });
  let removed = 0;
  for (const dir of ER_GAME_INFO.deleteDirs) {
    const target = `${gameRoot}/${dir}`;
    if (await pathExists(target)) {
      await rm(target, { recursive: true, force: true });
      removed++;
    }
  }
  log(`  --clean: removed ${removed} previously-unpacked dir(s)`);
}

/** Copy `backupDirs` to `_backup/` once, before unpacking into them. */
async function backupDirs(gameRoot: string, log: (m: string) => void): Promise<void> {
  for (const dir of ER_GAME_INFO.backupDirs) {
    const src = `${gameRoot}/${dir}`;
    const dst = `${gameRoot}/_backup/${dir}`;
    if ((await pathExists(src)) && !(await pathExists(dst))) {
      await cp(src, dst, { recursive: true });
      log(`  backed up ${dir}/ → _backup/`);
    }
  }
}

async function unpackArchive(
  gameRoot: string,
  archive: string,
  dictionary: Map<bigint, string>,
  mkdirCache: Set<string>,
  log: (m: string) => void,
): Promise<ArchiveSummary> {
  const bhdPath = `${gameRoot}/${archive}.bhd`;
  const bdtPath = `${gameRoot}/${archive}.bdt`;
  if (!((await pathExists(bhdPath)) && (await pathExists(bdtPath)))) {
    log(`${archive}: not present (skipped)`);
    return { archive, present: false, total: 0, extracted: 0, skipped: 0, unknown: 0 };
  }

  const raw = new Uint8Array(await Bun.file(bhdPath).arrayBuffer());
  const isPlain = new TextDecoder().decode(raw.subarray(0, 4)) === 'BHD5';
  const header = isPlain ? raw : decryptBhdHeader(raw, ER_ARCHIVE_KEYS[archive]!);
  const entries = parseBhd5(header);

  const isSd = SD_ARCHIVES.has(archive);
  const archiveBase = archive.split('/')[0]!;
  const bdt = Bun.file(bdtPath);

  let extracted = 0;
  let skipped = 0;
  let unknown = 0;

  for (const entry of entries) {
    const known = dictionary.get(entry.hash);
    let target: string;
    if (known !== undefined) {
      target = `${gameRoot}${isSd ? '/sd' : ''}${known}`;
      if (await pathExists(target)) {
        skipped++;
        continue;
      }
    } else {
      // Unknown hash: defer naming until we've read + sniffed the bytes.
      target = '';
    }

    let bytes = new Uint8Array(
      await bdt.slice(entry.offset, entry.offset + entry.paddedSize).arrayBuffer(),
    );
    if (entry.aes) decryptAesRanges(bytes, entry.aes);
    // sd files keep their padding in the slab; trim to the real size (UXM parity).
    if (isSd && entry.unpaddedSize >= 0 && bytes.length > entry.unpaddedSize) {
      bytes = bytes.subarray(0, entry.unpaddedSize);
    }

    if (known === undefined) {
      const name = `${archiveBase}_${entry.hash.toString().padStart(10, '0')}`;
      target = `${gameRoot}/_unknown/${name}${guessExtension(bytes)}`;
      if (await pathExists(target)) {
        skipped++;
        continue;
      }
      unknown++;
    } else {
      extracted++;
    }

    const dir = dirname(target);
    if (!mkdirCache.has(dir)) {
      await mkdir(dir, { recursive: true });
      mkdirCache.add(dir);
    }
    await Bun.write(target, bytes);
  }

  const total = entries.length;
  if (extracted === 0 && unknown === 0) {
    log(`${archive}: all ${total} files already present (use --clean to re-extract)`);
  } else {
    log(
      `${archive}: extracted ${extracted}, skipped ${skipped} already-present` +
        `${unknown ? `, ${unknown} unknown` : ''} (${total} total)`,
    );
  }
  return { archive, present: true, total, extracted, skipped, unknown };
}

/**
 * Unpack the Elden Ring dvdbnd archives into the game dir, mirroring UXM's
 * Selective Unpacker: per-file "skip if already extracted" idempotency, with
 * `--clean` performing UXM's Restore (un-backup + delete unpacked dirs) first.
 */
export async function unpackInstall(opts: UnpackOptions): Promise<UnpackSummary> {
  const { gameRoot, clean, log } = opts;
  const dictionary = await loadDictionary();

  if (clean) await cleanInstall(gameRoot, log);
  await backupDirs(gameRoot, log);

  const mkdirCache = new Set<string>();
  const archives: ArchiveSummary[] = [];
  for (const archive of ER_GAME_INFO.archives) {
    archives.push(await unpackArchive(gameRoot, archive, dictionary, mkdirCache, log));
  }

  const sum = (k: keyof ArchiveSummary) =>
    archives.reduce((n, a) => n + (a[k] as number), 0);
  return {
    cleaned: clean,
    archives,
    extracted: sum('extracted'),
    skipped: sum('skipped'),
    unknown: sum('unknown'),
  };
}
