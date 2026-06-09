# Share-a-Save — encode a character's progression into a shareable URL

> **Status (2026-06-09): GREENFIELD scoping + feasibility, but a partial v1 already exists.**
> The plumbing for a *lossy curated* share is already on `main` — `lib/share/` (encode/decode,
> `ShareableProgression` DTO, LZString), a `/share?d=` route, a `SharedDataSource` arm on
> `saveFileSourceAtom`, slot reconstruction in `save.ts`, and a `SharedViewBanner`. What's
> **missing**: (a) any UI that actually *builds* a link (only tests call `encodeToUrl`), (b) a
> decision on fidelity/size, and (c) the architecture the user asked for — a single global
> `?save=` search param validated with an effect Schema → Standard Schema, retained across
> navigation. This doc settles feasibility with **measured numbers** and maps the implementation.

## Why

Let one player hand another a link that reconstructs their connected dashboard — build, stats,
inventory, completion — without the recipient owning the save file (or the game). The ask was
literally "encode the entire save file in the query params." That exact thing is impossible
(the raw `.sl2` is ~29 MB), but the **extracted** representation we already parse to is small
enough that a single character slot fits in a URL. This doc proves that and picks the fidelity.

## TL;DR feasibility

- **Raw save `ER0000.sl2`: 28,967,888 bytes (~29 MB).** Not shareable, never was the unit.
- **The unit is one `LeanSlot`** (a character), not the whole `LeanSave` (5 slots). Sharing one
  character is both smaller *and* the right UX.
- **A full-fidelity single slot ≈ 11 KB** in the query string (brotli + base64url). A
  **render-only single slot ≈ 7 KB.** Both fit a URL.
- **The binding constraint is not the browser — it's the *server*.** When the recipient opens
  the link cold, the query string rides in the HTTP request line through TanStack Start's SSR
  server and any proxy/CDN. Stock **nginx/Apache cap the request line at ~8 KB**; Node's HTTP
  server at 16 KB; Cloudflare/Vercel ~16–32 KB. So 7 KB clears everything; 11 KB clears
  Node/Vercel/Cloudflare but not stock nginx; the whole 5-slot save (~43 KB) clears nothing.
- **Recommendation: share one slot, render-only, target < 8 KB**, using the clean
  `validateSearch`(effect Schema)→Standard Schema + `retainSearchParams(['save'])` architecture.
  Keep the full event-flag bitfield as an opt-in "full" tier (it only adds ~4 KB) for later.

## Measurements (real, from `apps/web/public/ER0000.sl2`, character "first", lvl 105)

Reproduced by parsing the bundled sample save and compressing the parsed DTO. Compression
compared four ways; **all sizes are final URL-component characters** (already percent-safe).

| Payload | raw JSON (min) | LZString→URI | gzip→b64url | **brotli→b64url** |
|---|--:|--:|--:|--:|
| Whole save, all 5 slots | 11.7 M | 86,516 | 86,132 | **44,084** |
| **One slot, full event-flag bitfield** | 2.34 M | 23,278 | 18,044 | **10,890** |
| One slot, **no** event flags | 54,967 | 14,651 | 9,802 | **7,144** |
| event-flag bitfield *alone* (1.71 MB, 99.9% zeros) | — | — | — | **3,868** |

Per-slot JSON field breakdown (minified chars), largest first — this is where the bytes go:

```
equip_inventory_data   31,846   ← the bulk; the actual "stuff"
ga_items               16,591   ← item instances (upgrade levels etc.)
regions                 1,171
storage_inventory_data    695
equip_item_data           307
chr_asm2 (equipment)      303
player_game_data          230   ← stats, name, level
event_flags          1.7 MB raw (1,563 non-zero bytes / 2,246 set bits) → 3.9 KB compressed
```

### Three facts that drive the design

1. **The event-flag bitfield is huge but nearly empty** — 1.71 MB, 99.9% zeros, so it brotli's
   down to ~3.9 KB on its own. Keeping *all* flags (for a future complete-fidelity quest share)
   is cheap-ish (+~4 KB), but it's still the single biggest line item and the easiest to drop.
2. **Inventory is the real, incompressible floor** — `equip_inventory_data` + `ga_items` are
   ~7 KB compressed and don't shrink much. If the share shows "their stuff," this is the floor.
   You cannot get a meaningful share much under ~6–7 KB.
