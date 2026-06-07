import { eventFlagOffset } from '@elden-ring-compass/data';
import { CheckIcon, ExternalLinkIcon, MapPinIcon, SwordIcon } from 'lucide-react';

import { ConnectSaveButton } from '@/components/misc/save-file-source-selector';
import { type BossBadge, type GalleryBoss, BOSS_GALLERY, bossReward } from '@/lib/boss-meta';
import { cn } from '@/lib/utils';
import { bossPinByFlag } from '@/lib/vm/map-pins';
import { useRowSelectionControls, useTableStateMap } from '@/components/data-table/data-table-store';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { BossBadgePill, BossBadges } from './boss-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

// Boss portraits are the bosses' Remembrance-item icons (the only portrait-like asset
// the data package ships). Bosses that drop no Remembrance (Margit, Gideon, …) fall
// back to a sword glyph — there simply is no icon for them.

const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

const ALL_BOSSES = BOSS_GALLERY.flatMap((g) => g.bosses);

export function StoryBossSection() {
  const slot = useSelectedSlot();
  const connected = !!slot;
  const { setRowSelection } = useRowSelectionControls();
  // Which bosses are currently pinned on the map = selected in the shared `bosses`
  // table store. The all-bosses table and this gallery toggle the same set.
  const pinned = useTableStateMap().bosses?.rowSelection ?? {};

  // Read a boss defeat flag straight from the save bitfield. The gallery is a curated
  // list of specific flag ids (some, like Starscourge Radahn 310 and the Scadutree
  // Avatar, aren't standard arena flags in BOSSES), so resolve the bit directly.
  const isDefeated = (flagId: number) => {
    if (!slot) return false;
    const offset = eventFlagOffset(flagId);
    if (!offset) return false;
    return ((slot.event_flags.flags[offset[0]] ?? 0) & (1 << offset[1])) !== 0;
  };

  // Toggle the boss's map pin (its row in the shared `bosses` store). No navigation,
  // so you can pin several bosses and review them on the map whenever you like.
  const togglePin = (flag: number) => {
    setRowSelection('bosses')((prev) => {
      const key = flag.toString();
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const killed = ALL_BOSSES.filter((b) => isDefeated(b.flag)).length;
  const total = ALL_BOSSES.length;

  return (
    <>
      <CategoryGuide />

      {connected ? (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Legend connected />
          <span className='font-mono text-[13px] text-muted-foreground'>
            {killed} / {total} felled ({pct(killed, total)}%)
          </span>
        </div>
      ) : (
        <div className='flex flex-col gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3'>
          <div className='flex flex-wrap items-center gap-3 text-sm'>
            <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent'>
              <SwordIcon className='size-4' />
            </span>
            <span>
              <span className='font-medium'>{total} major bosses</span>{' '}
              <span className='text-muted-foreground'>
                · every Demigod, Shardbearer and Legend, ordered from Limgrave to the Erdtree (and
                into the DLC)
              </span>
            </span>
            <div className='ml-auto'>
              <ConnectSaveButton variant='outline' size='sm' />
            </div>
          </div>
          <Legend />
        </div>
      )}

      {BOSS_GALLERY.map((group) => (
        <div key={group.title}>
          <div className='mb-0.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase'>
            {group.title}
          </div>
          <p className='mb-2.5 max-w-3xl text-xs text-muted-foreground/80'>{group.subtitle}</p>
          <div className='grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5'>
            {group.bosses.map((boss) => (
              <BossCell
                key={boss.flag}
                boss={boss}
                connected={connected}
                killed={isDefeated(boss.flag)}
                pinnable={bossPinByFlag.has(boss.flag)}
                pinned={!!pinned[boss.flag.toString()]}
                onTogglePin={() => togglePin(boss.flag)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

const WIKI = {
  bosses: 'https://eldenring.wiki.fextralife.com/Bosses',
  demigod: 'https://eldenring.wiki.fextralife.com/Demigods',
  shardbearer: 'https://eldenring.wiki.fextralife.com/Great+Runes',
  legend: 'https://eldenring.wiki.fextralife.com/Remembrance',
};

const CATEGORY_GUIDE: { kind: BossBadge; desc: string; href: string }[] = [
  {
    kind: 'demigod',
    desc: 'Offspring of Queen Marika — the central story bosses.',
    href: WIKI.demigod,
  },
  {
    kind: 'shardbearer',
    desc: 'Hold a Great Rune; any two open the way into Leyndell.',
    href: WIKI.shardbearer,
  },
  {
    kind: 'legend',
    desc: 'Drop a Remembrance, traded for unique weapons or spells.',
    href: WIKI.legend,
  },
];

/** Top-of-page explainer: what the category badges mean, with links to the wiki. */
function CategoryGuide() {
  return (
    <div className='rounded-xl border border-border bg-muted/30 p-4'>
      <div className='mb-2.5 flex items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold'>Boss categories</h3>
        <a
          href={WIKI.bosses}
          target='_blank'
          rel='noreferrer'
          className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
        >
          Elden Ring Wiki <ExternalLinkIcon className='size-3' />
        </a>
      </div>
      <div className='grid gap-x-5 gap-y-2.5 sm:grid-cols-3'>
        {CATEGORY_GUIDE.map(({ kind, desc, href }) => (
          <a
            key={kind}
            href={href}
            target='_blank'
            rel='noreferrer'
            className='group flex flex-col gap-1 rounded-lg p-1 transition-colors hover:bg-muted/60'
          >
            <span className='flex items-center gap-1.5'>
              <BossBadgePill kind={kind} />
              <ExternalLinkIcon className='size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
            </span>
            <span className='text-xs text-muted-foreground'>{desc}</span>
          </a>
        ))}
      </div>
      <p className='mt-2.5 text-[11px] text-muted-foreground/70'>
        These overlap — Godrick, for instance, is a Demigod, a Shardbearer and a Legend at once. The
        smaller Field and Dungeon bosses fill out the full table below.
      </p>
    </div>
  );
}

/** The status key (pin / defeat state) shown above the gallery. */
function Legend({ connected }: { connected?: boolean }) {
  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground'>
      <span className='flex items-center gap-1.5'>
        <MapPinIcon className='size-3 text-amber-300' fill='currentColor' /> Pinned on map
      </span>
      {connected && (
        <>
          <span className='flex items-center gap-1.5'>
            <span className='size-2.5 rounded-sm bg-green-400' /> Defeated
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='size-2.5 rounded-sm bg-muted-foreground' /> Incomplete
          </span>
        </>
      )}
    </div>
  );
}

function BossCell({
  boss,
  connected,
  killed,
  pinnable,
  pinned,
  onTogglePin,
}: {
  boss: GalleryBoss;
  connected: boolean;
  killed: boolean;
  pinnable: boolean;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const imgSrc = bossReward(boss.flag)?.iconUrl;
  const locked = connected && !killed;

  return (
    <Tooltip>
      <TooltipTrigger
        render={<div />}
        onClick={pinnable ? onTogglePin : undefined}
        className={cn(
          'group relative flex aspect-[3/4] items-end overflow-hidden rounded-xl border bg-[#15110d] text-left transition-transform hover:-translate-y-0.5',
          // Border is the PINNED channel only — so your hand-picked few stand out.
          pinned ? 'border-amber-400/80 ring-1 ring-amber-400/40' : 'border-border',
          pinnable ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={boss.name}
            className={cn(
              'absolute inset-0 size-full object-cover object-[center_28%]',
              locked && 'brightness-[.55] grayscale',
            )}
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center text-stone-50/25'>
            <SwordIcon className='size-11' />
          </div>
        )}

        <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent' />

        {/* Category badges, top-left. */}
        <div className='absolute top-2 left-2 flex flex-col items-start gap-1'>
          <BossBadges badges={boss.badges} iconOnly />
        </div>

        {/* Defeat is the only top-right marker now (the green channel). */}
        {killed && (
          <span className='absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-green-500 text-[#08120a] shadow'>
            <CheckIcon className='size-3.5' />
          </span>
        )}

        {/* Pinned marker, bottom-right corner — quiet unless active. */}
        {pinnable && (
          <MapPinIcon
            className={cn(
              'absolute right-2.5 bottom-3 size-4 transition-opacity',
              pinned
                ? 'text-amber-300 opacity-100'
                : 'text-stone-200/70 opacity-0 group-hover:opacity-100',
            )}
            fill={pinned ? 'currentColor' : 'none'}
          />
        )}

        <div className='relative flex w-full flex-col gap-0.5 p-3 pr-7'>
          <span className='text-sm leading-tight font-semibold text-stone-50 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]'>
            {boss.name}
          </span>
          {boss.note && (
            <span className='text-[11px] leading-tight text-stone-300/70'>{boss.note}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className='flex max-w-60 flex-col gap-1'>
        <p className='text-sm font-semibold'>{boss.name}</p>
        <BossBadges badges={boss.badges} />
        {connected && (
          <span className={cn('text-xs font-semibold', killed ? 'text-green-400' : 'text-muted-foreground')}>
            {killed ? 'Defeated' : 'Not yet defeated'}
          </span>
        )}
        <p className='text-xs text-muted-foreground'>
          {pinnable
            ? pinned
              ? 'Pinned — click to remove from the map.'
              : 'Click to pin this boss on the map.'
            : 'No mapped location.'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
