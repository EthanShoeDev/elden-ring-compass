# Cleanup TODO

Small UI/UX nits and loose ideas that don't warrant their own project doc.

- Completed items (with their full implementation notes) are archived in
  [complete/cleanup-2026-06.md](complete/cleanup-2026-06.md).
- Bigger-scope items get spun out to `future/` — see "Spun out" at the bottom.

## Open

- **"Copy Save as JSON" button placement.** It exists because a user once asked for it,
  but the footer (`components/footer.tsx`) is probably not the best home. Think of
  something better.

- **Proper OpenGraph image.** [PARTIAL 2026-06-06] og:/twitter: title+description+url are
  wired, but `og:image` is still `/favicon.svg` (`routes/__root.tsx`) — most platforms
  won't render an SVG og:image. Needs a real 1200×630 raster card in `public/`.

- **Persist map pan/zoom/realm.** [NARROWED 2026-06-11] The old "re-create prod's
  persisted zustand store" item is half done: all data-table state already persists across
  refresh via `Atom.kvs`/localStorage (`components/data-table/data-table-store.ts`). The
  map view (pan/zoom/selected realm) is still transient — persist it the same way.

- **Map chrome rework.** [VERIFIED STILL OPEN 2026-06-11] The layers/legend/quick-select/
  clear-pins controls are still sandwiched underneath the map (`sections/map-section.tsx`)
  and it does not look great. Worth trying floating/overlaid controls on top of the map.
  See the `main` branch for how it looked before the major upgrades. (If controls move
  onto the map, design them mobile-first — see
  [future/mobile-friendly.md](future/mobile-friendly.md).)

- **Map layers for item sub-categories?** Maybe split the single "items" layer into
  per-sub-category toggles. Not sure it's worth it.

- **"Show all undiscovered items at current zoom level" button** on the map route.
  Idea-stage; overlaps heavily with
  [future/nearby-items.md](future/nearby-items.md) — probably design them together.

## Spun out

- **Mobile-friendly website** → [future/mobile-friendly.md](future/mobile-friendly.md)
  (audit + fix every route at phone widths; manual verification checklist).
- **Nearby items / glance-while-playing** → [future/nearby-items.md](future/nearby-items.md).
- **Equipped-gear 3D viewer** (extract weapon/armor models, three.js render) →
  [future/equipped-gear-3d-viewer.md](future/equipped-gear-3d-viewer.md).
- **Sharing feature** → shipped; doc at
  [complete/sharing-feature.md](complete/sharing-feature.md).
- **Overview completion tracker** (avatar-circle placeholder, completion percentages,
  collected-vs-missing tables) → [overview-completion-tracker.md](overview-completion-tracker.md)
  (still active).
- **Calculator rework** → shipped; doc at [calculator.md](calculator.md).
