import { createFileRoute, Outlet } from '@tanstack/react-router';

import { Footer } from '@/components/footer';
import { SharedViewBanner } from '@/components/misc/shared-view-banner';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { AppTopBar } from '@/components/shell/app-top-bar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

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
  // single inner region scrolls. This lets table-only routes hand their card
  // `flex-1 min-h-0` so a virtualized DataTable fills the viewport exactly;
  // content-heavy routes (overview, calculator, map) just flow and scroll, with
  // the footer trailing the content (pushed to the bottom on short pages).
  return (
    <SidebarProvider className='h-svh overflow-hidden'>
      <AppSidebar />
      <SidebarInset className='min-h-0 min-w-0 overflow-hidden'>
        <AppTopBar />
        <SharedViewBanner />
        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
          <div className='flex min-h-0 flex-1 flex-col gap-5 p-4 md:p-7'>
            <Outlet />
          </div>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
