import { Link } from '@tanstack/react-router';
import { CheckIcon, TrophyIcon } from 'lucide-react';

import {
  equippedHelmIconUrl,
  useCompletion,
  type CompletionCategory,
  type Milestone,
} from '@/lib/completion';
import { statsDbView } from '@/lib/vm/stats';
import { useSelectedSlot, useSlotNameSelection } from '@/stores/slot-selection-store';
import { CompletionRing } from './completion-ring';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** The single character card: completion ring + identity + attribute stats. */
export function CompletionHero() {
  const slot = useSelectedSlot();
  const [slotName] = useSlotNameSelection();
  const { overallPct } = useCompletion();

  if (!slot) return null;
  const stats = statsDbView(slot);
  const helm = equippedHelmIconUrl(slot);

  const totalMinutes = Math.floor(stats.seconds_played / 60);
  const playtime = `${Math.floor(totalMinutes / 60).toString()}h ${(totalMinutes % 60).toString()}m`;

  const attributes: ReadonlyArray<[string, number]> = [
    ['Vigor', stats.stats.vigor],
    ['Mind', stats.stats.mind],
    ['Endurance', stats.stats.endurance],
    ['Strength', stats.stats.strength],
    ['Dexterity', stats.stats.dexterity],
    ['Intelligence', stats.stats.intelligence],
    ['Faith', stats.stats.faith],
    ['Arcane', stats.stats.arcane],
  ];

  return (
    <Card>
      <CardContent className='flex flex-col gap-6 p-6'>
        <div className='flex flex-col items-center gap-6 sm:flex-row'>
          <CompletionRing pct={overallPct} size={140} centerIconUrl={helm} />
          <div className='flex flex-1 flex-col gap-2 text-center sm:text-left'>
            <div>
              <div className='text-2xl font-semibold tracking-tight'>{slotName}</div>
              <div className='text-sm text-muted-foreground'>
                {stats.arche_type} · Level {stats.stats.level} · {playtime}
              </div>
            </div>
            <div className='flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground sm:justify-start'>
              <span>Runes held {stats.stats.souls.toLocaleString()}</span>
              <Separator orientation='vertical' className='h-4' />
              <span>Deaths {stats.deaths.toLocaleString()}</span>
              <Separator orientation='vertical' className='h-4' />
              <span>Weapon Lvl {stats.match_making_weapon_level}</span>
              <Separator orientation='vertical' className='h-4' />
              <span>{capitalize(stats.gender)}</span>
            </div>
          </div>
        </div>
        <div className='grid grid-cols-4 gap-3 border-t border-border pt-4 sm:grid-cols-8'>
          {attributes.map(([label, value]) => (
            <div key={label} className='flex flex-col items-center gap-0.5'>
              <span className='text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase'>
                {label.slice(0, 3)}
              </span>
              <span className='text-lg font-semibold tabular-nums'>{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** One linkable progress row in the breakdown. */
function CategoryRow({ c }: { c: CompletionCategory }) {
  const body = (
    <div className='flex flex-col gap-1.5 rounded-lg p-2 transition-colors hover:bg-muted/50'>
      <div className='flex items-baseline justify-between gap-2'>
        <span className='text-sm font-medium'>{c.label}</span>
        <span className='text-xs text-muted-foreground tabular-nums'>
          {c.owned} / {c.total} · {c.pct}%
        </span>
      </div>
      <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-primary transition-all'
          style={{ width: `${c.pct.toString()}%` }}
        />
      </div>
    </div>
  );

  if (c.categorySlug)
    return (
      <Link to='/inventory/$category' params={{ category: c.categorySlug }} className='block'>
        {body}
      </Link>
    );
  if (c.to)
    return (
      <Link to={c.to} className='block'>
        {body}
      </Link>
    );
  return body;
}

/** The per-category completion breakdown + milestone trophy chips. */
export function CompletionBreakdown() {
  const { categories, milestones } = useCompletion();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion by category</CardTitle>
        <CardDescription>
          Owned out of obtainable — tap a row to browse that category
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='grid gap-1 sm:grid-cols-2'>
          {categories.map((c) => (
            <CategoryRow key={c.key} c={c} />
          ))}
        </div>
        {milestones.length > 0 && <MilestoneChips milestones={milestones} />}
      </CardContent>
    </Card>
  );
}

function MilestoneChips({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className='flex flex-col gap-2 border-t border-border pt-4'>
      <span className='flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
        <TrophyIcon className='size-3.5' /> Milestones
      </span>
      <div className='flex flex-wrap gap-2'>
        {milestones.map((m) => {
          const done = m.total > 0 && m.owned >= m.total;
          return (
            <Badge key={m.key} variant={done ? 'default' : 'secondary'} className='gap-1'>
              {done && <CheckIcon className='size-3' />}
              {m.label} {m.owned}/{m.total}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