3. **Brotli over *raw binary* wins decisively.** Compressing the binary blob then base64'ing
   (≈2× better than LZString, and better than brotli-ing a base64 *string*). The current v1 uses
   `LZString.compressToEncodedURIComponent` — the worst ratio of the four. Switching the codec is
   the highest-leverage single change.

> **On "omit the sections we don't use, like the regulation section":** correct instinct, and
> mostly already done. The raw `.sl2` embeds `regulation.bin` (the params/game-balance block) plus
> Steam/checksum framing — **none of that is in `LeanSave`**; the parser already drops it (`LeanSave`
> *is* the extracted subset). The remaining trim levers live *inside* `LeanSlot`: the full
> `event_flags` bitfield (drop → curated, saves ~4 KB), `storage_inventory_data`, `sp_effects`,
> `acquired_projectiles`, `gestures`, `horse`/`blood_stain`/weather/time. A "render-only" profile
> keeps stats + equipment + inventory + curated flags + regions + coords and drops the rest.

## URL length limits (the actual ceiling)

There are two regimes, and the share link hits *both* (it's generated client-side but opened cold
by the recipient):

| Layer | Practical limit | Note |
|---|--:|---|
| **Client SPA nav** (`pushState`) | Chrome ~2 MB, FF/Safari hundreds of KB | Effectively unbounded for us — even 43 KB is fine in-tab. |
| Browser address bar *display* | Chrome truncates ~32 KB shown | Cosmetic; navigation still works above this. |
| **nginx / Apache request line** | **~8 KB** (`large_client_header_buffers` 8k / `LimitRequestLine` 8190) | **The tightest common server limit.** |
| Node.js HTTP server | 16 KB (`maxHeaderSize`, whole header block) | TanStack Start on a Node server. |
| Cloudflare | 16 KB headers / ~32 KB URL | If fronted by CF. |
| Vercel / Netlify edge | ~14–16 KB | Common deploy targets. |

So: **< 8 KB = safe literally everywhere. 8–16 KB = safe on Node/Vercel/Cloudflare but not stock
nginx/Apache. > 16 KB = don't.** A render-only slot (~7 KB) is the safe target; a full-fidelity
slot (~11 KB) is fine on our likely deploy but a liability behind a stock reverse proxy.

### Escape hatch if a tier must exceed the server limit

Put the payload in the **URL hash fragment** (`#save=…`) instead of the query string. The fragment
is *never sent to the server*, so only browser limits (~MBs) apply. Cost: it's invisible to
TanStack's `validateSearch` (which only sees `?search`), so you lose the clean schema pipeline and
SSR pre-render of shared state, and must read `window.location.hash` on the client. **Decision:**
use `?save=` (query) for the render-only default so the requested architecture holds; reserve the
hash only if a future "full" tier blows past 8 KB and we care about stock-nginx recipients.

## Recommended design

**One slot, render-only, `?save=` query param, brotli+base64url, target < 8 KB.**

### Encoding

- New `ShareV2` payload = a `LeanSlot` subset: `player_game_data` (stats/name/level), `chr_asm2`
  (equipment), `equip_inventory_data` + `ga_items` (inventory + upgrade levels), `regions`,
  curated `event_flags` (delta-encoded grace/boss/fragment ids — reuse `shareable-events.ts`),
  `player_coords` (map "viewing X here"), and a `v: 2` version tag.
- **Codec:** brotli over a binary blob → base64url. Browser brotli needs a wasm dep
  (`brotli-wasm`) since `CompressionStream` only ships `gzip`/`deflate`. Trade-off to pick at
  build time:
  - `brotli-wasm`: render-only ≈ **7.1 KB** (clears nginx). +~200 KB wasm dep, lazy-loaded.
  - native `CompressionStream('gzip')`: render-only ≈ **9.8 KB** (zero deps, but *over* 8 KB nginx).
  - keep LZString: render-only ≈ **14.7 KB** (over Node-16K headroom is fine, but worst ratio).
  Lead with **gzip via `CompressionStream`** (zero new dep, lazy, ~9.8 KB — fine on our deploy)
  and only reach for `brotli-wasm` if the strict <8 KB everywhere guarantee is required.
- Validate the *decoded* payload with the existing effect `Schema` (a `LeanSlot` subset Struct),
  not hand-rolled guards — the parser package already defines these Schemas.

### Routing (the architecture the user asked for)

Both pieces exist in the installed versions — verified:

- `Schema.toStandardSchemaV1` exists in `effect@4.0.0-beta.75`.
- `retainSearchParams` is exported from `@tanstack/react-router@1.170.10`.

