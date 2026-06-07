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
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className='min-w-0'>
        <AppTopBar />
        <SharedViewBanner />
        <div className='flex flex-1 flex-col gap-5 p-4 md:p-7'>
          <Outlet />
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
