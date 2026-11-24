import { Link } from '@tanstack/react-router';
import { Array as Arr } from 'effect';
import { InfoIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { type EndingProgress, EndingState } from '@/lib/quests/endings';
import { npcName } from '@/lib/quests/view-model';
import { cn } from '@/lib/utils';

interface Status {
  readonly text: string;
  readonly className: string;
}

const statusOf = (
  { ending, state }: EndingProgress,
  connected: boolean,
): Status =>
  EndingState.$match(state, {
    Secured: () => ({
      text: 'Secured',
      className: 'text-emerald-700 dark:text-emerald-300',
    }),
    InProgress: ({ done, total, next }) => ({
      text: `In progress — ${String(done)}/${String(total)}${
        next[0] === undefined ? '' : `, next: ${next[0]}`
      }`,
      className: 'text-amber-700 dark:text-amber-300',
    }),
    Available: () => ({
      text:
        ending.quest === undefined
          ? 'Always available'
          : `${connected ? 'Not started — follow' : 'Follow'} ${npcName(ending.quest)}’s questline`,
      className: 'text-muted-foreground',
    }),
    LockedOut: ({ reason }) => ({
      text: `Locked out — ${reason}`,
      className: 'text-muted-foreground',
    }),
    Overridden: () => ({
      text: 'Blocked by the Frenzied Flame (cure it with Miquella’s Needle)',
      className: 'text-muted-foreground',
    }),
  });

/**
 * The six endings and how close the save is to each. A card opens the questline that leads to its
 * ending; hovering shows how to secure it.
 */
export function EndingsSection({
  endings,
  connected,
  linkable,
}: {
  endings: ReadonlyArray<EndingProgress>;
  connected: boolean;
  /** Questline ids the detail view can show (written, in scope). */
  linkable: ReadonlySet<string>;
}) {
  return (
    <section aria-labelledby='endings-heading' className='flex flex-col gap-2'>
      <h2
        id='endings-heading'
        className='text-[11px] font-bold tracking-wider text-muted-foreground uppercase'
      >
        Endings
      </h2>
      <ul className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6'>
        {Arr.map(endings, (e) => {
          const status = statusOf(e, connected);
          const quest = e.ending.quest;
          const card = (
            <>
              <span className='text-sm font-medium'>{e.ending.name}</span>
              <span className={cn('line-clamp-2 text-xs', status.className)}>
                {status.text}
              </span>
            </>
          );
          return (
            <li key={e.ending.id}>
              <EndingCard
                name={e.ending.name}
                how={e.ending.how}
                quest={
                  quest !== undefined && linkable.has(quest) ? quest : undefined
                }
              >
                {card}
              </EndingCard>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * One ending: the card opens its questline (when shown); the info button explains how to secure
 * it — on hover, or on tap for touch screens.
 */
function EndingCard({
  name,
  how,
  quest,
  children,
}: {
  name: string;
  how: string;
  quest: string | undefined;
  children: ReactNode;
}) {
  const body = 'flex h-full flex-col gap-1 py-2 pr-8 pl-3 text-left';
  return (
    <div
      className={cn(
        'relative h-full rounded-lg border border-border bg-card',
        quest !== undefined && 'transition-colors hover:bg-muted/60',
      )}
    >
      {quest === undefined ? (
        <div className={body}>{children}</div>
      ) : (
        <Link to='/quests' search={{ quest }} className={body}>
          {children}
        </Link>
      )}
      <Popover>
        <PopoverTrigger
          openOnHover
          aria-label={`How to get ${name}`}
          className='absolute top-1.5 right-1.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground'
        >
          <InfoIcon className='size-3.5' />
        </PopoverTrigger>
        <PopoverContent className='text-xs'>{how}</PopoverContent>
      </Popover>
    </div>
  );
}
