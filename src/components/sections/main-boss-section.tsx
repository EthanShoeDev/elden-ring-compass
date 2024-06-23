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
import { eventsDbView } from '@/lib/vm/events';
import { cn } from '@/lib/utils';

export function MainBossSection() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Main Progression</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Card>
          <CardHeader>
            <CardDescription>2 required</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Boss name="Godrick" eventId={10000800} />
            <Boss name="Rennala" eventId={14000800} />
            {/* This is wrong Radahn eventId */}
            <Boss name="Radahn" eventId={310} />
            <Boss name="Mohg" eventId={35000800} />
            <Boss name="Rykard" eventId={16000800} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sequential</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Boss name="Godfrey (Shade)" eventId={11000850} />
            <Boss name="Morgott" eventId={11000800} />
            <Boss name="Fire Giant" eventId={1052520800} />
            <Boss name="Godskin Duo" eventId={13000850} />
            <Boss name="Beast Clergyman" eventId={13000800} />
            <Boss name="Sir Gideon-Ofnir" eventId={11050850} />
            <Boss name="Godfrey" eventId={11050800} />
            <Boss name="Radagon" eventId={19000810} />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function Boss({
  name,
  imgSrc,
  eventId,
}: {
  name: string;
  imgSrc?: string;
  eventId: number;
}) {
  const slot = useSelectedSlot();
  const event = slot
    ? eventsDbView(slot).find((e) => e.eventId === eventId)
    : undefined;
  console.log(event);

  const isKilled = event?.on === 'on';

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          'flex w-16 flex-col items-center gap-1',
          isKilled && 'border border-green-400'
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
        <p>Defeated: {isKilled ? 'true' : 'false'}</p>
        <p>
          Event Id: <span>{eventId}</span>
        </p>
        <br />
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
