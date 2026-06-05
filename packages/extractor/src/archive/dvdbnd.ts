// Effect-native dvdbnd unpacker. File IO goes through effect `FileSystem`/`Path`
// services (directory setup, per-file existence checks, mkdir) — the per-`yield*`
// overhead is nanoseconds against real syscalls, so being on the Effect runtime
// costs nothing measurable for this IO-bound loop. The one thing that stays on
// Bun is the *ranged* read of the multi-GB `.bdt` slab (`Bun.file(bdt).slice(...)`)
// — effect `FileSystem` has no ranged-read API and loading the whole file would be
// the real regression — wrapped in `Effect.promise`. `Bun.write` is likewise kept
// (not a lint concern; `node:fs`/`node:path` are).
import { Data, Effect, FileSystem, Path } from 'effect';

import {
  ER_ARCHIVE_KEYS,
  ER_GAME_INFO,
  erDictionaryUrl,
  SD_ARCHIVES,
} from '@elden-ring-compass/vendored-data';

import { decryptBhdHeader } from '../crypto/rsa.ts';
import { decryptAesRanges, parseBhd5 } from '../formats/bhd5.ts';
import { erPathHash } from '../formats/path-hash.ts';

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
}

/** Raised when an encrypted archive has no known decryption key. */
export class DvdbndError extends Data.TaggedError('DvdbndError')<{
  readonly detail: string;
}> {}

// Cheap magic→extension guess for files whose hash isn't in the dictionary.
// (UXM recurses through DCX/BND here; we only need the dictionary-known files,
// so the unidentified remainder gets a best-effort extension.)
function guessExtension(b: Uint8Array): string {
  const a = (o: number, n: number) =>
    new TextDecoder('latin1').decode(b.subarray(o, o + n));
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
const loadDictionary = Effect.gen(function* () {
  if (dictionaryCache) return dictionaryCache;
  const text = yield* Effect.promise(() => Bun.file(erDictionaryUrl).text());
  const map = new Map<bigint, string>();
  for (const line of text.split(/[\r\n]+/)) {
    if (line.startsWith('#')) continue;
    const trimmed = line.trim();
    if (trimmed.length > 0) map.set(erPathHash(trimmed), trimmed);
  }
  dictionaryCache = map;
  return map;
});

/** `--clean`: restore backed-up dirs and remove previously-unpacked dirs. */
const cleanInstall = (gameRoot: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    for (const dir of ER_GAME_INFO.backupDirs) {
      const backup = `${gameRoot}/_backup/${dir}`;
      if (yield* fs.exists(backup)) {
        yield* fs.remove(`${gameRoot}/${dir}`, {
          recursive: true,
          force: true,
        });
        yield* fs.rename(backup, `${gameRoot}/${dir}`);
        yield* Effect.logInfo(`  restored ${dir}/ from _backup/`);
      }
    }
    yield* fs.remove(`${gameRoot}/_backup`, { recursive: true, force: true });
    let removed = 0;
    for (const dir of ER_GAME_INFO.deleteDirs) {
      const target = `${gameRoot}/${dir}`;
      if (yield* fs.exists(target)) {
        yield* fs.remove(target, { recursive: true, force: true });
        removed++;
      }
    }
    yield* Effect.logInfo(
      `  --clean: removed ${removed} previously-unpacked dir(s)`,
    );
  });

/** Copy `backupDirs` to `_backup/` once, before unpacking into them. */
const backupDirs = (gameRoot: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    for (const dir of ER_GAME_INFO.backupDirs) {
      const src = `${gameRoot}/${dir}`;
      const dst = `${gameRoot}/_backup/${dir}`;
      if ((yield* fs.exists(src)) && !(yield* fs.exists(dst))) {
        yield* fs.copy(src, dst);
        yield* Effect.logInfo(`  backed up ${dir}/ → _backup/`);
      }
    }
  });