Wire a **single global search param** on the root route so every route sees it and navigation
never wipes it:

```ts
// routes/__root.tsx
import { Schema } from 'effect';
import { retainSearchParams } from '@tanstack/react-router';

const SearchSchema = Schema.Struct({ save: Schema.optional(Schema.String) });

export const Route = createRootRoute({
  validateSearch: Schema.toStandardSchemaV1(SearchSchema), // effect Schema → Standard Schema
  search: { middlewares: [retainSearchParams(['save'])] }, // survives route → route nav
  // ...
});
```

The search schema validates only the opaque `{ save?: string }`; the *rich* validation happens in
the decode step against the `LeanSlot`-subset Schema. (The existing `/share?d=` route can stay as a
back-compat redirect that rewrites `?d=` → `?save=`, or be retired.)

### State wiring (effect-atom)

- Extend the `saveFileSourceAtom` precedence (`stores/save-file-source-store.ts`). Today:
  `transient (file/shared) ▸ persisted url`. Add a **query-param source** that, when `?save=` is
  present and not dismissed, decodes and wins — likely highest precedence, since it's the most
  explicit signal. Feed it a `SharedDataSource` (that union arm already exists) carrying the
  decoded slot; `save.ts`'s `reconstructSlot` path already turns that into a `LeanSlot` the VMs read.
- "Load your own" (already in `SharedViewBanner`) must also **strip `?save=`** from the URL, not
  just clear the atom, or `retainSearchParams` will re-apply it.

### UI

- **Share button** — two surfaces:
  - In the **Connect-a-Save dialog** (`components/misc/save-file-source-selector.tsx`): once a save
    is connected, a "Share this character" action that builds `?save=` from the **selected slot**
    and copies the link / shows a copy field.
  - On the **Overview** screen (the completion-tracker headline page) — the natural "show off my
    progression" spot. Ties into `overview-completion-tracker.md`.
- **Connected-via-link indicator** — the `SharedViewBanner` already renders "Viewing X's shared
  progression / Load your own." Extend the `SlotSwitcher` / connect UI to label the source as
  **"Shared link"** (distinct from File / Local URL / Sample), so it's obvious the data came from a
  query param and isn't the viewer's own save.

## Open questions / risks

1. **Server limit vs codec.** If we must guarantee <8 KB behind *any* proxy, we need `brotli-wasm`
   (render-only 7.1 KB) — otherwise gzip's 9.8 KB is fine on Node/Vercel/Cloudflare. Decide based on
   the actual deploy target (what fronts TanStack Start in prod?).
2. **Full-fidelity tier.** Keeping the entire event-flag bitfield (for a future quest-compass-grade
   share) pushes one slot to ~11 KB → either accept the no-stock-nginx caveat or move that tier to
   the `#hash`. Render-only is the v2 default; full is a later opt-in.
3. **Privacy.** A share link encodes Steam IDs (`steam_id` per slot) and exact coordinates. Strip or
   blank `steam_id` and consider whether live coords should ride along by default.
4. **OG/preview.** A shared link opened in Discord/Slack should unfurl nicely — overlaps with the
   "proper 1200×630 OG card" TODO in `cleanup.md`. SSR can read `?save=` and render character name +
   completion % into the OG tags (a real reason to keep the payload in the query, not the hash).
5. **Versioning.** `ShareV2` `v` tag + graceful "this link is from a newer version" message; keep
   `v:1` (`?d=`) decodable or redirect it.

## Existing pieces to build on (don't rewrite)

| Piece | File | Reuse as |
|---|---|---|
| Encode/decode + version | `lib/share/encode.ts`, `decode.ts` | Swap codec, add `v:2`; keep the shape |
| Curated flag id set + delta | `lib/share/shareable-events.ts` | Curated `event_flags` for render-only tier |
| Shared-source atom arm | `stores/save-file-source-store.ts` (`SharedDataSource`) | Carry the decoded slot |
| Slot reconstruction | `lib/atoms/save.ts` (`reconstructSlot`) | Already turns shared data → `LeanSlot` |
| "Viewing shared" banner | `components/misc/shared-view-banner.tsx` | Extend to label source + strip `?save=` |
| Share route | `routes/share.tsx` | Back-compat redirect `?d=` → `?save=`, or retire |
| Per-slot DTO Schemas | `packages/save-parser/src/types.ts` | Validate decoded payload with the real Schema |
