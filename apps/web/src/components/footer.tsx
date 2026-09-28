import { CircleDotIcon, StarIcon, SwordIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useAtom, useAtomValue } from '@effect/atom-react';
import { Data, Effect, Option, Predicate, Schema } from 'effect';
import { HttpClient, HttpClientResponse } from 'effect/http';
import { Atom } from 'effect/reactivity';
import * as AsyncResult from 'effect/reactivity/AsyncResult';

import { REPO_URL } from '@/components/shell/nav';
import { appRuntime } from '@/lib/atoms/runtime';
import { equipmentDbView } from '@/lib/vm/equipement';
import { eventsDbView } from '@/lib/vm/events';
import { inventoryDbView } from '@/lib/vm/inventory';
import { regionsDbView } from '@/lib/vm/regions';
import { statsDbView } from '@/lib/vm/stats';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { Button } from './ui/button';
import { Spinner } from './ui/spinner';

export function Footer() {
  const stars = useGithubStars();
  return (
    <footer className='flex flex-col gap-4 border-t border-border px-4 pt-6 pb-7 md:px-7'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex max-w-lg flex-col gap-1.5'>
          <div className='flex items-center gap-2 text-[15px] font-bold'>
            <SwordIcon className='size-4' />
            Elden Ring Compass
          </div>
          <p className='text-[12.5px] leading-relaxed text-muted-foreground'>
            A free, open-source, read-only save analyzer for Elden Ring — it runs entirely in your
            browser and your save never leaves your device.
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button
            variant='outline'
            size='sm'
            nativeButton={false}
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
            {stars !== null && (
              <span className='font-mono text-muted-foreground tabular-nums'>
                {stars.toLocaleString()}
              </span>
            )}
          </Button>
          <Button
            variant='outline'
            size='sm'
            nativeButton={false}
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

      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground'>
        <span className='flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1'>
          Read-only · your save never leaves your device
        </span>
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

/** The one field read from GitHub's `GET /repos/{owner}/{repo}` response. */
const GithubRepo = Schema.Struct({ stargazers_count: Schema.Number });

// REPO_URL = https://github.com/<owner>/<repo>
const REPO_SLUG = REPO_URL.replace(/^https?:\/\/github\.com\//, '');

/**
 * Live GitHub star count for the repo, fetched client-side (unauthenticated, so
 * subject to GitHub's 60 req/hr/IP limit — fine for a footer). Client-only: SSR
 * renders the initial state rather than spending the server's rate limit.
 */
const githubStarsAtom = appRuntime
  .atom(
    HttpClient.get(`https://api.github.com/repos/${REPO_SLUG}`).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GithubRepo)),
      Effect.map((repo) => repo.stargazers_count),
    ),
  )
  .pipe(Atom.withServerValueInitial);

/**
 * The star count, or null until loaded or on any failure (offline, rate limit),
 * so the Star button just omits the number.
 */
function useGithubStars(): number | null {
  const result = useAtomValue(githubStarsAtom);
  return AsyncResult.isSuccess(result) ? result.value : null;
}

function uint8ArrayToBase64(uint8Array: Uint8Array) {
  let binary = '';
  for (const byte of uint8Array) {
    binary += String.fromCodePoint(byte);
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

/** JSON.stringify replacer: the save's bigint fields (e.g. Steam ids) serialize as strings. */
const bigintToString = (_key: string, value: unknown): unknown =>
  Predicate.isBigInt(value) ? value.toString() : value;

type SaveSlot = NonNullable<ReturnType<typeof useSelectedSlot>>;

class CopySaveAsJsonError extends Data.TaggedError('CopySaveAsJsonError')<{
  readonly message: string;
  readonly cause: unknown;
}> {}

/** The selected slot's view-models, in the shape the "Copy Save as JSON" button exports. */
const saveSlotJson = (slot: SaveSlot) =>
  JSON.stringify(
    {
      stats: statsDbView(slot),
      regions: regionsDbView(slot)[0],
      events: {
        known_events: eventsDbView(slot),
        event_buffer: uint8ArrayToBase64(trimTrailingZeros(slot.event_flags.flags)),
      },
      inventory: inventoryDbView(slot).items,
      equipment: equipmentDbView(slot),
    },
    bigintToString,
    2,
  );

/**
 * Mutation: serialize the slot and write it to the clipboard. Its AsyncResult is the
 * button's whole state — `waiting` while running, the typed failure, or success (✔
 * until the next copy).
 */
const copySaveAsJsonAtom = appRuntime.fn((slot: SaveSlot) =>
  Effect.gen(function* () {
    const json = yield* Effect.try({
      try: () => saveSlotJson(slot),
      catch: (cause) => new CopySaveAsJsonError({ message: 'Could not serialize the save', cause }),
    });
    yield* Effect.tryPromise({
      try: () => navigator.clipboard.writeText(json),
      catch: (cause) =>
        new CopySaveAsJsonError({ message: 'Could not write to the clipboard', cause }),
    });
  }),
);

function CopySaveAsJsonButton() {
  const slot = useSelectedSlot();
  const [result, copy] = useAtom(copySaveAsJsonAtom);
  const error = Option.getOrUndefined(AsyncResult.error(result));

  return (
    <Button
      variant='outline'
      size='sm'
      disabled={!slot || result.waiting}
      onClick={() => {
        if (slot) copy(slot);
      }}
    >
      {result.waiting && <Spinner />}
      {AsyncResult.isSuccess(result) && <span className='text-green-500'>✔</span>}
      {error ? error.message : 'Copy Save as JSON'}
    </Button>
  );
}
