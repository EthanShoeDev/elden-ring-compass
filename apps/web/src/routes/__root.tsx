import {
  createRootRoute,
  HeadContent,
  Scripts,
  Outlet,
  retainSearchParams,
} from '@tanstack/react-router';
import { RegistryProvider, useAtomSet } from '@effect/atom-react';
import { Effect, Exit, Schema } from 'effect';
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Providers } from '@/components/providers/providers';
import { decodeFromUrlEffect } from '@/lib/share/decode';
import { saveFileSourceAtom } from '@/stores/save-file-source-store';
import '../index.css';

// Dev-only React Scan render profiler — highlights components as they re-render
// (used to chase the data-table / tooltip hover-render cost). Dynamically imported
// and gated on `import.meta.env.DEV`, so both the call and the dependency are
// stripped from production builds; the `window` guard keeps it off the SSR pass.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  void import('react-scan').then(({ scan }) => {
    scan({ enabled: true });
  });
}

const SITE_TITLE = 'Elden Ring Compass';
const SITE_DESCRIPTION =
  'A free, open-source, read-only Elden Ring save analyzer — explore the world map, bosses, ' +
  'inventory and weapon AR right in your browser. Your save never leaves your device.';

const SearchSchema = Schema.Struct({
  save: Schema.optional(Schema.String),
});

export const Route = createRootRoute({
  validateSearch: Schema.toStandardSchemaV1(SearchSchema),
  search: { middlewares: [retainSearchParams(['save'])] },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: SITE_TITLE },
      { name: 'description', content: SITE_DESCRIPTION },
      // OpenGraph — link unfurls in Discord / Slack / etc.
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_TITLE },
      { property: 'og:title', content: SITE_TITLE },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:image', content: '/favicon.svg' },
      // Twitter card
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: SITE_TITLE },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: '/favicon.svg' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/favicon.svg' },
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
            <SharedSaveSource />
            <Outlet />
          </Providers>
        </RegistryProvider>
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}

function SharedSaveSource() {
  const { save } = Route.useSearch();
  const setSaveFileSource = useAtomSet(saveFileSourceAtom);

  useEffect(() => {
    let cancelled = false;
    if (!save) return;

    const fiber = Effect.runFork(decodeFromUrlEffect(save));
    fiber.addObserver((exit) => {
      if (!cancelled && Exit.isSuccess(exit) && exit.value) {
        setSaveFileSource({ sharedData: exit.value });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [save, setSaveFileSource]);

  return null;
}
