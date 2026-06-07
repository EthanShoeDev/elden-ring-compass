import { Link, useLocation, useRouter } from '@tanstack/react-router';
import { ArrowLeftIcon, CompassIcon, MapIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * App-wide 404 — the router's `defaultNotFoundComponent` (see router.tsx).
 * Themed to the Compass concept: a wanderer off the edge of the map, with the
 * attempted path and a way back.
 */
export function NotFound() {
  const router = useRouter();
  // `useLocation` is safe here (unlike `useLoaderData`); surface the path the
  // user actually tried so a mistyped/stale link is obvious.
  const pathname = useLocation({ select: (l) => l.pathname });

  return (
    <div className='flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center'>
      <div className='relative flex size-24 items-center justify-center'>
        <span className='absolute inset-0 rounded-full border border-dashed border-primary/30' />
        <span className='absolute inset-2 rounded-full bg-primary/5' />
        <CompassIcon className='size-10 text-primary' />
      </div>

      <div className='flex flex-col items-center gap-2'>
        <span className='text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase'>
          Error 404
        </span>
        <h1 className='text-3xl font-bold tracking-tight md:text-4xl'>Lost in the Lands Between</h1>
        <p className='max-w-md text-sm leading-relaxed text-muted-foreground md:text-base'>
          This path isn&apos;t on the map — it may have been moved, renamed, or never marked by a
          grace. Let&apos;s get you back to familiar ground.
        </p>
        {pathname && pathname !== '/' && (
          <code className='mt-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground'>
            {pathname}
          </code>
        )}
      </div>

      <div className='flex flex-wrap items-center justify-center gap-2'>
        <Button render={<Link to='/' />} nativeButton={false}>
          <MapIcon />
          Return to the map
        </Button>
        <Button
          variant='outline'
          onClick={() => {
            router.history.back();
          }}
        >
          <ArrowLeftIcon />
          Go back
        </Button>
      </div>
    </div>
  );
}
