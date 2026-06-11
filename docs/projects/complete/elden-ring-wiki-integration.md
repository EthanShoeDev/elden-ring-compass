We should not scrape content from the wiki, as they have rules against doing that,
But I think we can use links so that like if a user hovers an item on the map, there will be a link to the wiki page for that item.

## Status: implemented (2026-06-11)

Link-only integration with the Fextralife wiki — nothing is fetched or embedded.

### Where links appear

- **Map pin popups** (`leaflet-map.tsx` → `PinPopupBody`): "Elden Ring Wiki ↗" for
  **boss** and **item** pins. The link lives in the click popup rather than the
  hover tooltip because Leaflet tooltips are non-interactive (`pointer-events:
none`) — a link there couldn't be clicked.
- **Every inventory data table** (all 13 tabs), the **All Bosses** table, and the
  **Weapon AR calculator**: a per-row "Wiki" icon column
  (`commonWikiColumnDef` in `common-column-defs.tsx`).
- **Graces and regions deliberately have no links**: their names are
  micro-locations ("Rampart Tower", "The First Step") — 118/~250 region names
  404'd when probed.

### Name → URL resolution (`apps/web/src/lib/wiki.ts`)

- `wikiPageUrl(name)`: whitespace → `+`; drops the `+` of upgrade suffixes and
  double quotes; `[4]` → `(4)`; typographic apostrophes → straight.
- `wikiNameForItem(row)`: affinity variants link their base weapon; save-appended
  " +N" stripped; flask tiers collapse to the base flask; "Map: X" → "Map (X)"
  (base game) but kept verbatim for the DLC's; gestures all link the shared
  Gestures page; irregular titles (5 spirit ashes, Zorayas's Letter) overridden;
  returns `null` (no link) for rows with no page (placeholders, Erdtree
  Prayerbook, Phantom Recusant Finger).
- `wikiNameForBoss(name)`: strips weapon-variant disambiguators
  ("Cleanrot Knight (Spear)" → "Cleanrot Knight") + 4 irregular titles
  (e.g. "Spiritcaller Snail" → "Spirit-Caller Snail").

### Validation — `scripts/wiki-link-check.ts`

`bun run wiki:check` — also part of `turbo run lint` (`//#wiki:check`).
Flags: `[--table <type>] [--concurrency N] [--no-cache] [--revalidate N]`

Effect-TS (v4 `effect/unstable/http` HttpClient + Bun runtime) script that
enumerates every URL the UI can produce — the same `CATALOG` grouping and the
same resolvers — and HEAD-requests each unique one (no content fetched, honoring
the no-scraping rule). 429/5xx get backoff retries (the wiki rate-limits bursts
with 502s). All 2,800+ links resolved HTTP 200 as of 2026-06-11.

To keep wiki traffic minimal as a lint step:

- verified-200 URLs are cached in `node_modules/.cache/wiki-link-check/results.json`
  and skipped; only never-seen URLs (new data, or changed URL rules — the cache is
  keyed by final URL) hit the network, plus the `--revalidate` (default 10) oldest
  cached entries per run so deleted pages still surface eventually
- network-level failures warn without failing the gate (lint works offline);
  a non-200 from the reachable wiki fails it
- skipped entirely in CI (`CI` env var via Effect `Config`) — runners have no
  shared cache and would re-hit the wiki on every build
