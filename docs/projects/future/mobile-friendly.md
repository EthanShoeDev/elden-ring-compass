# Mobile-friendly website

> **Status (2026-06-11): FUTURE — not started.** Spun out of `../cleanup.md`. The site is
> desktop-first today; this project is an audit-and-fix pass across every route at phone
> widths, with **manual verification required** (real device or DevTools device emulation)
> — automated checks won't catch overflow/tap-target/feel problems.

## What already works (don't redo)

Some mobile affordances landed as side effects of the shadcn sidebar adoption:

- **Sidebar** → off-canvas `Sheet` on mobile via `hooks/use-mobile.ts`; the top bar's
  `SidebarTrigger` opens it (the old duplicated mobile tab-nav row was removed).
- **Dark-mode toggle** is surfaced in the mobile top bar (sidebar is hidden there).
- **Data tables** virtualize all rows and scroll horizontally with fixed column widths,
  so they don't blow out the page width — but whether they're _usable_ on a phone
  (column resizing, faceted-filter popovers, the pinned-rows summary) is unverified.

## Known suspects to audit

- **Interactive map route** — Leaflet touch gestures, popup/tooltip sizing. The map
  chrome rework shipped 2026-06-11 (see `../complete/cleanup-2026-06.md`): controls now
  float on the map and default collapsed on mobile. Known wart to fix here: the OPEN
  controls panel partially covers the map switcher at phone widths.
- **Data-table toolbars** — faceted filter chips + search likely wrap badly at 375px.
- **Bosses gallery** — card grid columns at narrow widths.
- **Calculator (Build Doctor)** — archetype picker grid + advisor cards + sliders.
- **Overview** — stat cards / completion cards stacking.
- **Footer** — recently shortened, but verify wrap.
- Anything with `h-svh`/fixed-height frames (`_app.tsx`) — check iOS Safari URL-bar
  resize behavior (svh should handle it; verify).

## Manual verification checklist (fill in during the work)

Per route, at 375×667 and 414×896, light + dark:

- [ ] `/` Overview
- [ ] `/map`
- [ ] `/inventory/$category` (at least weapons-shields + tools)
- [ ] `/graces`
- [ ] `/bosses`
- [ ] `/calculator`
- [ ] `/events`
- [ ] credits/acknowledgments
- [ ] 404 page
- [ ] Shared-save view (`/share?d=` / `?save=` banner)

For each: no horizontal page overflow, tap targets ≥ ~40px, popovers/tooltips stay
on-screen, sidebar Sheet opens/closes cleanly, tables scroll without trapping page scroll.
