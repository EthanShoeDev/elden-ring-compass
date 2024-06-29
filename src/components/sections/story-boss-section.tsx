import { cn } from '@/lib/utils';
import { eventsDbView } from '@/lib/vm/events';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

import godrickImgSrc from '@/assets/erdb/icons/tools/163.png';
import radahnImgSrc from '@/assets/erdb/icons/tools/164.png';
import rykardImgSrc from '@/assets/erdb/icons/tools/166.png';
import mohgImgSrc from '@/assets/erdb/icons/tools/168.png';
import rennalaImgSrc from '@/assets/erdb/icons/tools/172.png';

import morgottImgSrc from '@/assets/erdb/icons/tools/165.png';
import malikethImgSrc from '@/assets/erdb/icons/tools/169.png';
import godfreyImgSrc from '@/assets/erdb/icons/tools/170.png';
import fireGiantImgSrc from '@/assets/erdb/icons/tools/174.png';
import eldenBeastImgSrc from '@/assets/erdb/icons/tools/176.png';

export function StoryBossSection() {
  const slot = useSelectedSlot();
  const events = slot ? eventsDbView(slot) : [];

  const earlyBosses = [
    {
      name: 'Godrick',
      id: 10000800,
      imgSrc: godrickImgSrc,
    },
    {
      name: 'Rennala',
      id: 14000800,
      imgSrc: rennalaImgSrc,
    },
    {
      name: 'Radahn',
      id: 310,
      imgSrc: radahnImgSrc,
    },
    {
      name: 'Mohg',
      id: 35000800,
      imgSrc: mohgImgSrc,
    },
    {
      name: 'Rykard',
      id: 16000800,
      imgSrc: rykardImgSrc,
    },
  ].map((boss) => ({
    ...boss,
    killed: slot ? events.find((e) => e.id === boss.id)?.on == true : false,
  }));

  const sequentialBosses = [
    {
      name: 'Godfrey (Shade)',
      id: 11000850,
    },
    {
      name: 'Morgott',
      id: 11000800,
      imgSrc: morgottImgSrc,
    },
    {
      name: 'Fire Giant',
      id: 1052520800,
      imgSrc: fireGiantImgSrc,
    },
    {
      name: 'Godskin Duo',
      id: 13000850,
    },
    {
      name: 'Maliketh',
      id: 13000800,
      imgSrc: malikethImgSrc,
    },
    {
      name: 'Sir Gideon-Ofnir',
      id: 11050850,
    },
    {
      name: 'Godfrey',
      id: 11050800,
      imgSrc: godfreyImgSrc,
    },
    {
      name: 'Radagon',
      id: 19000810,
      imgSrc: eldenBeastImgSrc,
    },
  ].map((boss) => ({
    ...boss,
    killed: slot ? events.find((e) => e.id === boss.id)?.on == true : false,
  }));

  const bossesKilled =
    earlyBosses.filter((b) => b.killed).length +
    sequentialBosses.filter((b) => b.killed).length;
  const totalBosses = earlyBosses.length + sequentialBosses.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Main Progression</CardTitle>
        <CardDescription>
          {bossesKilled} /{totalBosses} - (
          {((bossesKilled / totalBosses) * 100).toFixed(0)}% defeated)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        <Card>
          <CardHeader>
            <CardDescription>2 required</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {earlyBosses.map((boss, i) => (
              <Boss key={i} {...boss} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sequential</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
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
          killed && 'border border-green-300'
        )}
      >
        <Avatar>
          <AvatarImage src={imgSrc} />
          <AvatarFallback></AvatarFallback>
        </Avatar>
        <span className="text-center text-xs text-muted-foreground">
          {name}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <img src={imgSrc} className="mb-2 size-72" />
        {killed && <strong>Defeated</strong>}
        <p>
          Event Id: <span>{id}</span>
        </p>
        <a
          className="hover:underline"
          target="_blank"
          rel="noreferrer"
          href="https://docs.google.com/spreadsheets/d/1Nn-d4_mzEtGUSQXscCkQ41AhtqO_wF2Aw3yoTBdW9lk/edit?gid=186418368#gid=186418368"
        >
          Event Flags Ref
        </a>
      </TooltipContent>
    </Tooltip>
  );
}
