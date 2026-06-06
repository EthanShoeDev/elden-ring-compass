import { Link, useLocation } from '@tanstack/react-router';
import { HandshakeIcon } from 'lucide-react';

import { DarkModeToggle } from '@/components/misc/dark-mode-toggle';
import { ConnectSaveButton } from '@/components/misc/save-file-source-selector';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { NAV, SECTION_META } from './nav';

export function AppTopBar() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const meta = SECTION_META[pathname] ?? { title: 'Elden Ring Compass', sub: '' };
  const connected = !!useSelectedSlot();

  return (
    <div className='sticky top-0 z-20 flex flex-col border-b border-border bg-background/85 backdrop-blur'>
      <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-7 md:py-4'>
        <div className='min-w-0'>
          <h2 className='truncate text-lg font-semibold tracking-tight md:text-[22px]'>
            {meta.title}
          </h2>
          <div className='truncate text-[13px] text-muted-foreground'>{meta.sub}</div>
        </div>

        {/* Run-scoped controls only. Connecting a save, picking a character slot
            and disconnecting are owned by the sidebar (desktop); on mobile the
            sidebar is hidden, so a Connect button is surfaced here as a fallback. */}
        <div className='flex flex-wrap items-center gap-2'>
          {!connected && <ConnectSaveButton variant='outline' size='sm' className='md:hidden' />}
          <DarkModeToggle />
        </div>
      </div>

      {/* Mobile nav — the sidebar is hidden below md, so surface the views here. */}
      <div className='flex gap-1 overflow-x-auto px-2 pb-1 md:hidden'>
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className='flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors'
              activeProps={{ className: 'border-foreground text-foreground' }}
              inactiveProps={{
                className: 'border-transparent text-muted-foreground hover:text-foreground',
              }}
            >
              <Icon className='size-4' />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          to='/credits'
          className='flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors'
          activeProps={{ className: 'border-foreground text-foreground' }}
          inactiveProps={{
            className: 'border-transparent text-muted-foreground hover:text-foreground',
          }}
        >
          <HandshakeIcon className='size-4' />
          <span>Thanks</span>
        </Link>
      </div>
    </div>
  );
}
