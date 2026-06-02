import { createRootRoute, HeadContent, Scripts, Outlet } from '@tanstack/react-router';
import { RegistryProvider } from '@effect/atom-react';
import { AppBar } from '@/components/app-bar';
import { Footer } from '@/components/footer';
import { SharedViewBanner } from '@/components/misc/shared-view-banner';
import { Providers } from '@/components/providers/providers';
import '../index.css';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Elden Ring Compass',
      },
    ],
  }),

  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <RegistryProvider>
          <Providers>
            <div className='flex h-screen flex-col'>
              <AppBar />
              <SharedViewBanner />
              <Outlet />
              <Footer />
            </div>
          </Providers>
        </RegistryProvider>
        <Scripts />
      </body>
    </html>
  );
}
