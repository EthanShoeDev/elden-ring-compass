import { Array as Arr } from 'effect';
import type { ReactNode } from 'react';

import { DlcTag } from '@/components/misc/dlc-tag';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Outcome, type QuestProgress, Warning } from '@/lib/quests/progress';
import { questRewards } from '@/lib/quests/rewards';
import {
  deadlinesOf,
  pendingDecisions,
  stepLabel,
} from '@/lib/quests/view-model';
import { cn } from '@/lib/utils';

import { TONE } from './quest-look';
import { RewardsSection } from './quest-rewards';
import { OutcomeChip, WikiLinks } from './quest-status';
import { Timeline, type TimelineContext } from './quest-timeline';

/** One questline: header, why it can't be finished (if so), and its checklist. */
export function QuestDetail({
  progress,
  connected,
}: {
  progress: QuestProgress;
  connected: boolean;
}) {
  const { quest, outcome } = progress;
  const deadlines = deadlinesOf(progress);
  const rewards = questRewards(quest);
  const ctx: TimelineContext = {
    progress,
    connected,
    covered: new Set(),
    inDetour: false,
    rewardsByStep: new Map(
      Arr.map(
        Arr.dedupe(Arr.map(rewards, (r) => r.step.id)),
        (id) => [id, Arr.filter(rewards, (r) => r.step.id === id)] as const,
      ),
    ),
    deadlinesByStep: new Map(
      Arr.map(
        Arr.dedupe(Arr.map(deadlines, (w) => w.step)),
        (id) => [id, Arr.filter(deadlines, (w) => w.step === id)] as const,
      ),
    ),
    decisionByChoice: new Map(
      Arr.map(pendingDecisions([progress]), (d) => [d.choice, d] as const),
    ),
  };
  const hostile = Arr.some(progress.warnings, Warning.$is('Hostile'));

  return (
    <Card className='gap-5'>
      <CardHeader className='gap-2'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
          <h2 className='text-xl font-semibold'>{quest.npc}</h2>
          {quest.isDlc && <DlcTag />}
          {connected && <OutcomeChip outcome={outcome} />}
          <span className='ml-auto'>
            <WikiLinks questId={quest.id} />
          </span>
        </div>
        <p className='max-w-prose text-sm text-muted-foreground'>
          {quest.blurb}
        </p>
        {connected && progress.total > 0 && (
          <Progress
            value={Math.round((progress.done / progress.total) * 100)}
            aria-label='Questline progress'
            className='max-w-xs items-center gap-2'
          >
            <span className='order-last text-xs whitespace-nowrap text-muted-foreground'>
              {progress.done} of {progress.total} steps
            </span>
          </Progress>
        )}
      </CardHeader>

      <CardContent className='flex flex-col gap-4'>
        {connected && Outcome.$is('LockedOut')(outcome) && (
          <Note tone='danger' title='This questline can’t be finished'>
            {outcome.reason}
            {outcome.step !== undefined &&
              ` — “${stepLabel(quest, outcome.step)}” can no longer happen.`}
          </Note>
        )}
        {connected && hostile && (
          <Note tone='next' title={`${quest.npc} is hostile`}>
            Absolve the sin at the Church of Vows to continue the questline.
          </Note>
        )}
        <RewardsSection progress={progress} connected={connected} />
        <Timeline nodes={quest.steps} ctx={ctx} />
      </CardContent>
    </Card>
  );
}

function Note({
  tone,
  title,
  children,
}: {
  tone: 'danger' | 'next';
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-lg border px-3 py-2',
        TONE[tone],
      )}
    >
      <span className='text-sm font-semibold'>{title}</span>
      <span className='text-sm text-foreground/80'>{children}</span>
    </div>
  );
}
