/**
 * Shared chrome for the floating panels over the map: an opaque popover
 * surface (no backdrop blur, which re-filters the map on every frame and makes
 * pans and open/close animations stutter). Panels sit at z-[1000] — Leaflet's
 * own control tier — above panes (400) and popups (700).
 */
export const OVERLAY_PANEL =
  'rounded-lg border border-border bg-popover text-popover-foreground shadow-md';

/** Opaque surface for standalone floating buttons (toggle, locate, pill). */
export const OVERLAY_BUTTON = 'bg-background shadow-md';
