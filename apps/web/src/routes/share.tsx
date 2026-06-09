import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { decodeFromUrl } from '@/lib/share/decode';

type ShareSearchParams = {
  d?: string;
};

export const Route = createFileRoute('/share')({
  validateSearch: (search: Record<string, unknown>): ShareSearchParams => ({
    d: typeof search.d === 'string' ? search.d : undefined,
  }),
  component: SharePage,
});

function SharePage() {
  const { d } = useSearch({ from: '/share' });
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!d) {
      setError('No share data provided');
      return;
    }

    const data = decodeFromUrl(d);
    if (!data) {
      setError('Invalid or corrupted share data');
      return;
    }

    // Back-compat: old links used /share?d=. The root route now owns the global
    // ?save= param and retains it across navigation.
    void navigate({ to: '/', search: { save: d } });
  }, [d, navigate]);

  if (error) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-8'>
        <div className='text-destructive text-lg font-semibold'>
          Failed to load shared progression
        </div>
        <p className='text-muted-foreground'>{error}</p>
        <button
          type='button'
          onClick={() => navigate({ to: '/' })}
          className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2'
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className='flex flex-1 items-center justify-center'>
      <div className='text-muted-foreground'>Loading shared progression...</div>
    </div>
  );
}
