import {
  CircleCheckBigIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleIcon,
  LockIcon,
  type LucideIcon,
} from 'lucide-react';

import { Outcome, StepState } from '@/lib/quests/progress';
import { lockedPhrase } from '@/lib/quests/view-model';

/** Tone classes shared by chips, notes and banners. Red is reserved for a locked-out questline. */
export const TONE = {
  done: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  next: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  muted: 'border-border bg-muted/40 text-muted-foreground',
} as const;

export type Tone = keyof typeof TONE;

export const outcomeTone = (o: Outcome): Tone =>
  Outcome.$match(o, {
    NotStarted: () => 'muted' as const,
    InProgress: () => 'next' as const,
    Completed: () => 'done' as const,
    LockedOut: () => 'muted' as const,
  });

interface StateLook {
  readonly icon: LucideIcon;
  readonly className: string;
  readonly label: string;
}

const DONE: StateLook = {
  icon: CircleCheckBigIcon,
  className: 'text-emerald-600 dark:text-emerald-400',
  label: 'Done',
};

const NEXT: StateLook = {
  icon: CircleDotIcon,
  className: 'text-amber-600 dark:text-amber-400',
  label: 'Next',
};

/** Checklist look of a step: done, next, later, locked, or "may have been done". */
export const stateLook = (s: StepState): StateLook =>
  StepState.$match(s, {
    Done: () => DONE,
    Inferred: () => DONE,
    Available: () => NEXT,
    Blocked: () => NEXT,
    Upcoming: () => ({
      icon: CircleIcon,
      className: 'text-muted-foreground/50',
      label: 'Later',
    }),
    Locked: () => ({
      icon: LockIcon,
      className: 'text-muted-foreground',
      label: 'Locked',
    }),
    Unknown: () => ({
      icon: CircleDashedIcon,
      className: 'text-muted-foreground',
      label: 'May have been done',
    }),
  });

export interface RewardLook {
  readonly label: string;
  readonly className: string;
  /** Plain-English reason, for a missed reward. */
  readonly reason: string | undefined;
  readonly obtained: boolean;
  readonly missed: boolean;
}

/** Status of a reward, from the state of the step that gives it. */
export const rewardLook = (s: StepState): RewardLook =>
  StepState.$match(s, {
    Done: () => OBTAINED,
    Inferred: () => OBTAINED,
    Available: () => NEXT_REWARD,
    Blocked: () => NEXT_REWARD,
    Upcoming: () => ({
      label: 'Later',
      className: 'text-muted-foreground',
      reason: undefined,
      obtained: false,
      missed: false,
    }),
    Locked: (l) => ({
      label: 'Missed',
      className: 'text-muted-foreground',
      reason: lockedPhrase(l),
      obtained: false,
      missed: true,
    }),
    Unknown: () => ({
      label: 'May already have it',
      className: 'text-muted-foreground',
      reason: undefined,
      obtained: false,
      missed: false,
    }),
  });

const OBTAINED: RewardLook = {
  label: 'Obtained',
  className: 'text-emerald-700 dark:text-emerald-300',
  reason: undefined,
  obtained: true,
  missed: false,
};

const NEXT_REWARD: RewardLook = {
  label: 'Next',
  className: 'text-amber-700 dark:text-amber-300',
  reason: undefined,
  obtained: false,
  missed: false,
};
