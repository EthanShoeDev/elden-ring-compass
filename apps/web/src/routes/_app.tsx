import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useState } from 'react';

import { Footer } from '@/components/footer';
import { SharedViewBanner } from '@/components/misc/shared-view-banner';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { AppTopBar } from '@/components/shell/app-top-bar';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

/**
 * The redesigned app surface: a sidebar-nav dashboard shell. Each nav item is
 * its own route (see ./_app/*); this layout renders the persistent chrome
 * (sidebar, top bar, banner, footer) around the active route's <Outlet />.
 * Fully explorable without a save — connecting one personalizes each section.
 *
 * DLC is a cosmetic toggle until DLC data is wired up.
 */
function AppLayout() {
  const [dlc, setDlc] = useState(false);

  return (
    <div className='flex min-h-screen'>
      <AppSidebar />
      <div className='flex min-w-0 flex-1 flex-col'>
        <AppTopBar dlc={dlc} onToggleDlc={setDlc} />
        <SharedViewBanner />
        <div className='flex flex-1 flex-col gap-5 p-4 md:p-7'>
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
}
