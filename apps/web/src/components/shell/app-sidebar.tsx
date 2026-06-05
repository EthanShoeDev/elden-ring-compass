import { ExternalLinkIcon, SwordIcon } from 'lucide-react';

import { SaveFileSourceSelector } from '@/components/misc/save-file-source-selector';
import { GithubIcon } from '@/components/shell/github-icon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { statsDbView } from '@/lib/vm/stats';
import { cn } from '@/lib/utils';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { NAV, REPO_URL, type ViewId } from './nav';

export function AppSidebar({ view, onSelect }: { view: ViewId; onSelect: (view: ViewId) => void }) {
  const slot = useSelectedSlot();
  const connected = !!slot;
  const stats = slot ? statsDbView(slot) : null;

  return (
    <aside className='hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-accent md:sticky md:top-0 md:flex'>
      {/* Brand */}
      <div className='flex items-center gap-3 border-b border-border px-5 py-4'>
        <span className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background'>
          <SwordIcon className='size-5' />
        </span>
        <div className='leading-tight'>
          <h1 className='text-sm font-bold tracking-tight'>Elden Ring Compass</h1>
          <p className='text-[11px] text-muted-foreground'>Save Parser</p>
        </div>
      </div>

      {/* Nav */}
      <nav className='flex flex-1 flex-col gap-0.5 p-3'>
        <div className='px-2 pt-2 pb-1.5 text-[10.5px] font-bold tracking-wider text-muted-foreground uppercase'>
          Explore
        </div>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type='button'
              onClick={() => onSelect(item.id)}
              data-active={active}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className='size-[18px]' />
              <span>{item.label}</span>
              {item.preview && (
                <span className='ml-auto text-[10px] font-semibold tracking-wide text-muted-foreground/80 uppercase'>
                  Preview
                </span>
              )}
            </button>
          );
        })}

        <a
          href={REPO_URL}
          target='_blank'
          rel='noreferrer'
          className='mt-auto flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <GithubIcon className='size-4' />
          <span>Open source on GitHub</span>
          <ExternalLinkIcon className='ml-auto size-3 opacity-60' />
        </a>
      </nav>

      {/* Footer: character / connection */}
      <div className='flex flex-col gap-3 border-t border-border p-3.5'>
        <div className='flex items-center gap-3'>
          <Avatar size='lg'>
            <AvatarFallback>
              <SwordIcon className='size-4' />
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 leading-tight'>
            <div className='truncate text-[13px] font-semibold'>
              {connected ? slot.player_game_data.character_name || 'Tarnished' : 'No save loaded'}
            </div>
            <div className='truncate text-[11px] text-muted-foreground'>
              {connected && stats
                ? `${stats.arche_type} · Lvl ${stats.stats.level}`
                : 'Browsing as guest'}
            </div>
          </div>
        </div>

        {connected ? (
          <div className='flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs'>
            <span className='relative flex size-2 shrink-0'>
              <span className='absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60' />
              <span className='relative inline-flex size-2 rounded-full bg-green-500' />
            </span>
            <span className='font-semibold'>Live</span>
            <span className='text-muted-foreground'>· synced from your save</span>
          </div>
        ) : (
          <SaveFileSourceSelector />
        )}
      </div>
    </aside>
  );
}
