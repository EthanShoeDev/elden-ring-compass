import { Link } from '@tanstack/react-router';
import { Array as Arr } from 'effect';
import { SearchIcon } from 'lucide-react';
import { useState } from 'react';

import { DlcTag } from '@/components/misc/dlc-tag';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { QuestProgress } from '@/lib/quests/progress';
import {
  matchesSearch,
  OUTCOME_KEYS,
  OUTCOME_LABEL,
  type OutcomeKey,
  warningSummary,
} from '@/lib/quests/view-model';
import { cn } from '@/lib/utils';

import { OutcomeChip } from './quest-status';

type Filter = OutcomeKey | 'all';

const isFilter = (v: unknown): v is Filter =>
  v === 'all' || Arr.contains(OUTCOME_KEYS, v);

/** Searchable, outcome-filterable list of questlines; each row links to `?quest=`. */
export function QuestList({
  quests,
  selected,
  connected,
  className,
}: {
  quests: ReadonlyArray<QuestProgress>;
  selected: string | undefined;
  connected: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const countOf = (k: OutcomeKey) =>
    Arr.filter(quests, (p) => p.outcome._tag === k).length;
  const rows = Arr.filter(
    quests,
    (p) =>
      matchesSearch(p.quest, query) &&
      (!connected || filter === 'all' || p.outcome._tag === filter),
  );

  return (
    <nav
      aria-label='Questlines'
      className={cn('flex min-h-0 flex-col gap-3', className)}
    >
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          aria-label='Search questlines'
          placeholder='Search NPCs…'
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
        />
      </InputGroup>

      {connected && (
        <ToggleGroup
          aria-label='Filter by outcome'
          variant='outline'
          size='sm'
          spacing={1}
          className='flex-wrap'
          value={[filter]}
          onValueChange={(v) => {
            const next = v.at(-1);
            setFilter(isFilter(next) ? next : 'all');
          }}
        >
          <ToggleGroupItem
            value='all'
            className='px-2 text-xs aria-pressed:border-primary/60 aria-pressed:bg-primary/10'
          >
            All {quests.length}
          </ToggleGroupItem>
          {Arr.map(OUTCOME_KEYS, (k) => (
            <ToggleGroupItem
              key={k}
              value={k}
              className='px-2 text-xs aria-pressed:border-primary/60 aria-pressed:bg-primary/10'
            >
              {OUTCOME_LABEL[k]} {countOf(k)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      <ul className='flex min-h-0 flex-col gap-1 overflow-y-auto'>
        {Arr.map(rows, (p) => (
          <QuestRow
            key={p.quest.id}
            progress={p}
            active={p.quest.id === selected}
            connected={connected}
          />
        ))}
        {rows.length === 0 && (
          <li className='px-2 py-6 text-center text-sm text-muted-foreground'>
            No questlines match.
          </li>
        )}
      </ul>
    </nav>
  );
}

function QuestRow({
  progress,
  active,
  connected,
}: {
  progress: QuestProgress;
  active: boolean;
  connected: boolean;
}) {
  const { quest } = progress;
  const warnings = warningSummary(progress);
  const pct =
    progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);
  return (
    <li>
      <Link
        to='/quests'
        search={{ quest: quest.id }}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-col gap-1 rounded-lg border px-3 py-2 transition-colors',
          active
            ? 'border-primary/40 bg-accent'
            : 'border-transparent hover:bg-muted/60',
        )}
      >
        <span className='flex items-center gap-2'>
          <span className='truncate text-sm font-medium'>{quest.npc}</span>
          {quest.isDlc && <DlcTag />}
          {connected && warnings.active > 0 && (
            <span
              title='Something here needs attention'
              className='ml-auto size-2 shrink-0 rounded-full bg-amber-500'
            />
          )}
        </span>
        {connected && (
          <span className='flex items-center gap-2'>
            <OutcomeChip
              outcome={progress.outcome}
              className='h-4 text-[10px]'
            />
            <span className='ml-auto text-[11px] text-muted-foreground'>
              {progress.done}/{progress.total}
            </span>
            <span className='h-1 w-12 overflow-hidden rounded-full bg-muted'>
              <span
                className='block h-full bg-primary'
                style={{ width: `${String(pct)}%` }}
              />
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}
