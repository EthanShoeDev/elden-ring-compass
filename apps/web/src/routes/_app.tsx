import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router';

import { Footer } from '@/components/footer';
import { SharedViewBanner } from '@/components/misc/shared-view-banner';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { AppTopBar } from '@/components/shell/app-top-bar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

/**
 * The redesigned app surface: a sidebar-nav dashboard shell built on the shadcn
 * Sidebar primitive (collapsible icon rail on desktop, off-canvas Sheet on
 * mobile). Each nav item is its own route (see ./_app/*); this layout renders
 * the persistent chrome (sidebar, top bar, banner, footer) around the active
 * route's <Outlet />. Fully explorable without a save — connecting one
 * personalizes each section.
 */
function AppLayout() {
  // Fixed-height app frame: the shell (sidebar, top bar, banner) is pinned and a
  // single inner region (`overflow-y-auto`) scrolls.
  //
  // Two content layouts, chosen per-route via `staticData` (see router.tsx):
  //  - FLOW (default): the content region is NOT height-bounded, so routes lay
  //    out at their natural height — tall pages overflow and the region scrolls,
  //    short pages let `flex-1` push the footer to the bottom. Bounding it would
  //    make cards shrink-to-fit instead of overflowing (clipping content + the
  //    footer overlapping it).
  //  - FILL (`staticData.fill`/`fullBleed`): the region IS bounded (`min-h-0`)
  //    so a `flex-1` child (a virtualized DataTable) fills the viewport exactly
  //    and scrolls internally; the footer is dropped so the table owns the frame.
  //    `fullBleed` additionally drops the page padding for an edge-to-edge table.
  const fill = useMatches({
    select: (m) => m.some((r) => r.staticData.fill || r.staticData.fullBleed),
  });
  const fullBleed = useMatches({ select: (m) => m.some((r) => r.staticData.fullBleed) });
  return (
    <SidebarProvider className='h-svh overflow-hidden'>
      <AppSidebar />
      <SidebarInset className='min-h-0 min-w-0 overflow-hidden'>
        <AppTopBar />
        <SharedViewBanner />
        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
          <div
            className={cn(
              'flex flex-1 flex-col',
              fill && 'min-h-0',
              !fullBleed && 'gap-5 p-4 md:p-7',
            )}
          >
            <Outlet />
          </div>
          {!fill && <Footer />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
