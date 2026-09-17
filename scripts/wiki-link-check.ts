#!/usr/bin/env bun
/**
 * Validates every Fextralife wiki URL the inventory tables (and map popups) can
 * link to, so broken links are caught here instead of on the website. Enumerates
 * the same `CATALOG` grouping the tables render, applies the same name → URL rule
 * as the wiki column (armaments link their `baseName`), and HEAD-requests each
 * unique URL. Link-only by design — we never fetch page content, just status.
 *
 * Runs as part of `turbo run lint` (`//#wiki:check`), so verified-200 URLs are
 * cached in `node_modules/.cache/wiki-link-check/results.json` and skipped on
 * later runs — only never-seen URLs (new data / changed URL rules, which change
 * the cache key) plus the `--revalidate` oldest cached entries hit the network.
 * Network-level failures warn but don't fail the gate (lint stays usable
 * offline); an HTTP non-200 from the reachable wiki fails it.
 *
 * Usage: bun scripts/wiki-link-check.ts
 *          [--concurrency N] [--table <type>] [--no-cache] [--revalidate N]
 */
import { BunRuntime, BunServices } from '@effect/platform-bun';
import {
  Config,
  Console,
  Data,
  Duration,
  Effect,
  FileSystem,
  Option,
  Path,
  Schedule,
  Schema,
} from 'effect';
import { FetchHttpClient, HttpClient } from 'effect/unstable/http';
import { Command, Flag } from 'effect/unstable/cli';

import { BOSSES } from '@elden-ring-compass/data';

import { CATALOG } from '../apps/web/src/lib/inventory-catalog-data';
import {
  wikiNameForBoss,
  wikiNameForItem,
  wikiPageUrl,
} from '../apps/web/src/lib/wiki';

const COMMAND_NAME = 'wiki-link-check';

class BrokenLinksError extends Data.TaggedError('BrokenLinksError')<{
  message: string;
}> {}

/**
 * Everything the UI links: the inventory tables, plus the bosses table / map
 * boss popups (pre-resolved through `wikiNameForBoss`, same as the UI).
 * Regions and graces deliberately are NOT here — their names are micro-locations
 * ("Rampart Tower", "The First Step") that mostly have no wiki page (118/~250
 * region names 404'd when probed), so those tables render no wiki column.
 */
const SOURCES: Record<
  string,
  ReadonlyArray<{ name: string; baseName?: string; category?: string }>
> = {
  ...CATALOG,
  bosses: BOSSES.flatMap((b) =>
    b.name === null ? [] : [{ name: wikiNameForBoss(b.name) }],
  ),
};

interface LinkCheck {
  name: string;
  url: string;
  tables: string[];
}

/** Unique link targets across all sources, remembering which tables use each. */
const collectLinks = (only?: string): LinkCheck[] => {
  const byUrl = new Map<string, LinkCheck>();
  for (const [table, rows] of Object.entries(SOURCES)) {
    if (only && table !== only) continue;
    for (const row of rows) {
      // Same placeholder filter as the tables' join() — never rendered as rows.
      if (row.name.startsWith('[ERROR]')) continue;
      // Same resolution as the wiki column / map popup; null = renders no link.
      const name = wikiNameForItem(row);
      if (name === null) continue;
      const url = wikiPageUrl(name);
      const existing = byUrl.get(url);
      if (existing) {
        if (!existing.tables.includes(table)) existing.tables.push(table);
      } else {
        byUrl.set(url, { name, url, tables: [table] });
      }
    }
  }
  return [...byUrl.values()];
};

interface Failure extends LinkCheck {
  status: number | 'error';
}

// --- result cache -----------------------------------------------------------
// Verified-200 URLs, persisted across runs so lint doesn't re-hammer the wiki.
// Keyed by the final URL: changing the name→URL rules in `wiki.ts` changes the
// keys, which re-checks exactly the affected links. Only successes are stored —
// a 404 stays uncached so it's re-checked (and keeps failing) until fixed.

const CACHE_VERSION = 1;

