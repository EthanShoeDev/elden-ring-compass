import { eventFlagOffset } from '@elden-ring-compass/data';
import { itemIconUrl } from '@elden-ring-compass/data/images';
import { cn } from '@/lib/utils';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

// Boss portraits are the bosses' remembrance-item icons (goods 2950–2963). The icon ids
// match the legacy erdb portrait filenames 1:1, now served from the data package's webp icons.

export function StoryBossSection() {
  const slot = useSelectedSlot();

  // Read a boss defeat flag straight from the save bitfield. These story bosses are a
  // curated list of specific flag ids (some, like Starscourge Radahn 310 and Radagon
  // 19000810, aren't standard arena flags in BOSSES), so resolve the bit directly.
  const isDefeated = (flagId: number) => {
    if (!slot) return false;
    const offset = eventFlagOffset(flagId);
    if (!offset) return false;
    return ((slot.event_flags.flags[offset[0]] ?? 0) & (1 << offset[1])) !== 0;
  };

  const earlyBosses = [
    {
      name: 'Godrick',
      id: 10000800,
      imgSrc: itemIconUrl(163),
    },
    {
      name: 'Rennala',
      id: 14000800,
      imgSrc: itemIconUrl(172),
    },
    {
      name: 'Radahn',
      id: 310,
      imgSrc: itemIconUrl(164),
    },
    {
      name: 'Mohg',
      id: 12050800,
      imgSrc: itemIconUrl(168),
    },
    {
      name: 'Rykard',
      id: 16000800,
      imgSrc: itemIconUrl(166),
    },
  ].map((boss) => ({
    ...boss,
    killed: isDefeated(boss.id),
  }));

  const sequentialBosses = [
    {
      name: 'Godfrey (Shade)',
      id: 11000850,
    },
    {
      name: 'Morgott',
      id: 11000800,
      imgSrc: itemIconUrl(165),
    },
    {
      name: 'Fire Giant',
      id: 1052520800,
      imgSrc: itemIconUrl(174),
    },
    {
      name: 'Godskin Duo',
      id: 13000850,
    },
    {
      name: 'Maliketh',
      id: 13000800,
      imgSrc: itemIconUrl(169),
    },
    {
      name: 'Sir Gideon-Ofnir',
      id: 11050850,
    },
    {
      name: 'Godfrey',
      id: 11050800,
      imgSrc: itemIconUrl(170),
    },
    {
      name: 'Radagon',
      id: 19000810,
      imgSrc: itemIconUrl(176),
    },
  ].map((boss) => ({
    ...boss,
    killed: isDefeated(boss.id),
  }));

  const bossesKilled =
    earlyBosses.filter((b) => b.killed).length + sequentialBosses.filter((b) => b.killed).length;
  const totalBosses = earlyBosses.length + sequentialBosses.length;

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Main Progression</CardTitle>
        <CardDescription>
          {bossesKilled} /{totalBosses} - ({((bossesKilled / totalBosses) * 100).toFixed(0)}%
          defeated)
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-wrap gap-4'>
        <Card>
          <CardHeader>
            <CardDescription>2 required</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-4'>
            {earlyBosses.map((boss, i) => (
              <Boss key={i} {...boss} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sequential</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-4'>
            {sequentialBosses.map((boss, i) => (
              <Boss key={i} {...boss} />
            ))}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function Boss({
  name,
  imgSrc,
  id,
  killed,
}: {
  name: string;
  imgSrc?: string;
  id: number;
  killed: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          'flex w-20 flex-col items-center gap-1 rounded-lg p-1',
          killed && 'border border-green-300',
        )}
      >
        <Avatar>
          <AvatarImage src={imgSrc} />
          <AvatarFallback></AvatarFallback>
        </Avatar>
        <span className='text-center text-xs text-muted-foreground'>{name}</span>
      </TooltipTrigger>
      <TooltipContent>
        <img src={imgSrc} className='mb-2 size-72' alt={name} />
        {killed && <strong>Defeated</strong>}
        <p>
          Event Id: <span>{id}</span>
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
