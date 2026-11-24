import { Link } from '@tanstack/react-router';
import { Array as Arr } from 'effect';
import { ChevronDownIcon, CompassIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Outcome, type QuestProgress, StepState } from '@/lib/quests/progress';
import {
  type DeadlineEntry,
  type DeadlineGroup,
  splitDeadlines,
  hostileQuests,
  type NextUp,
  nextUp,
  type PendingDecision,
  pendingDecisions,
} from '@/lib/quests/view-model';

import { StepStateIcon } from './quest-status';

/** How many next steps show before "Show all". */
const NEXT_SHOWN = 4;
/** How many "you could miss" triggers show before "Show all". */
const SOON_SHOWN = 3;

/**
 * The top of the Quest Compass: what you could miss if you move on (grouped by the world action
 * that closes it), the choices you're standing at, and the next step of each questline under way.
 * Anything further out sits behind "Show all".
 */
export function UpNextPanel({
  quests,
}: {
  quests: ReadonlyArray<QuestProgress>;
}) {
  const split = splitDeadlines(quests);
  const soon = Arr.take(split.soon, SOON_SHOWN);
  const later = [...Arr.drop(split.soon, SOON_SHOWN), ...split.later];
  const decisions = pendingDecisions(
    Arr.filter(quests, (p) => Outcome.$is('InProgress')(p.outcome)),
  );
  const hostile = hostileQuests(quests);
  const next = nextUp(quests);
  const moreNext = Arr.drop(next, NEXT_SHOWN);
  const hidden = later.length + moreNext.length;

  return (
    <section
      aria-labelledby='up-next-heading'
      className='flex flex-col gap-4 rounded-xl border border-border bg-card p-4'
    >
      <header className='flex flex-col gap-0.5'>
        <h2
          id='up-next-heading'
          className='flex items-center gap-2 text-base font-semibold'
        >
          <CompassIcon className='size-4 text-muted-foreground' />
          Up next
        </h2>
        <p className='text-xs text-muted-foreground'>
          Your next steps, and anything you could miss if you move on.
        </p>
      </header>

      {Arr.isReadonlyArrayNonEmpty(hostile) && (
        <Group title='Hostile'>
          {Arr.map(hostile, (q) => (
            <li key={q.id} className='text-sm'>
              <QuestLink id={q.id}>{q.npc}</QuestLink>{' '}
              <span className='text-muted-foreground'>
                is hostile — absolve the sin at the Church of Vows to continue.
              </span>
            </li>
          ))}
        </Group>
      )}

      {Arr.isReadonlyArrayNonEmpty(soon) && (
        <Group title='You could miss'>
          {Arr.map(soon, (g) => (
            <DeadlineItem key={g.key} group={g} />
          ))}
        </Group>
      )}

      {Arr.isReadonlyArrayNonEmpty(decisions) && (
        <Group title='Choices ahead'>
          {Arr.map(decisions, (d) => (
            <DecisionItem key={`${d.quest.id}/${d.choice}`} decision={d} />
          ))}
        </Group>
      )}

      {Arr.isReadonlyArrayNonEmpty(next) && (
        <Group title='Next steps'>
          {Arr.map(Arr.take(next, NEXT_SHOWN), (n) => (
            <NextItem key={`${n.quest.id}/${n.step.id}`} item={n} />
          ))}
        </Group>
      )}

      {soon.length === 0 &&
        decisions.length === 0 &&
        hostile.length === 0 &&
        next.length === 0 && (
          <p className='text-sm text-muted-foreground'>
            Nothing pressing in the questlines shown.
          </p>
        )}

      {hidden > 0 && (
        <Collapsible>
          <CollapsibleTrigger className='group flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground'>
            <ChevronDownIcon className='size-3.5 transition-transform group-data-[panel-open]:rotate-180' />
            Show all ({hidden} more)
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-3 flex flex-col gap-4'>
            {Arr.isReadonlyArrayNonEmpty(moreNext) && (
              <Group title='More next steps'>
                {Arr.map(moreNext, (n) => (
                  <NextItem key={`${n.quest.id}/${n.step.id}`} item={n} />
                ))}
              </Group>
            )}
            {Arr.isReadonlyArrayNonEmpty(later) && (
              <Group title='Further down the line'>
                {Arr.map(later, (g) => (
                  <DeadlineItem key={g.key} group={g} />
                ))}
              </Group>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <h3 className='text-[11px] font-bold tracking-wider text-muted-foreground uppercase'>
        {title}
      </h3>
      <ul className='flex flex-col gap-2'>{children}</ul>
    </div>
  );
}

function QuestLink({
  id,
  step,
  children,
}: {
  id: string;
  step?: string | undefined;
  children: ReactNode;
}) {
  return (
    <Link
      to='/quests'
      search={{ quest: id }}
      {...(step === undefined ? {} : { hash: `step-${step}` })}
      className='font-medium underline-offset-2 hover:underline'
    >
      {children}
    </Link>
  );
}

const stakesText = (e: DeadlineEntry): string =>
  e.questline
    ? 'or the questline can’t be finished'
    : `or you’ll miss: ${Arr.join(e.rewards, ', ') || 'a side reward'}`;

/** "Before you light any Site of Grace in Liurnia": the steps it would close, per questline. */
function DeadlineItem({ group }: { group: DeadlineGroup }) {
  return (
    <li className='border-l-2 border-amber-500/40 pl-3 text-sm'>
      <div className='font-medium'>{group.heading}:</div>
      <ul className='mt-1 flex flex-col gap-1'>
        {Arr.map(group.entries, (e) => {
          const [first] = e.steps;
          return (
            <li key={e.quest.id}>
              <QuestLink id={e.quest.id} step={first?.step}>
                {e.quest.npc}
              </QuestLink>
              {first !== undefined && (
                <span className='text-muted-foreground'> — {first.label}</span>
              )}
              <span className='text-xs text-amber-700 dark:text-amber-300'>
                {' '}
                ({stakesText(e)})
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function DecisionItem({ decision }: { decision: PendingDecision }) {
  return (
    <li className='rounded-lg border border-border px-3 py-2 text-sm'>
      <QuestLink id={decision.quest.id}>{decision.quest.npc}</QuestLink>
      <span className='text-muted-foreground'> — {decision.label}</span>
      <ul className='mt-1 flex flex-col gap-0.5 text-xs'>
        {Arr.map(decision.options, (o) => (
          <li key={o.path}>
            <span className='font-medium'>{o.label}</span>
            {o.ending !== undefined && (
              <span className='text-muted-foreground'>
                {' '}
                (ending: {o.ending})
              </span>
            )}
            <span className='text-muted-foreground'>
              {Arr.isReadonlyArrayNonEmpty(o.locks)
                ? ` — closes off ${Arr.join(o.locks, ', ')}`
                : ''}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

function NextItem({ item }: { item: NextUp }) {
  const { quest, step, state } = item;
  return (
    <li className='flex items-start gap-2 text-sm'>
      <StepStateIcon state={state} className='mt-0.5' />
      <span>
        <QuestLink id={quest.id} step={step.id}>
          {quest.npc}
        </QuestLink>
        <span className='text-muted-foreground'> — {step.label}</span>
        {StepState.$is('Blocked')(state) && (
          <span className='block text-xs text-muted-foreground'>
            Waiting on: {Arr.join(state.needs, '; ')}
          </span>
        )}
      </span>
    </li>
  );
}
