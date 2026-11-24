import { Array as Arr } from 'effect';
import { ExternalLinkIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Outcome, type StepState } from '@/lib/quests/progress';
import { OUTCOME_LABEL } from '@/lib/quests/view-model';
import { questWikiLinks } from '@/lib/quests/wiki';
import { cn } from '@/lib/utils';

import { outcomeTone, stateLook, TONE } from './quest-look';

export function OutcomeChip({
  outcome,
  className,
}: {
  outcome: Outcome;
  className?: string;
}) {
  const ending = Outcome.$is('Completed')(outcome) ? outcome.ending : undefined;
  return (
    <Badge
      variant='outline'
      className={cn(TONE[outcomeTone(outcome)], className)}
    >
      {OUTCOME_LABEL[outcome._tag]}
      {ending !== undefined && ` · ${ending}`}
    </Badge>
  );
}

export function StepStateIcon({
  state,
  className,
}: {
  state: StepState;
  className?: string;
}) {
  const look = stateLook(state);
  const Icon = look.icon;
  return (
    <Icon
      aria-label={look.label}
      className={cn('size-4 shrink-0', look.className, className)}
    />
  );
}

/** "Wiki ↗" links to the questline's NPC page(s), opened in a new tab. */
export function WikiLinks({ questId }: { questId: string }) {
  const links = questWikiLinks(questId);
  return (
    <span className='flex flex-wrap items-center gap-x-3 gap-y-1'>
      {Arr.map(links, (l) => (
        <a
          key={l.url}
          href={l.url}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
        >
          {links.length > 1 ? `${l.label} wiki` : 'Wiki'}
          <ExternalLinkIcon className='size-3' />
        </a>
      ))}
    </span>
  );
}
