import { Array as Arr, Option, String as Str } from 'effect';
import { ChevronRightIcon, MapPinIcon } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  type Choice,
  type Detour,
  flatten,
  Lock,
  type Path,
  QuestNode,
  type Requirement,
  type Step,
} from '@/lib/quests/model';
import {
  isFinished,
  isFrontier,
  Outcome,
  type QuestProgress,
  StepState,
  type Warning,
} from '@/lib/quests/progress';
import type { QuestReward } from '@/lib/quests/rewards';
import {
  beforePhrase,
  closesPhrase,
  lockedPhrase,
  lockTrigger,
  type PendingDecision,
  whereText,
} from '@/lib/quests/view-model';
import { cn } from '@/lib/utils';

import { StepRewardChips } from './quest-rewards';
import { StepStateIcon } from './quest-status';

type Deadline = Warning & { readonly _tag: 'Deadline' };

/** Everything a node needs to render, resolved once per questline. */
export interface TimelineContext {
  readonly progress: QuestProgress;
  readonly connected: boolean;
  readonly deadlinesByStep: ReadonlyMap<string, ReadonlyArray<Deadline>>;
  readonly decisionByChoice: ReadonlyMap<string, PendingDecision>;
  /** Deadline triggers an enclosing optional group already states ("Closes once you …"). */
  readonly covered: ReadonlySet<string>;
  /** Rendering inside an optional group, which explains its own lock once for all its steps. */
  readonly inDetour: boolean;
  /** What each step gives (items and unlocks), by step id. */
  readonly rewardsByStep: ReadonlyMap<string, ReadonlyArray<QuestReward>>;
}

const stateOf = (ctx: TimelineContext, id: string): StepState =>
  ctx.progress.states.get(id) ?? StepState.Upcoming();

/** The questline as a checklist, in order. */
export function Timeline({
  nodes,
  ctx,
}: {
  nodes: ReadonlyArray<QuestNode>;
  ctx: TimelineContext;
}) {
  return (
    <ol className='flex flex-col gap-3'>
      {Arr.map(nodes, (node) =>
        QuestNode.$match(node, {
          Step: (s) => <StepRow key={s.id} step={s} ctx={ctx} />,
          Detour: (d) => <DetourBlock key={d.id} detour={d} ctx={ctx} />,
          Choice: (c) => <ChoiceBlock key={c.id} choice={c} ctx={ctx} />,
        }),
      )}
    </ol>
  );
}

const afterText = (
  requires: ReadonlyArray<Requirement> | undefined,
): string | undefined =>
  requires === undefined || !Arr.isReadonlyArrayNonEmpty(requires)
    ? undefined
    : `After: ${Arr.join(
        Arr.map(requires, (r) => r.label),
        '; ',
      )}`;

/** One line of plain-English context under a step, if any. */
const stepHint = (
  state: StepState,
  step: Step,
  ctx: TimelineContext,
): string | undefined =>
  StepState.$match(state, {
    Done: () => undefined,
    Inferred: () => undefined,
    Available: () => undefined,
    Upcoming: () => afterText(step.requires),
    Blocked: ({ needs }) => `Waiting on: ${Arr.join(needs, '; ')}`,
    Locked: (l) => {
      const { outcome } = ctx.progress;
      if (Outcome.$is('LockedOut')(outcome) && outcome.step === step.id)
        return `This ended the questline. ${lockedPhrase(l)}`;
      // An optional group says once, for all its steps, what was missed.
      if (ctx.inDetour && l.by !== 'decision') return undefined;
      return lockedPhrase(l);
    },
    Unknown: () => 'May have been done — your save can’t confirm it.',
  });

function StepRow({ step, ctx }: { step: Step; ctx: TimelineContext }) {
  const state = stateOf(ctx, step.id);
  const done = ctx.connected && isFinished(state);
  const next = ctx.connected && isFrontier(state);
  const later =
    ctx.connected &&
    (StepState.$is('Upcoming')(state) ||
      StepState.$is('Locked')(state) ||
      StepState.$is('Unknown')(state));
  const where = whereText(step.where);
  const hint = ctx.connected
    ? stepHint(state, step, ctx)
    : afterText(step.requires);
  const waiting = ctx.connected && StepState.$is('Blocked')(state);
  const deadline = Arr.findFirst(
    ctx.deadlinesByStep.get(step.id) ?? [],
    (w) => !ctx.covered.has(w.before),
  );

  return (
    <li
      id={`step-${step.id}`}
      className={cn(
        'flex scroll-mt-20 items-start gap-2.5 rounded-lg',
        next && '-mx-2 bg-amber-500/5 px-2 py-1.5 ring-1 ring-amber-500/30',
      )}
    >
      {ctx.connected ? (
        <StepStateIcon state={state} className='mt-0.5' />
      ) : (
        <span className='mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/50' />
      )}
      <div className='flex min-w-0 flex-col gap-0.5'>
        <span
          className={cn(
            'text-sm leading-snug',
            next && 'font-semibold',
            done && 'text-muted-foreground',
            later && 'text-muted-foreground/80',
          )}
        >
          {step.label}
        </span>
        <StepRewardChips
          rewards={ctx.rewardsByStep.get(step.id) ?? []}
          muted={ctx.connected && StepState.$is('Locked')(state)}
        />
        {!done && hint !== undefined && (
          <span
            className={cn(
              'text-xs',
              waiting
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-muted-foreground',
            )}
          >
            {hint}
          </span>
        )}
        {!done && where !== undefined && (
          <span className='flex items-center gap-1 text-xs text-muted-foreground'>
            <MapPinIcon className='size-3 shrink-0' />
            {where}
            {step.reload === true && ' · then rest at a grace'}
          </span>
        )}
        {!done && Option.isSome(deadline) && (
          <span className='text-xs text-amber-700 dark:text-amber-300'>
            Do this{' '}
            {Str.uncapitalize(
              beforePhrase(deadline.value.before, deadline.value.gate),
            )}
            {deadline.value.stakes === 'questline'
              ? ', or the questline can’t be finished.'
              : `, or you’ll miss: ${deadline.value.reward ?? 'a side reward'}.`}
          </span>
        )}
        {!done && step.note !== undefined && (
          <span className='text-xs text-muted-foreground/80'>{step.note}</span>
        )}
      </div>
    </li>
  );
}

