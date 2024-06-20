import { Card, CardContent, CardHeader } from './ui/card';
import {
  useSelectedSlot,
  useSlotNameSelection,
} from '@/stores/slot-selection-store';
import { statsDbView } from '@/lib/vm/stats';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export function SlotOverview({ className }: { className?: string }) {
  const slot = useSelectedSlot();
  const [slotName] = useSlotNameSelection();
  if (!slot) return <div>No slot selected</div>;

  const statsVm = statsDbView(slot);

  return (
    <Card className={cn('p-4', className)}>
      {/* <div className="prose dark:prose-invert prose-p:my-0">
        <p>Steam ID: {statsVm.steam_id}</p>
        <p>Gender: {statsVm.gender}</p>
        <p>Weapon Level: {statsVm.match_making_weapon_level}</p>
        <p>Archetype: {statsVm.arche_type}</p>
        <p style={{ marginTop: '20px' }}>Stats</p>
        <p>Vigor: {statsVm.stats.vigor}</p>
        <p>Mind: {statsVm.stats.mind}</p>
        <p>Endurance: {statsVm.stats.endurance}</p>
        <p>Strength: {statsVm.stats.strength}</p>
        <p>Dexterity: {statsVm.stats.dexterity}</p>
        <p>Intelligence: {statsVm.stats.intelligence}</p>
        <p>Faith: {statsVm.stats.faith}</p>
        <p>Arcane: {statsVm.stats.arcane}</p>
        <p>Level: {statsVm.stats.level}</p>
        <p>Souls: {statsVm.stats.souls}</p>
        <p>Souls Memory: {statsVm.stats.soulsmemory}</p>
        <br />
        <p>{JSON.stringify(statsVm.coords, undefined, 2)}</p>
      </div> */}
      <CardHeader className="flex flex-col items-center gap-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src="/placeholder-user.jpg" />
            <AvatarFallback></AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <div className="text-lg font-medium">{slotName}</div>
            <div className="text-sm text-muted-foreground">
              Steam ID: {statsVm.steam_id}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div>Gender: {statsVm.gender}</div>
          <Separator orientation="vertical" />
          <div>Weapon Level: {statsVm.match_making_weapon_level}</div>
          <Separator orientation="vertical" />
          <div>Archetype: {statsVm.arche_type}</div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Vigor
            </div>
            <div className="text-lg font-medium">{statsVm.stats.vigor}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Mind
            </div>
            <div className="text-lg font-medium">{statsVm.stats.mind}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Endurance
            </div>
            <div className="text-lg font-medium">{statsVm.stats.endurance}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Strength
            </div>
            <div className="text-lg font-medium">{statsVm.stats.strength}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Dexterity
            </div>
            <div className="text-lg font-medium">{statsVm.stats.dexterity}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Intelligence
            </div>
            <div className="text-lg font-medium">
              {statsVm.stats.intelligence}
            </div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Faith
            </div>
            <div className="text-lg font-medium">{statsVm.stats.faith}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Arcane
            </div>
            <div className="text-lg font-medium">{statsVm.stats.arcane}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Level
            </div>
            <div className="text-lg font-medium">{statsVm.stats.level}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Souls
            </div>
            <div className="text-lg font-medium">{statsVm.stats.souls}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Souls Memory
            </div>
            <div className="text-lg font-medium">
              {statsVm.stats.soulsmemory}
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <pre>
            Player Coords:{' '}
            {JSON.stringify(statsVm.coords.player_coords, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
