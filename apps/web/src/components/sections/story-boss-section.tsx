import { eventFlagOffset } from '@elden-ring-compass/data';
import { itemIconUrl } from '@elden-ring-compass/data/images';
import { CheckIcon, CrownIcon, SwordIcon } from 'lucide-react';

import { ConnectSaveButton } from '@/components/misc/save-file-source-selector';
import { cn } from '@/lib/utils';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

// Boss portraits are the bosses' remembrance-item icons (goods 2950–2963). The icon ids
// match the legacy erdb portrait filenames 1:1, now served from the data package's webp icons.

type BossDef = { name: string; id: number; imgSrc?: string };

const EARLY_BOSSES: BossDef[] = [
  { name: 'Godrick', id: 10000800, imgSrc: itemIconUrl(163) },
  { name: 'Rennala', id: 14000800, imgSrc: itemIconUrl(172) },
  { name: 'Radahn', id: 310, imgSrc: itemIconUrl(164) },
  { name: 'Mohg', id: 12050800, imgSrc: itemIconUrl(168) },
  { name: 'Rykard', id: 16000800, imgSrc: itemIconUrl(166) },
];

const SEQUENTIAL_BOSSES: BossDef[] = [
  { name: 'Godfrey (Shade)', id: 11000850 },
  { name: 'Morgott', id: 11000800, imgSrc: itemIconUrl(165) },
  { name: 'Fire Giant', id: 1052520800, imgSrc: itemIconUrl(174) },
  { name: 'Godskin Duo', id: 13000850 },
  { name: 'Maliketh', id: 13000800, imgSrc: itemIconUrl(169) },
  { name: 'Sir Gideon-Ofnir', id: 11050850 },
  { name: 'Godfrey', id: 11050800, imgSrc: itemIconUrl(170) },
  { name: 'Radagon', id: 19000810, imgSrc: itemIconUrl(176) },
];

// Shardbearers / demigods get a crown marker. The early group are all shardbearers;
// a few of the sequential bosses are demigods too.
const DEMIGOD_NAMES = [
  'Godrick',
  'Rennala',
  'Radahn',
  'Mohg',
  'Rykard',
  'Morgott',
  'Maliketh',
  'Godfrey',
];
const isDemigod = (name: string) => DEMIGOD_NAMES.some((n) => name.startsWith(n));

const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

export function StoryBossSection() {
  const slot = useSelectedSlot();
  const connected = !!slot;

  // Read a boss defeat flag straight from the save bitfield. These story bosses are a
  // curated list of specific flag ids (some, like Starscourge Radahn 310 and Radagon
  // 19000810, aren't standard arena flags in BOSSES), so resolve the bit directly.
  const isDefeated = (flagId: number) => {
    if (!slot) return false;
    const offset = eventFlagOffset(flagId);
    if (!offset) return false;
    return ((slot.event_flags.flags[offset[0]] ?? 0) & (1 << offset[1])) !== 0;
  };

  const allBosses = [...EARLY_BOSSES, ...SEQUENTIAL_BOSSES];
  const killed = allBosses.filter((b) => isDefeated(b.id)).length;
  const total = allBosses.length;

  return (
    <>
      {connected ? (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-wrap gap-4 text-xs text-muted-foreground'>
            <span className='flex items-center gap-1.5'>
              <span className='size-2.5 rounded-sm bg-green-400' /> Defeated
            </span>
            <span className='flex items-center gap-1.5'>
              <span className='size-2.5 rounded-sm bg-muted-foreground' /> Incomplete
            </span>
            <span className='flex items-center gap-1.5'>
              <CrownIcon className='size-3.5 text-amber-300' /> Shardbearer / Demigod
            </span>
          </div>
          <span className='font-mono text-[13px] text-muted-foreground'>
            {killed} / {total} - ({pct(killed, total)}% defeated)
          </span>
        </div>
      ) : (
        <div className='flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm'>
          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent'>
            <CrownIcon className='size-4' />
          </span>
          <span>
            <span className='font-medium'>{total} main bosses</span>{' '}
            <span className='text-muted-foreground'>· the road from Limgrave to the Erdtree</span>
          </span>
          <div className='ml-auto'>
            <ConnectSaveButton variant='outline' size='sm' />
          </div>
        </div>
      )}

      <BossGroup
        eyebrow='Demigods & Shardbearers'
        bosses={EARLY_BOSSES}
        connected={connected}
        isDefeated={isDefeated}
      />
      <BossGroup
        eyebrow='Path to the Erdtree'
        bosses={SEQUENTIAL_BOSSES}
        connected={connected}
        isDefeated={isDefeated}
      />
    </>
  );
}

function BossGroup({
  eyebrow,
  bosses,
  connected,
  isDefeated,
}: {
  eyebrow: string;
  bosses: BossDef[];
  connected: boolean;
  isDefeated: (id: number) => boolean;
}) {
  return (
    <div>
      <div className='mb-2.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase'>
        {eyebrow}
      </div>
      <div className='grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5'>
        {bosses.map((boss) => (
          <BossCell key={boss.id} boss={boss} connected={connected} killed={isDefeated(boss.id)} />
        ))}
      </div>
    </div>
  );
}

function BossCell({
  boss,
  connected,
  killed,
}: {
  boss: BossDef;
  connected: boolean;
  killed: boolean;
}) {
  const demigod = isDemigod(boss.name);
  const locked = connected && !killed;
  const statusLabel = connected
    ? killed
      ? 'Defeated'
      : 'Incomplete'
    : demigod
      ? 'Shardbearer'
      : 'Main Boss';

  return (
    <Tooltip>
      <TooltipTrigger
        render={<div />}
        className={cn(
          'group relative flex aspect-[3/4] cursor-default items-end overflow-hidden rounded-xl border bg-[#15110d] text-left transition-transform hover:-translate-y-0.5',
          killed ? 'border-green-400/60' : 'border-border',
        )}
      >
        {boss.imgSrc ? (
          <img
            src={boss.imgSrc}
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

        {demigod && (
          <CrownIcon className='absolute top-2.5 left-2.5 size-[18px] text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]' />
        )}
        {killed && (
          <span className='absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full bg-green-500 text-[#08120a] shadow'>
            <CheckIcon className='size-3.5' />
          </span>
        )}

        <div className='relative flex w-full flex-col gap-1 p-3'>
          <span className='text-sm leading-tight font-semibold text-stone-50 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]'>
            {boss.name}
          </span>
          <span
            className={cn(
              'flex items-center gap-1 text-[11px] font-semibold',
              killed ? 'text-green-400' : 'text-stone-300/60',
            )}
          >
            {killed && <CheckIcon className='size-3' />}
            {statusLabel}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className='flex max-w-72 flex-col items-center'>
        {boss.imgSrc && <img src={boss.imgSrc} className='mb-2 size-56' alt={boss.name} />}
        <p className='text-base font-semibold'>{boss.name}</p>
        {killed && <strong>Defeated</strong>}
        <p>
          Event Id: <span className='font-mono'>{boss.id}</span>
        </p>
        <a
          className='hover:underline'
          target='_blank'
          rel='noreferrer'
          href='https://docs.google.com/spreadsheets/d/1Nn-d4_mzEtGUSQXscCkQ41AhtqO_wF2Aw3yoTBdW9lk/edit?gid=186418368#gid=186418368'
        >
          Event Flags Ref
        </a>
      </TooltipContent>
    </Tooltip>
  );
}
