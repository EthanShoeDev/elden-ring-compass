/** Tiny uppercase section label inside a floating panel. */
export function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className='mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
      {children}
    </div>
  );
}
