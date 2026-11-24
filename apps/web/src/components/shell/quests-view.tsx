import { Link } from '@tanstack/react-router';
import { Array as Arr, Option } from 'effect';
import { ArrowLeftIcon, ListChecksIcon } from 'lucide-react';

import { ConnectSaveButton } from '@/components/misc/save-file-source-selector';
import { EndingsSection } from '@/components/quests/endings-section';
import { QuestDetail } from '@/components/quests/quest-detail';
import { QuestList } from '@/components/quests/quest-list';
import { UpNextPanel } from '@/components/quests/up-next-panel';
import { useQuestCompass } from '@/lib/quests/use-quest-progress';
import { cn } from '@/lib/utils';

/**
 * Quest Compass: the save-aware NPC questline tracker. "Up next" (next steps, what you could miss,
 * open choices) and the endings lead; below them, the questline list and the selected one's
 * checklist. With no save loaded the same page is a static guide.
 *
 * `quest` is the `?quest=` search param. On small screens it switches between the list (unset)
 * and the detail (set); on large screens both show side by side and an unset param shows the
 * first questline.
 */
export function QuestsView({ quest }: { quest: string | undefined }) {
  const { connected, shown, endings } = useQuestCompass();
  const picked = Arr.findFirst(shown, (p) => p.quest.id === quest);
  const selected = Option.isSome(picked) ? picked : Arr.head(shown);
  const showDetail = Option.isSome(picked);

  return (
    <div className='flex flex-col gap-5'>
      {connected ? (
        <UpNextPanel quests={shown} />
      ) : (
        <div className='flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm'>
          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent'>
            <ListChecksIcon className='size-4' />
          </span>
          <span className='min-w-0 flex-1'>
            <span className='font-medium'>Questline guide.</span>{' '}
            <span className='text-muted-foreground'>
              Connect a save to see where you are in each questline and what you
              could miss if you move on.
            </span>
          </span>
          <ConnectSaveButton variant='outline' size='sm' />
        </div>
      )}

      <EndingsSection
        endings={endings}
        connected={connected}
        linkable={new Set(Arr.map(shown, (p) => p.quest.id))}
      />

      <div className='grid gap-5 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:items-start'>
        <QuestList
          quests={shown}
          selected={Option.getOrUndefined(selected)?.quest.id}
          connected={connected}
          className={cn(
            'lg:sticky lg:top-0 lg:max-h-[calc(100svh-9rem)]',
            showDetail && 'hidden lg:flex',
          )}
        />
        <div
          className={cn(
            'flex min-w-0 flex-col gap-3',
            !showDetail && 'hidden lg:flex',
          )}
        >
          {showDetail && (
            <Link
              to='/quests'
              search={{}}
              className='flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:hidden'
            >
              <ArrowLeftIcon className='size-4' /> All questlines
            </Link>
          )}
          {Option.match(selected, {
            onNone: () => (
              <p className='text-sm text-muted-foreground'>
                No questlines in this scope yet.
              </p>
            ),
            onSome: (p) => (
              <QuestDetail
                key={p.quest.id}
                progress={p}
                connected={connected}
              />
            ),
          })}
        </div>
      </div>
    </div>
  );
}