// ── Optional group ─────────────────────────────────────────────────────────────────────────────

function DetourBlock({
  detour,
  ctx,
}: {
  detour: Detour;
  ctx: TimelineContext;
}) {
  const states = Arr.map(flatten(detour.steps).steps, (s) =>
    stateOf(ctx, s.id),
  );
  const collected = ctx.connected && Arr.every(states, isFinished);
  const hasNext = ctx.connected && Arr.some(states, isFrontier);
  // Every step not yet done is locked: the reward is gone.
  const firstLocked = Arr.findFirst(states, StepState.$is('Locked'));
  const missed =
    ctx.connected &&
    !collected &&
    Option.isSome(firstLocked) &&
    Arr.every(states, (s) => isFinished(s) || StepState.$is('Locked')(s));
  const questlineGoesOn = !Outcome.$is('LockedOut')(ctx.progress.outcome);
  const status = collected
    ? 'Done'
    : missed && Option.isSome(firstLocked)
      ? `Missed: ${detour.reward}. ${lockedPhrase(firstLocked.value)}${
          questlineGoesOn ? ' The questline continues.' : ''
        }`
      : Arr.join(
          Arr.map(detour.lockedBy ?? [], (l) =>
            Lock.$is('When')(l)
              ? closesPhrase(l)
              : `Do it before you ${Str.uncapitalize(lockTrigger(l))}, or you’ll miss it.`,
          ),
          ' ',
        );

  return (
    <li>
      <Collapsible
        key={hasNext ? 'open' : 'closed'}
        defaultOpen={hasNext}
        className='rounded-lg border border-dashed border-border'
      >
        <CollapsibleTrigger className='group flex w-full items-start gap-2 px-3 py-2 text-left'>
          <ChevronRightIcon className='mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90' />
          <span className='flex min-w-0 flex-col gap-0.5'>
            <span className='text-sm'>
              <span className='text-muted-foreground'>Optional:</span>{' '}
              {detour.label}
              <span className='text-muted-foreground'> — {detour.reward}</span>
            </span>
            {status !== '' && (
              <span
                className={cn(
                  'text-xs',
                  collected
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : missed
                      ? 'text-muted-foreground'
                      : 'text-amber-700/90 dark:text-amber-300/90',
                )}
              >
                {status}
              </span>
            )}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className='px-3 pb-3'>
          <Timeline
            nodes={detour.steps}
            ctx={{
              ...ctx,
              inDetour: true,
              covered: new Set([
                ...ctx.covered,
                ...Arr.map(detour.lockedBy ?? [], lockTrigger),
              ]),
            }}
          />
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

// ── Choice ─────────────────────────────────────────────────────────────────────────────────────

function ChoiceBlock({
  choice,
  ctx,
}: {
  choice: Choice;
  ctx: TimelineContext;
}) {
  const chosenId = ctx.progress.chosen.get(choice.id);
  const pending = ctx.decisionByChoice.get(choice.id);
  return (
    <li className='flex flex-col gap-2 rounded-lg border border-border p-3'>
      <span className='text-sm'>
        <span className='font-semibold'>Choose one:</span> {choice.label}
      </span>
      <div className='flex flex-col gap-3'>
        {Arr.map(choice.paths, (p) => (
          <PathOption
            key={p.id}
            path={p}
            ctx={ctx}
            taken={chosenId === p.id}
            notTaken={chosenId !== undefined && chosenId !== p.id}
            locks={
              Option.getOrUndefined(
                Option.flatMap(Option.fromNullishOr(pending), (d) =>
                  Arr.findFirst(d.options, (o) => o.path === p.id),
                ),
              )?.locks
            }
          />
        ))}
      </div>
    </li>
  );
}

function PathOption({
  path,
  ctx,
  taken,
  notTaken,
  locks,
}: {
  path: Path;
  ctx: TimelineContext;
  taken: boolean;
  notTaken: boolean;
  locks: ReadonlyArray<string> | undefined;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-l-2 pl-3',
        taken ? 'border-emerald-500/60' : 'border-border',
        notTaken && 'opacity-60',
      )}
    >
      <span className='text-sm'>
        <span className='font-medium'>{path.label}</span>
        {path.ending !== undefined && (
          <span className='text-muted-foreground'>
            {' '}
            — ending: {path.ending}
          </span>
        )}
        {taken && (
          <span className='text-emerald-700 dark:text-emerald-300'>
            {' '}
            · your choice
          </span>
        )}
        {notTaken && (
          <span className='text-muted-foreground'> · not chosen</span>
        )}
      </span>
      {locks !== undefined && Arr.isReadonlyArrayNonEmpty(locks) && (
        <span className='text-xs text-amber-700 dark:text-amber-300'>
          Closes off: {Arr.join(locks, ', ')}
        </span>
      )}
      {!notTaken && Arr.isReadonlyArrayNonEmpty(path.steps) && (
        <Timeline nodes={path.steps} ctx={ctx} />
      )}
    </div>
  );
}