const unpackArchive = (
  gameRoot: string,
  archive: string,
  dictionary: Map<bigint, string>,
  mkdirCache: Set<string>,
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const bhdPath = `${gameRoot}/${archive}.bhd`;
    const bdtPath = `${gameRoot}/${archive}.bdt`;
    if (!((yield* fs.exists(bhdPath)) && (yield* fs.exists(bdtPath)))) {
      yield* Effect.logInfo(`${archive}: not present (skipped)`);
      return {
        archive,
        present: false,
        total: 0,
        extracted: 0,
        skipped: 0,
        unknown: 0,
      } satisfies ArchiveSummary;
    }

    const raw = new Uint8Array(
      yield* Effect.promise(() => Bun.file(bhdPath).arrayBuffer()),
    );
    const isPlain = new TextDecoder().decode(raw.subarray(0, 4)) === 'BHD5';
    let header: Uint8Array;
    if (isPlain) {
      header = raw;
    } else {
      const key = ER_ARCHIVE_KEYS[archive];
      if (key === undefined)
        return yield* new DvdbndError({
          detail: `no archive key for "${archive}"`,
        });
      header = decryptBhdHeader(raw, key);
    }
    const entries = parseBhd5(header);

    const isSd = SD_ARCHIVES.has(archive);
    const [archiveBase = archive] = archive.split('/');
    const bdt = Bun.file(bdtPath);

    let extracted = 0;
    let skipped = 0;
    let unknown = 0;

    for (const entry of entries) {
      const known = dictionary.get(entry.hash);
      let target: string;
      if (known !== undefined) {
        target = `${gameRoot}${isSd ? '/sd' : ''}${known}`;
        if (yield* fs.exists(target)) {
          skipped++;
          continue;
        }
      } else {
        // Unknown hash: defer naming until we've read + sniffed the bytes.
        target = '';
      }

      let bytes = new Uint8Array(
        yield* Effect.promise(() =>
          bdt
            .slice(entry.offset, entry.offset + entry.paddedSize)
            .arrayBuffer(),
        ),
      );
      if (entry.aes) decryptAesRanges(bytes, entry.aes);
      // sd files keep their padding in the slab; trim to the real size (UXM parity).
      if (
        isSd &&
        entry.unpaddedSize >= 0 &&
        bytes.length > entry.unpaddedSize
      ) {
        bytes = bytes.subarray(0, entry.unpaddedSize);
      }

      if (known === undefined) {
        const name = `${archiveBase}_${entry.hash.toString().padStart(10, '0')}`;
        target = `${gameRoot}/_unknown/${name}${guessExtension(bytes)}`;
        if (yield* fs.exists(target)) {
          skipped++;
          continue;
        }
        unknown++;
      } else {
        extracted++;
      }

      const dir = path.dirname(target);
      if (!mkdirCache.has(dir)) {
        yield* fs.makeDirectory(dir, { recursive: true });
        mkdirCache.add(dir);
      }
      yield* Effect.promise(() => Bun.write(target, bytes));
    }

    const total = entries.length;
    if (extracted === 0 && unknown === 0) {
      yield* Effect.logInfo(
        `${archive}: all ${total} files already present (use --clean to re-extract)`,
      );
    } else {
      yield* Effect.logInfo(
        `${archive}: extracted ${extracted}, skipped ${skipped} already-present` +
          `${unknown ? `, ${unknown} unknown` : ''} (${total} total)`,
      );
    }
    return {
      archive,
      present: true,
      total,
      extracted,
      skipped,
      unknown,
    } satisfies ArchiveSummary;
  });

/**
 * Unpack the Elden Ring dvdbnd archives into the game dir, mirroring UXM's
 * Selective Unpacker: per-file "skip if already extracted" idempotency, with
 * `--clean` performing UXM's Restore (un-backup + delete unpacked dirs) first.
 */
export const unpackInstall = (opts: UnpackOptions) =>
  Effect.gen(function* () {
    const { gameRoot, clean } = opts;
    const dictionary = yield* loadDictionary;

    if (clean) yield* cleanInstall(gameRoot);
    yield* backupDirs(gameRoot);

    const mkdirCache = new Set<string>();
    const archives: ArchiveSummary[] = [];
    for (const archive of ER_GAME_INFO.archives) {
      archives.push(
        yield* unpackArchive(gameRoot, archive, dictionary, mkdirCache),
      );
    }

    const sum = (k: keyof ArchiveSummary) =>
      archives.reduce((n, a) => n + (a[k] as number), 0);
    return {
      cleaned: clean,
      archives,
      extracted: sum('extracted'),
      skipped: sum('skipped'),
      unknown: sum('unknown'),
    } satisfies UnpackSummary;
  });
