import { Array as Arr } from 'effect';
import { GiftIcon, KeyRoundIcon } from 'lucide-react';
import { useState } from 'react';

import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type QuestProgress, StepState } from '@/lib/quests/progress';
import { type QuestReward, questRewards } from '@/lib/quests/rewards';
import { cn } from '@/lib/utils';

import { type RewardLook, rewardLook } from './quest-look';

const lookOf = (p: QuestProgress, r: QuestReward): RewardLook =>
  rewardLook(p.states.get(r.step.id) ?? StepState.Upcoming());

/** Item icon, or a neutral glyph when the reward has none (or isn't an item). */
function RewardIcon({
  reward,
  className,
}: {
  reward: QuestReward;
  className?: string;
}) {
  const icon = reward.item?.iconUrl;
  if (icon !== undefined && icon !== '')
    return (
      <img
        src={icon}
        alt=''
        loading='lazy'
        className={cn('shrink-0 object-contain', className)}
      />
    );
  const Glyph = reward.kind === 'unlock' ? KeyRoundIcon : GiftIcon;
  return (
    <Glyph
      aria-hidden
      className={cn('shrink-0 p-0.5 text-muted-foreground', className)}
    />
  );
}

function RewardName({ reward }: { reward: QuestReward }) {
  const url = reward.item?.wikiUrl;
  return url === undefined ? (
    <span>{reward.name}</span>
  ) : (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className='underline-offset-2 hover:underline'
    >
      {reward.name}
    </a>
  );
}

/** "Obtained" / "Next" / "Later" / "Missed" (with its reason on hover). */
function RewardStatus({ look }: { look: RewardLook }) {
  if (look.reason === undefined)
    return <span className={look.className}>{look.label}</span>;
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span />}
        className={cn(
          'cursor-help underline decoration-dotted',
          look.className,
        )}
      >
        {look.label}
      </TooltipTrigger>
      <TooltipContent className='max-w-72'>{look.reason}</TooltipContent>
    </Tooltip>
  );
}

/** What the questline gives, with how far along the save is to each reward. */
export function RewardsSection({
  progress,
  connected,
}: {
  progress: QuestProgress;
  connected: boolean;
}) {
  const [stillOpen, setStillOpen] = useState(false);
  const all = questRewards(progress.quest);
  if (!Arr.isReadonlyArrayNonEmpty(all)) return null;
  const shown =
    connected && stillOpen
      ? Arr.filter(all, (r) => {
          const look = lookOf(progress, r);
          return !look.obtained && !look.missed;
        })
      : all;
  const items = Arr.filter(shown, (r) => r.kind === 'item');
  const unlocks = Arr.filter(shown, (r) => r.kind === 'unlock');

  return (
    <section aria-labelledby='rewards-heading' className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3
          id='rewards-heading'
          className='text-[11px] font-bold tracking-wider text-muted-foreground uppercase'
        >
          Rewards
        </h3>
        {connected && (
          <span className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Switch
              size='sm'
              aria-label='Only what I can still get'
              checked={stillOpen}
              onCheckedChange={setStillOpen}
            />
            Only what I can still get
          </span>
        )}
      </div>

      {Arr.isReadonlyArrayNonEmpty(items) && (
        <ul className='grid gap-2 sm:grid-cols-2'>
          {Arr.map(items, (r) => {
            const look = lookOf(progress, r);
            return (
              <li
                key={`${r.step.id}/${r.name}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-1.5',
                  connected && look.missed && 'opacity-60',
                )}
              >
                <RewardIcon reward={r} className='size-9' />
                <span className='flex min-w-0 flex-col text-sm'>
                  <RewardName reward={r} />
                  <span className='text-xs text-muted-foreground'>
                    {connected && <RewardStatus look={look} />}
                    {connected && r.detour !== undefined && ' · '}
                    {r.detour !== undefined && 'optional'}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {Arr.isReadonlyArrayNonEmpty(unlocks) && (
        <ul className='flex flex-col gap-1 text-sm'>
          {Arr.map(unlocks, (r) => {
            const look = lookOf(progress, r);
            return (
              <li
                key={`${r.step.id}/${r.name}`}
                className={cn(
                  'flex flex-wrap items-center gap-x-2',
                  connected && look.missed && 'opacity-60',
                )}
              >
                <KeyRoundIcon
                  aria-hidden
                  className='size-3.5 text-muted-foreground'
                />
                <span>Unlocks {r.name}</span>
                <span className='text-xs text-muted-foreground'>
                  {connected && <RewardStatus look={look} />}
                  {connected && r.detour !== undefined && ' · '}
                  {r.detour !== undefined && 'optional'}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {connected && shown.length === 0 && (
        <p className='text-xs text-muted-foreground'>
          Nothing left to get here — every reward is obtained or missed.
        </p>
      )}
    </section>
  );
}

/** Small chips under a timeline step for what that step gives. */
export function StepRewardChips({
  rewards,
  muted,
}: {
  rewards: ReadonlyArray<QuestReward>;
  muted: boolean;
}) {
  if (!Arr.isReadonlyArrayNonEmpty(rewards)) return null;
  return (
    <span
      className={cn('flex flex-wrap gap-1.5 pt-0.5', muted && 'opacity-60')}
    >
      {Arr.map(rewards, (r) => (
        <span
          key={r.name}
          className='inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 py-0.5 pr-2 pl-0.5 text-[11px]'
        >
          <RewardIcon reward={r} className='size-4' />
          {r.kind === 'unlock' ? `Unlocks ${r.name}` : r.name}
        </span>
      ))}
    </span>
  );
}
