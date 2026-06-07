import { createRouter } from '@tanstack/react-router';
import { NotFound } from './components/shell/not-found';
import { RoutePending } from './components/shell/route-pending';
import { routeTree } from './routeTree.gen';

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    defaultNotFoundComponent: NotFound,
    // Shown in the content area while a route resolves (mainly lazy chunk loads,
    // since data comes from in-memory atoms not async loaders).
    defaultPendingComponent: RoutePending,
    // Prefetch a route's chunk/loader on link hover (and focus) so navigation
    // feels instant; the Link transition + pending UI become a graceful fallback.
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
