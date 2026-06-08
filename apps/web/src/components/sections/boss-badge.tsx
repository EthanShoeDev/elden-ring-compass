import {
  CrownIcon,
  GemIcon,
  type LucideIcon,
  MapPinIcon,
  ScrollTextIcon,
  ShieldHalfIcon,
  SwordsIcon,
} from 'lucide-react';

import { type BossBadge, BADGE_LABEL } from '@/lib/boss-meta';
import { cn } from '@/lib/utils';

/** Icon + colour treatment per badge kind. */
const BADGE_STYLE: Record<BossBadge, { icon: LucideIcon; className: string }> = {
  demigod: { icon: CrownIcon, className: 'border-amber-500/30 bg-amber-500/15 text-amber-300' },
  shardbearer: {
    icon: GemIcon,
    className: 'border-violet-400/30 bg-violet-500/15 text-violet-300',
  },
  legend: { icon: ScrollTextIcon, className: 'border-sky-400/30 bg-sky-500/15 text-sky-300' },
  'great-enemy': {
    icon: SwordsIcon,
    className: 'border-rose-400/25 bg-rose-500/10 text-rose-300',
  },
  field: {
    icon: MapPinIcon,
    className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  },
  dungeon: {
    icon: ShieldHalfIcon,
    className: 'border-stone-400/25 bg-stone-500/10 text-stone-300',
  },
};

/** A single category pill (e.g. "Demigod"). `iconOnly` drops the label for tight rows. */
export function BossBadgePill({ kind, iconOnly }: { kind: BossBadge; iconOnly?: boolean }) {
  const { icon: Icon, className } = BADGE_STYLE[kind];
  return (
    <span
      title={BADGE_LABEL[kind]}
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[10px] font-semibold whitespace-nowrap',
        className,
      )}
    >
      <Icon className='size-3' />
      {!iconOnly && BADGE_LABEL[kind]}
    </span>
  );
}

/** A row of category pills for a boss. */
export function BossBadges({
  badges,
  iconOnly,
  className,
}: {
  badges: readonly BossBadge[];
  iconOnly?: boolean;
  className?: string;
}) {
  if (badges.length === 0) return null;
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {badges.map((b) => (
        <BossBadgePill key={b} kind={b} iconOnly={iconOnly} />
      ))}
    </span>
  );
}
