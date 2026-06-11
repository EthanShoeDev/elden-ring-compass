/**
 * Shared chrome for the floating panels over the map: translucent popover
 * surface + blur so map detail stays legible underneath. Panels sit at
 * z-[1000] — Leaflet's own control tier — above panes (400) and popups (700).
 */
export const OVERLAY_PANEL =
  'rounded-lg border border-border bg-popover/90 text-popover-foreground shadow-md backdrop-blur-sm';

/** Translucent surface for standalone floating buttons (toggle, locate, pill). */
export const OVERLAY_BUTTON = 'bg-background/90 shadow-md backdrop-blur-sm dark:bg-background/80';

/** Tiny uppercase section label inside a floating panel. */
export function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className='mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
      {children}
    </div>
  );
}
