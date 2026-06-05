import { createRootRoute, HeadContent, Scripts, Outlet } from '@tanstack/react-router';
import { RegistryProvider } from '@effect/atom-react';
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
            <Outlet />
          </Providers>
        </RegistryProvider>
        <Scripts />
      </body>
    </html>
  );
}