const CacheEntrySchema = Schema.Struct({
  status: Schema.Number,
  checkedAt: Schema.String,
});
type CacheEntry = typeof CacheEntrySchema.Type;

// JSON string ⇄ cache file: decode parses + validates the shape (a corrupt or
// outdated file just falls back to an empty cache), encode stringifies.
const CacheFileSchema = Schema.fromJsonString(
  Schema.Struct({
    version: Schema.Number,
    results: Schema.Record(Schema.String, CacheEntrySchema),
  }),
);

const cacheFilePath = Effect.gen(function* () {
  const path = yield* Path.Path;
  return path.join(
    process.cwd(),
    'node_modules',
    '.cache',
    'wiki-link-check',
    'results.json',
  );
});

const readCache = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const file = yield* cacheFilePath;
  const raw = yield* fs
    .readFileString(file)
    .pipe(Effect.orElseSucceed(() => null));
  if (raw === null) return new Map<string, CacheEntry>();
  const parsed = yield* Schema.decodeEffect(CacheFileSchema)(raw).pipe(
    Effect.orElseSucceed(() => null),
  );
  if (parsed === null || parsed.version !== CACHE_VERSION)
    return new Map<string, CacheEntry>();
  return new Map(Object.entries(parsed.results));
});

const writeCache = (entries: ReadonlyMap<string, CacheEntry>) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = yield* cacheFilePath;
    yield* fs.makeDirectory(path.dirname(file), { recursive: true });
    const results = Object.fromEntries(
      [...entries.entries()].toSorted(([a], [b]) => a.localeCompare(b)),
    );
    const json = yield* Schema.encodeEffect(CacheFileSchema)({
      version: CACHE_VERSION,
      results,
    });
    yield* fs.writeFileString(file, json);
  });

/** Rate limiting / server hiccups — retried with backoff before being reported. */
class TransientStatus extends Data.TaggedError('TransientStatus')<{
  status: number;
}> {}

// HEAD the page; the plain client doesn't fail on 4xx/5xx, so the status comes
// back on the response. Network errors and 429/5xx (the wiki rate-limits bursts
// with 502s) get a few backoff retries before being reported.
const checkLink = (link: LinkCheck) =>
  HttpClient.head(link.url, {
    headers: {
      'user-agent': `elden-ring-compass ${COMMAND_NAME} (local link audit; results cached to minimize requests)`,
    },
  }).pipe(
    Effect.flatMap((response) =>
      response.status === 429 || response.status >= 500
        ? Effect.fail(new TransientStatus({ status: response.status }))
        : Effect.succeed(response.status),
    ),
    Effect.retry({
      schedule: Schedule.exponential(Duration.seconds(2)),
      times: 3,
    }),
    Effect.catchTags({
      TransientStatus: (e) => Effect.succeed<number | 'error'>(e.status),
      HttpClientError: () => Effect.succeed<number | 'error'>('error'),
    }),
  );

interface MainOptions {
  concurrency: number;
  table: string | undefined;
  noCache: boolean;
  revalidate: number;
}

