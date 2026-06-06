import { CircleDotIcon, StarIcon, SwordIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { GithubIcon } from '@/components/shell/github-icon';
import { REPO_URL } from '@/components/shell/nav';
import { equipmentDbView } from '@/lib/vm/equipement';
import { eventsDbView } from '@/lib/vm/events';
import { inventoryDbView } from '@/lib/vm/inventory';
import { regionsDbView } from '@/lib/vm/regions';
import { statsDbView } from '@/lib/vm/stats';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { Button } from './ui/button';
import { Spinner } from './ui/spinner';

export function Footer() {
  return (
    <footer className='flex flex-col gap-5 border-t border-border px-4 pt-7 pb-9 md:px-7'>
      <div className='flex flex-wrap items-start justify-between gap-5'>
        <div className='flex max-w-lg flex-col gap-2'>
          <div className='flex items-center gap-2 text-[15px] font-bold'>
            <SwordIcon className='size-4' />
            Elden Ring Compass
          </div>
          <p className='text-[12.5px] leading-relaxed text-muted-foreground'>
            A free, open-source, read-only save analyzer for Elden Ring. It runs entirely in your
            browser — your save never leaves your device. Built by the community; contributions and
            data fixes are welcome.
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button
            size='sm'
            render={
              <a href={REPO_URL} target='_blank' rel='noreferrer' aria-label='View on GitHub' />
            }
          >
            <GithubIcon />
            View on GitHub
          </Button>
          <Button
            variant='outline'
            size='sm'
            render={
              <a
                href={`${REPO_URL}/stargazers`}
                target='_blank'
                rel='noreferrer'
                aria-label='Star on GitHub'
              />
            }
          >
            <StarIcon />
            Star
          </Button>
          <Button
            variant='outline'
            size='sm'
            render={
              <a
                href={`${REPO_URL}/issues/new`}
                target='_blank'
                rel='noreferrer'
                aria-label='Open an issue'
              />
            }
          >
            <CircleDotIcon />
            Open an issue
          </Button>
          <CopySaveAsJsonButton />
        </div>
      </div>

      <div className='flex flex-wrap gap-2 text-[11.5px] text-muted-foreground'>
        <span className='flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1'>
          <GithubIcon className='size-3.5' /> Open source
        </span>
        <span className='flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1'>
          Read-only · your save never leaves your device
        </span>
      </div>

      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground'>
        <span>Built on the work of the open-source Elden Ring community.</span>
        <Link
          to='/credits'
          className='font-medium text-foreground underline underline-offset-2 hover:decoration-2'
        >
          See all credits &amp; acknowledgements
        </Link>
        <span className='size-[3px] rounded-full bg-muted-foreground/50' />
        <span>Not affiliated with FromSoftware or Bandai Namco.</span>
      </div>
    </footer>
  );
}

function CopySaveAsJsonButton() {
  const slot = useSelectedSlot();
  const [recentSuccess, setRecentSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleCopy = async () => {
    if (!slot) return;
    setIsPending(true);
    setError(null);
    try {
      const equipmentVm = equipmentDbView(slot);
      const eventsVm = eventsDbView(slot);
      const inventoryVm = inventoryDbView(slot);
      const regionsVm = regionsDbView(slot);
      const statsVm = statsDbView(slot);

      function uint8ArrayToBase64(uint8Array: Uint8Array) {
        let binary = '';
        for (const byte of uint8Array) {
          binary += String.fromCharCode(byte);
        }
        return btoa(binary);
      }

      function trimTrailingZeros(uint8Array: Readonly<Uint8Array>) {
        let endIndex = uint8Array.length - 1;
        while (endIndex >= 0 && uint8Array[endIndex] === 0) {
          endIndex--;
        }
        return uint8Array.slice(0, endIndex + 1);
      }

      const result = {
        stats: statsVm,
        regions: regionsVm[0],
        events: {
          known_events: eventsVm,
          event_buffer: uint8ArrayToBase64(trimTrailingZeros(slot.event_flags.flags)),
        },
        inventory: inventoryVm.items,
        equipment: equipmentVm,
      };

      await navigator.clipboard.writeText(
        JSON.stringify(
          result,
          (_, value) => (typeof value === 'bigint' ? value.toString() : value),
          2,
        ),
      );
      setRecentSuccess(true);
      setTimeout(() => {
        setRecentSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant='outline'
      size='sm'
      disabled={!slot || isPending}
      onClick={() => void handleCopy()}
    >
      {isPending && <Spinner />}
      {recentSuccess && <span className='text-green-500'>✔</span>}
      {error ? error.message : 'Copy Save as JSON'}
    </Button>
  );
}
