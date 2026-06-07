import { GAME_VERSION } from '@elden-ring-compass/data';
import { useAtomValue } from '@effect/atom-react';
import { Link, useLocation } from '@tanstack/react-router';
import { FileCheckIcon, FlaskConicalIcon, HandshakeIcon, SwordIcon } from 'lucide-react';

import { DarkModeToggle } from '@/components/misc/dark-mode-toggle';
import {
  ConnectSaveButton,
  DisconnectButton,
  SlotSwitcher,
} from '@/components/misc/save-file-source-selector';
import { GithubIcon } from '@/components/shell/github-icon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { isSampleSource, saveFileSourceAtom } from '@/stores/save-file-source-store';
import { useSaveLoading, useSelectedSlot } from '@/stores/slot-selection-store';

import { NAV, REPO_URL } from './nav';

// Game data is extracted from a specific Elden Ring build (PE FileVersion of
// eldenring.exe). Trim trailing ".0" segments for a tidy "1.16" / "1.16.1".
function prettyVersion(version: string): string {
  const parts = version.split('.');
  while (parts.length > 2 && parts[parts.length - 1] === '0') parts.pop();
  return parts.join('.');
}

export function AppSidebar() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const connected = !!useSelectedSlot();
  // Derived in the effect-atom graph (see slot-selection-store). Covers the gap
  // between the Connect dialog closing (e.g. "Use a sample save") and the parsed
  // slot resolving, so the sidebar shows "Loading save…" not the Connect button.
  const loadingSave = useSaveLoading();
  // Distinguish the bundled demo save from the user's own connected save.
  const isSample = isSampleSource(useAtomValue(saveFileSourceAtom));

  return (
    <Sidebar collapsible='icon'>
      {/* Brand */}
      <SidebarHeader>
        <div className='flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'>
          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-background'>
            <SwordIcon className='size-5' />
          </span>
          <div className='min-w-0 leading-tight group-data-[collapsible=icon]:hidden'>
            <h1 className='truncate text-sm font-bold tracking-tight'>Elden Ring Compass</h1>
            <p className='text-[11px] text-muted-foreground'>Save Parser</p>
          </div>
          <DarkModeToggle size='icon-sm' className='ml-auto group-data-[collapsible=icon]:hidden' />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Primary nav */}
        <SidebarGroup>
          <SidebarGroupLabel>Explore</SidebarGroupLabel>
          <SidebarMenu>
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to as string);
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    render={<Link to={item.to} activeOptions={{ exact: item.exact }} />}
                  >
                    <Icon />
                    <span>{item.label}</span>
                    {item.preview && (
                      <span className='ml-auto text-[10px] font-semibold tracking-wide text-muted-foreground/80 uppercase group-data-[collapsible=icon]:hidden'>
                        Preview
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Secondary: acknowledgments + source + game version */}
        <SidebarGroup className='mt-auto'>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size='sm'
                isActive={pathname === '/credits'}
                tooltip='Acknowledgments'
                render={<Link to='/credits' />}
              >
                <HandshakeIcon />
                <span>Acknowledgments</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                size='sm'
                tooltip='Open source on GitHub'
                render={
                  <a
                    href={REPO_URL}
                    target='_blank'
                    rel='noreferrer'
                    aria-label='Open source on GitHub'
                  />
                }
              >
                <GithubIcon />
                <span>Open source on GitHub</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <p
            className='px-2 pt-1.5 text-center text-[10.5px] text-muted-foreground/70 group-data-[collapsible=icon]:hidden'
            title={
              GAME_VERSION
                ? `Game data extracted from eldenring.exe v${GAME_VERSION} (executable build version)`
                : 'Game version could not be determined'
            }
          >
            {GAME_VERSION
              ? `Game data · v${prettyVersion(GAME_VERSION)}`
              : 'Game data · version unknown'}
          </p>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: character / connection */}
      <SidebarFooter>
        {connected ? (
          <>
            {/* One control: identity + slot switcher (no more duplicated name). */}
            <SlotSwitcher />
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs group-data-[collapsible=icon]:hidden',
                isSample
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-green-500/40 bg-green-500/10',
              )}
            >
              {isSample ? (
                <FlaskConicalIcon className='size-3.5 shrink-0 text-amber-500' />
              ) : (
                <span className='relative flex size-2 shrink-0'>
                  <span className='absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60' />
                  <span className='relative inline-flex size-2 rounded-full bg-green-500' />
                </span>
              )}
              <span className='font-semibold'>{isSample ? 'Sample save' : 'Live'}</span>
              <span className='truncate text-muted-foreground'>
                {isSample ? '· demo data' : '· synced'}
              </span>
              <DisconnectButton className='-mr-1 ml-auto size-6 text-muted-foreground hover:text-foreground' />
            </div>
          </>
        ) : (
          <>
            <div className='flex items-center gap-3 px-1 group-data-[collapsible=icon]:hidden'>
              <Avatar size='lg'>
                <AvatarFallback>
                  <SwordIcon className='size-4' />
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0 leading-tight'>
                <div className='truncate text-[13px] font-semibold'>
                  {loadingSave ? 'Loading save…' : 'No save loaded'}
                </div>
                <div className='truncate text-[11px] text-muted-foreground'>
                  {loadingSave ? 'Parsing your character' : 'Browsing as guest'}
                </div>
              </div>
            </div>
            {loadingSave ? (
              <Spinner className='mx-auto my-2 size-5 text-muted-foreground' />
            ) : (
              <ConnectSaveButton className='w-full justify-center group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!'>
                <FileCheckIcon />
                <span className='group-data-[collapsible=icon]:hidden'>Connect a save</span>
              </ConnectSaveButton>
            )}
          </>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