const main = ({ concurrency, table, noCache, revalidate }: MainOptions) =>
  Effect.gen(function* () {
    // Never make live requests from CI — every runner would re-hit the wiki
    // (the node_modules cache isn't shared there). This check is a local gate.
    const ci = yield* Config.Boolean('CI').pipe(Config.withDefault(false));
    if (ci) {
      yield* Console.log(
        'CI detected — skipping wiki link check (local-only gate).',
      );
      return;
    }

    const links = collectLinks(table);
    const cache = noCache ? new Map<string, CacheEntry>() : yield* readCache;

    // Cached-OK links are trusted; the oldest few rotate back in each run so a
    // page the wiki deletes is still caught eventually, amortized across runs.
    const cachedAt = (url: string) => cache.get(url)?.checkedAt ?? '';
    const fresh = links.filter((l) => !cache.has(l.url));
    const rotation = links
      .filter((l) => cache.has(l.url))
      .toSorted((a, b) => cachedAt(a.url).localeCompare(cachedAt(b.url)))
      .slice(0, Math.max(0, revalidate));
    const toCheck = [...fresh, ...rotation];

    yield* Console.log(
      `${links.length} unique wiki URLs — ${(links.length - fresh.length).toString()} cached OK; ` +
        `checking ${fresh.length} new + ${rotation.length} revalidations (concurrency ${concurrency})…`,
    );

    let done = 0;
    const failures: Failure[] = [];
    const unreachable: LinkCheck[] = [];
    yield* Effect.forEach(
      toCheck,
      (link) =>
        Effect.gen(function* () {
          const status = yield* checkLink(link);
          done++;
          if (status === 'error') {
            // Transport failure: the wiki was never reached, so it's no evidence
            // the page is gone — keep any cached entry and report separately.
            unreachable.push(link);
          } else if (status === 200) {
            cache.set(link.url, {
              status,
              checkedAt: new Date().toISOString(),
            });
          } else {
            cache.delete(link.url);
            failures.push({ ...link, status });
          }
          if (done % 100 === 0)
            yield* Console.log(`  ${done}/${toCheck.length} checked…`);
        }),
      { concurrency },
    );

    // Drop cache entries for URLs the UI can no longer produce (full runs only —
    // a --table run sees just a slice and must not prune the rest).
    if (table === undefined) {
      const current = new Set(links.map((l) => l.url));
      for (const url of cache.keys()) if (!current.has(url)) cache.delete(url);
    }
    yield* writeCache(cache);

    if (unreachable.length > 0) {
      yield* Console.log(
        `⚠ ${unreachable.length.toString()} links unreachable (network) — not failing the gate; they'll be retried next run.`,
      );
    }
    if (failures.length === 0) {
      yield* Console.log(
        `All ${(links.length - unreachable.length).toString()} verifiable wiki links resolve (HTTP 200).`,
      );
      return;
    }

    // Group by table so it's obvious which tables can(not) safely show the column.
    const perTable = new Map<string, Failure[]>();
    for (const f of failures) {
      for (const t of f.tables) {
        const list = perTable.get(t) ?? [];
        list.push(f);
        perTable.set(t, list);
      }
    }

    yield* Console.log(`\n${failures.length}/${links.length} links failed:\n`);
    for (const [t, fs] of [...perTable.entries()].toSorted(
      (a, b) => b[1].length - a[1].length,
    )) {
      const total = collectLinks(t).length;
      yield* Console.log(`  ${t} — ${fs.length}/${total} broken:`);
      for (const f of fs.toSorted((a, b) => a.name.localeCompare(b.name))) {
        yield* Console.log(`    [${f.status}] ${f.name}  →  ${f.url}`);
      }
    }
    return yield* new BrokenLinksError({
      message: `${failures.length} broken wiki links`,
    });
  });

const command = Command.make(
  COMMAND_NAME,
  {
    concurrency: Flag.Int('concurrency').pipe(
      Flag.withDefault(8),
      Flag.withDescription(
        'Parallel requests (be polite — this hits the live wiki)',
      ),
    ),
    table: Flag.String('table').pipe(
      Flag.optional,
      Flag.withDescription(
        'Only check one inventory table type (e.g. talismans)',
      ),
    ),
    noCache: Flag.Boolean('no-cache').pipe(
      Flag.withDefault(false),
      Flag.withDescription(
        'Ignore the node_modules/.cache result cache and re-check everything',
      ),
    ),
    revalidate: Flag.Int('revalidate').pipe(
      Flag.withDefault(10),
      Flag.withDescription(
        'Re-check the N oldest cached entries per run (catches deleted pages)',
      ),
    ),
  },
  ({ concurrency, table, noCache, revalidate }) =>
    main({
      concurrency,
      table: Option.getOrUndefined(table),
      noCache,
      revalidate,
    }),
);

const run = Command.run(command, { version: '0.0.1' });

run.pipe(
  Effect.provide([FetchHttpClient.layer, BunServices.layer]),
  BunRuntime.runMain,
);
