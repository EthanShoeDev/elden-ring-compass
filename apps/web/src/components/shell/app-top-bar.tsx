import { useLocation } from '@tanstack/react-router';

import { DarkModeToggle } from '@/components/misc/dark-mode-toggle';
import { ConnectSaveButton } from '@/components/misc/save-file-source-selector';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { SECTION_META } from './nav';

export function AppTopBar() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const meta = SECTION_META[pathname] ?? { title: 'Elden Ring Compass', sub: '' };
  const connected = !!useSelectedSlot();

  return (
    <div className='sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-7 md:py-4'>
      {/* Collapses the icon rail on desktop; opens the off-canvas sidebar Sheet
          on mobile (the sidebar is the single source of nav + connection now). */}
      <SidebarTrigger className='-ml-1 shrink-0' />
      <Separator orientation='vertical' className='!h-6 shrink-0' />

      <div className='min-w-0 flex-1'>
        <h2 className='truncate text-lg font-semibold tracking-tight md:text-[22px]'>
          {meta.title}
        </h2>
        <div className='truncate text-[13px] text-muted-foreground'>{meta.sub}</div>
      </div>

      {/* Quick mobile actions. Full controls live in the sidebar Sheet (open via
          the trigger); these stay surfaced for one-tap access on small screens. */}
      <div className='flex shrink-0 items-center gap-2 md:hidden'>
        {!connected && <ConnectSaveButton variant='outline' size='sm' />}
        <DarkModeToggle />
      </div>
    </div>
  );
}
