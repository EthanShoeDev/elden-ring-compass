import { GAME_VERSION } from '@elden-ring-compass/data';
import { useAtomValue } from '@effect/atom-react';
import { Link, useHydrated, useLocation } from '@tanstack/react-router';
import {
  ChevronRightIcon,
  FileCheckIcon,
  FlaskConicalIcon,
  HandshakeIcon,
  Share2Icon,
  SwordIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { DarkModeToggle } from '@/components/misc/dark-mode-toggle';
import {
  ConnectSaveButton,
  DisconnectButton,
  SlotSwitcher,
} from '@/components/misc/save-file-source-selector';
import { GithubIcon } from '@/components/shell/github-icon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  isSampleSource,
  isSharedSource,
  saveFileSourceAtom,
} from '@/stores/save-file-source-store';
import { useSaveLoading, useSelectedSlot } from '@/stores/slot-selection-store';

import { NAV, REPO_URL } from './nav';

// Game data is extracted from a specific Elden Ring build (PE FileVersion of
// eldenring.exe). Trim trailing ".0" segments for a tidy "1.16" / "1.16.1".
function prettyVersion(version: string): string {
  const parts = version.split('.');
  while (parts.length > 2 && parts[parts.length - 1] === '0') parts.pop();
  return parts.join('.');
}

// TanStack's <Link> stamps `data-transitioning` on its anchor while the target
// route's loader runs (after hydration). Our nav links render *through* <Link>,
// so that attribute lands on the menu-button element itself — tag it with the
// `group/navlink` class and the leading icon swaps to a spinner mid-navigation.
function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <>
      <Icon className='group-data-transitioning/navlink:hidden' />
      <Spinner className='hidden size-4 group-data-transitioning/navlink:block' />
    </>
  );
}

export function AppSidebar() {
  const pathname = useLocation({ select: (l) => l.pathname });
  // When the desktop rail is collapsed to icons, a collapsible group's sub-menu
  // is hidden — so its trigger would only toggle an invisible panel. In that
  // state make the icon navigate to the section instead (see the children branch).
  const { state, isMobile } = useSidebar();
  const railCollapsed = state === 'collapsed' && !isMobile;
  // Collapsible nav groups (only Inventory today) are *controlled* so they can
  // default to "open when this section is active" while still letting the user
  // toggle them — an uncontrolled `defaultOpen` that changes on navigation trips
  // Base UI's "changing the default open state" warning. Until the user toggles a
  // group (keyed by route), it falls back to whether that section is active.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  // These derive from client-only persisted atoms (localStorage-backed kvs), so
  // their values differ between the server render (always "no source") and the
  // first client render (a restored url → "loading"). Gate them on hydration:
  // until hydrated we can't read the persisted save, so the footer shows the
  // loading state below — and because that's what both the SSR HTML and the
  // first client render emit, there's no mismatch. See `useHydrated`.
  const hydrated = useHydrated();
  // NB: call every atom hook unconditionally (no short-circuiting on `hydrated`)
  // or the hook count differs between the pre- and post-hydration render. Gate
  // only the resulting values below.
  const selectedSlot = useSelectedSlot();
  // Derived in the effect-atom graph (see slot-selection-store). Covers the gap
  // between the Connect dialog closing (e.g. "Use a sample save") and the parsed
  // slot resolving, so the sidebar shows "Loading save…" not the Connect button.
  const saveLoading = useSaveLoading();
  // Distinguish the bundled demo save from the user's own connected save.
  const saveFileSource = useAtomValue(saveFileSourceAtom);
  const sourceIsSample = isSampleSource(saveFileSource);
  const sourceIsShared = isSharedSource(saveFileSource);

  const connected = hydrated && !!selectedSlot;
  // Treat the pre-hydration window as "loading" so the SSR HTML prebakes a
  // spinner instead of the guest "No save loaded" UI — a returning user with a
  // restored save then transitions spinner → connected (rather than flashing the
  // guest state first), and a true guest sees a brief spinner → "No save loaded".
  const loadingSave = !hydrated || saveLoading;
  const isSample = hydrated && sourceIsSample;
  const isShared = hydrated && sourceIsShared;

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
              const sectionActive = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to as string);

              // Collapsible group of sub-routes (e.g. Inventory → Items/Events/…).
              if (item.children) {
                return (
                  <Collapsible
                    key={item.to}
                    open={openGroups[item.to as string] ?? sectionActive}
                    onOpenChange={(open) => {
                      setOpenGroups((g) => ({ ...g, [item.to as string]: open }));
                    }}
                    className='group/collapsible'
                    render={<SidebarMenuItem />}
                  >
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          isActive={sectionActive}
                          tooltip={item.label}
                          // Collapsed rail: navigate to the section (the parent
                          // route redirects to its default sub-route) since the
                          // sub-menu can't expand. Expanded: plain toggle.
                          {...(railCollapsed && {
                            render: <Link to={item.to} className='group/navlink' />,
                          })}
                        />
                      }
                    >
                      <Icon />
                      <span>{item.label}</span>
                      <ChevronRightIcon className='ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90 group-data-[collapsible=icon]:hidden' />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.matchPath}>
                            <SidebarMenuSubButton
                              isActive={pathname === child.matchPath}
                              // `to` is the broad LinkProps union here, so TanStack can't
                              // narrow `params` to the matching route — cast past it.
                              render={
                                <Link
                                  to={child.to}
                                  params={child.params as never}
                                  className='group/navlink'
                                />
                              }
                            >
                              <span>{child.label}</span>
                              <Spinner className='ml-auto hidden size-3.5 group-data-transitioning/navlink:block' />
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={sectionActive}
                    tooltip={item.label}
                    render={
                      <Link
                        to={item.to}
                        activeOptions={{ exact: item.exact }}
                        className='group/navlink'
                      />
                    }
                  >
                    <NavIcon icon={Icon} />
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
                render={<Link to='/credits' className='group/navlink' />}
              >
                <NavIcon icon={HandshakeIcon} />
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
                  : isShared
                    ? 'border-blue-500/40 bg-blue-500/10'
                  : 'border-green-500/40 bg-green-500/10',
              )}
            >
              {isSample ? (
                <FlaskConicalIcon className='size-3.5 shrink-0 text-amber-500' />
              ) : isShared ? (
                <Share2Icon className='size-3.5 shrink-0 text-blue-500' />
              ) : (
                <span className='relative flex size-2 shrink-0'>
                  <span className='absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60' />
                  <span className='relative inline-flex size-2 rounded-full bg-green-500' />
                </span>
              )}
              <span className='font-semibold'>
                {isSample ? 'Sample save' : isShared ? 'Shared link' : 'Live'}
              </span>
              <span className='truncate text-muted-foreground'>
                {isSample ? '· demo data' : isShared ? '· read-only' : '· synced'}
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
