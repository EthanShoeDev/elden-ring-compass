import { Spinner } from '@/components/ui/spinner';

/**
 * Router-wide `defaultPendingComponent` (see router.tsx). Shown in the content
 * area while a route resolves — chiefly during lazy route-chunk loading, since
 * most routes read in-memory effect-atoms rather than running async loaders.
 * Renders inside the `_app` shell (it replaces the route's component in the
 * layout's <Outlet />), so the sidebar/top-bar stay put while content loads.
 */
export function RoutePending() {
  return (
    <div className='flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 text-muted-foreground'>
      <Spinner className='size-6' />
      <span className='text-sm'>Loading…</span>
    </div>
  );
}
