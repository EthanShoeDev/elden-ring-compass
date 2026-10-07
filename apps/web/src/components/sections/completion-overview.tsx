import { Link } from '@tanstack/react-router';
import { CheckIcon, TrophyIcon } from 'lucide-react';

import {
  equippedHelmIconUrl,
  useCompletion,
  type CompletionCategory,
  type Milestone,
} from '@/lib/completion';
import { derivedStatsView } from '@/lib/vm/derived-stats';
import { statsDbView } from '@/lib/vm/stats';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { CompletionRing } from './completion-ring';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** The single character card: completion ring + identity + attribute stats. */
export function CompletionHero() {
  const slot = useSelectedSlot();
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

  const d = derivedStatsView(slot);
  // HP/FP/stamina come straight from the save; `base` differs when gear or buffs modify it.
  const pool = (label: string, s: { max: number; base: number }) => ({
    label,
    value: s.max.toLocaleString(),
    sub: s.max !== s.base ? `base ${s.base.toLocaleString()}` : undefined,
    hint: `Max ${label} as saved (base ${s.base.toLocaleString()} before equipment and buffs)`,
  });
  const derived: ReadonlyArray<{ label: string; value: string; sub?: string; hint: string }> = [
    pool('HP', d.hp),
    pool('FP', d.fp),
    pool('Stamina', d.stamina),
    {
      label: 'Equip Load',
      value: `${d.equipLoad.current.toFixed(1)} / ${d.equipLoad.max.toFixed(1)}`,
      sub: `${d.equipLoad.roll} load`,
      hint: 'Equipped weight / max equip load. Max is estimated from Endurance and equipped talismans.',
    },
    {
      label: 'Poise',
      value: d.poise.toString(),
      hint: "Equipped armor poise (including Bull-Goat's Talisman)",
    },
    {
      label: 'Discovery',
      value: d.discovery.toString(),
      hint: '100 + Arcane, plus item-discovery talismans',
    },
  ];

  return (
    <Card>
      <CardContent className='flex flex-col gap-6 p-6'>
        <div className='flex flex-col items-center gap-6 sm:flex-row'>
          <CompletionRing pct={overallPct} size={140} centerIconUrl={helm} />
          <div className='flex flex-1 flex-col gap-2 text-center sm:text-left'>
            <div>
              <div className='text-2xl font-semibold tracking-tight'>
                {slot.player_game_data.character_name}
              </div>
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
        <div className='grid grid-cols-3 gap-3 border-t border-border pt-4 sm:grid-cols-6'>
          {derived.map(({ label, value, sub, hint }) => (
            <div key={label} className='flex flex-col items-center gap-0.5' title={hint}>
              <span className='text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase'>
                {label}
              </span>
              <span className='text-lg font-semibold tabular-nums'>{value}</span>
              {sub !== undefined && (
                <span className='text-[11px] text-muted-foreground tabular-nums'>{sub}</span>
              )}
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

  if (c.categorySlug !== undefined && c.categorySlug !== '')
    return (
      <Link to='/inventory/$category' params={{ category: c.categorySlug }} className='block'>
        {body}
      </Link>
    );
  if (c.to !== undefined && c.to !== '')
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
