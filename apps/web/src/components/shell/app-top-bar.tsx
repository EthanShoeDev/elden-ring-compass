import { DarkModeToggle } from '@/components/misc/dark-mode-toggle';
import { SaveFileSourceSelector } from '@/components/misc/save-file-source-selector';
import { ShareButton } from '@/components/misc/share-button';
import { cn } from '@/lib/utils';

import { DlcSwitch } from './dlc-switch';
import { NAV, SECTION_META, type ViewId } from './nav';

export function AppTopBar({
  view,
  onSelect,
  dlc,
  onToggleDlc,
}: {
  view: ViewId;
  onSelect: (view: ViewId) => void;
  dlc: boolean;
  onToggleDlc: (on: boolean) => void;
}) {
  const meta = SECTION_META[view];

  return (
    <div className='sticky top-0 z-20 flex flex-col border-b border-border bg-background/85 backdrop-blur'>
      <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-7 md:py-4'>
        <div className='min-w-0'>
          <h2 className='truncate text-lg font-semibold tracking-tight md:text-[22px]'>
            {meta.title}
          </h2>
          <div className='truncate text-[13px] text-muted-foreground'>{meta.sub}</div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <DlcSwitch on={dlc} onToggle={onToggleDlc} />
          <SaveFileSourceSelector />
          <ShareButton />
          <DarkModeToggle />
        </div>
      </div>

      {/* Mobile nav — the sidebar is hidden below md, so surface the views here. */}
      <div className='flex gap-1 overflow-x-auto px-2 pb-1 md:hidden'>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type='button'
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className='size-4' />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
