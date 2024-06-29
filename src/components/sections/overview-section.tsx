import { Bolstering, ERDB, Tool } from '@/lib/erdb';
import { cn } from '@/lib/utils';
import { eventsDbView } from '@/lib/vm/events';
import { inventoryDbView } from '@/lib/vm/inventory';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { SlotOverview } from '../slot-overview';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export function OverviewSection() {
  const slot = useSelectedSlot();

  const inventoryQuantityById = new Map(
    slot
      ? inventoryDbView(slot).items.map((item) => [item.item_id, item.quantity])
      : []
  );
  const events = slot ? eventsDbView(slot) : [];

  const materialToBellBearings = {
    'Somber Smithing Stone [1]': `Somberstone Miner's Bell Bearing [1]`,
    'Somber Smithing Stone [2]': `Somberstone Miner's Bell Bearing [1]`,
    'Somber Smithing Stone [3]': `Somberstone Miner's Bell Bearing [2]`,
    'Somber Smithing Stone [4]': `Somberstone Miner's Bell Bearing [2]`,
    'Somber Smithing Stone [5]': `Somberstone Miner's Bell Bearing [3]`,
    'Somber Smithing Stone [6]': `Somberstone Miner's Bell Bearing [3]`,
    'Somber Smithing Stone [7]': `Somberstone Miner's Bell Bearing [4]`,
    'Somber Smithing Stone [8]': `Somberstone Miner's Bell Bearing [4]`,
    'Somber Smithing Stone [9]': `Somberstone Miner's Bell Bearing [5]`,
    'Smithing Stone [1]': `Smithing-Stone Miner's Bell Bearing [1]`,
    'Smithing Stone [2]': `Smithing-Stone Miner's Bell Bearing [1]`,
    'Smithing Stone [3]': `Smithing-Stone Miner's Bell Bearing [2]`,
    'Smithing Stone [4]': `Smithing-Stone Miner's Bell Bearing [2]`,
    'Smithing Stone [5]': `Smithing-Stone Miner's Bell Bearing [3]`,
    'Smithing Stone [6]': `Smithing-Stone Miner's Bell Bearing [3]`,
    'Smithing Stone [7]': `Smithing-Stone Miner's Bell Bearing [4]`,
    'Smithing Stone [8]': `Smithing-Stone Miner's Bell Bearing [4]`,
    'Ghost Glovewort [1]': `Ghost-Glovewort Picker's Bell Bearing [1]`,
    'Ghost Glovewort [2]': `Ghost-Glovewort Picker's Bell Bearing [1]`,
    'Ghost Glovewort [3]': `Ghost-Glovewort Picker's Bell Bearing [1]`,
    'Ghost Glovewort [4]': `Ghost-Glovewort Picker's Bell Bearing [2]`,
    'Ghost Glovewort [5]': `Ghost-Glovewort Picker's Bell Bearing [2]`,
    'Ghost Glovewort [6]': `Ghost-Glovewort Picker's Bell Bearing [2]`,
    'Ghost Glovewort [7]': `Ghost-Glovewort Picker's Bell Bearing [3]`,
    'Ghost Glovewort [8]': `Ghost-Glovewort Picker's Bell Bearing [3]`,
    'Ghost Glovewort [9]': `Ghost-Glovewort Picker's Bell Bearing [3]`,
    'Grave Glovewort [1]': `Glovewort Picker's Bell Bearing [1]`,
    'Grave Glovewort [2]': `Glovewort Picker's Bell Bearing [1]`,
    'Grave Glovewort [3]': `Glovewort Picker's Bell Bearing [1]`,
    'Grave Glovewort [4]': `Glovewort Picker's Bell Bearing [2]`,
    'Grave Glovewort [5]': `Glovewort Picker's Bell Bearing [2]`,
    'Grave Glovewort [6]': `Glovewort Picker's Bell Bearing [2]`,
    'Grave Glovewort [7]': `Glovewort Picker's Bell Bearing [3]`,
    'Grave Glovewort [8]': `Glovewort Picker's Bell Bearing [3]`,
    'Grave Glovewort [9]': `Glovewort Picker's Bell Bearing [3]`,
  } as const;

  const bellNameLocation = {
    "Smithing-Stone Miner's Bell Bearing [1]": {
      boss: {
        bossName: 'Crystalian (Raya Lucaria Crystal Tunnel)',
        killed: events.find((e) => e.id === 32020800)?.on === true,
      },
    },
    "Smithing-Stone Miner's Bell Bearing [2]": { location: 'Sealed Tunnel' },
    "Smithing-Stone Miner's Bell Bearing [3]": { location: 'Zamor Ruins' },
    "Smithing-Stone Miner's Bell Bearing [4]": {
      boss: {
        bossName: 'Godskin Duo',
        killed: events.find((e) => e.id === 13000850)?.on === true,
      },
    },
    "Somberstone Miner's Bell Bearing [1]": {
      boss: {
        bossName: 'Fallingstar Beast (Sellia Crystal Tunnel)',
        killed: events.find((e) => e.id === 32080800)?.on === true,
      },
    },
    "Somberstone Miner's Bell Bearing [2]": {
      boss: {
        bossName: 'Crystalian Spear and Crystalian Ringblade (Altus Tunnel)',
        killed: events.find((e) => e.id === 32050800)?.on === true,
      },
    },
    "Somberstone Miner's Bell Bearing [3]": {
      location: 'First Church of Marika',
      region: 'Mountaintops of the Giants',
    },
    "Somberstone Miner's Bell Bearing [4]": {
      location: 'Crumbling Farum Azula',
    },
    "Somberstone Miner's Bell Bearing [5]": {
      location: 'Crumbling Farum Azula',
    },
    "Ghost-Glovewort Picker's Bell Bearing [1]": {
      location: 'Nokron, Eternal City',
    },
    "Ghost-Glovewort Picker's Bell Bearing [2]": {
      location: 'Nokstella, Eternal City',
    },
    "Ghost-Glovewort Picker's Bell Bearing [3]": {
      location: 'Elphael, Brace of the Haligtree',
    },
    "Glovewort Picker's Bell Bearing [1]": {
      location: 'Nokron, Eternal City',
    },
    "Glovewort Picker's Bell Bearing [2]": {
      location: 'Nokstella, Eternal City',
    },
    "Glovewort Picker's Bell Bearing [3]": {
      location: 'Elphael, Brace of the Haligtree',
    },
  };

  const maxPowerMaterialOwned =
    (inventoryQuantityById.get(
      ERDB.bolstering['Ancient Dragon Smithing Stone'].id
    ) ?? 0) +
    (inventoryQuantityById.get(
      ERDB.bolstering['Ancient Dragon Smithing Stone'].id
    ) ?? 0) +
    (inventoryQuantityById.get(ERDB.bolstering['Great Ghost Glovewort'].id) ??
      0) +
    (inventoryQuantityById.get(ERDB.bolstering['Great Grave Glovewort'].id) ??
      0);

  const baseFlaskItem = ERDB.tools['Flask of Crimson Tears'];

  const usersFlask =
    Array.from({ length: 12 })
      .map(
        (_, i) =>
          ERDB.tools[
            `${baseFlaskItem.name}${i == 0 ? '' : ` +${(i + 1).toString()}`}`
          ]
      )
      .toReversed()
      .find((flask) => (inventoryQuantityById.get(flask.id) ?? 0) > 0) ??
    baseFlaskItem;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 overflow-hidden p-2 sm:p-4">
        <SlotOverview />
        <Card className="">
          <CardHeader>
            <CardTitle>Flasks</CardTitle>
            <CardDescription>5 / 20 - (35%)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <FlaskItem item={usersFlask} iconType="tools" max={14} />
            <Separator />
            <FlaskItem
              item={ERDB.tools['Flask of Cerulean Tears']}
              iconType="tools"
              max={14}
            />
            <Separator />
            <FlaskItem
              item={ERDB.bolstering['Golden Seed']}
              iconType="bolstering-materials"
              max={30}
            />
            <Separator />
            <FlaskItem
              item={ERDB.bolstering['Sacred Tear']}
              iconType="bolstering-materials"
              max={12}
            />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Upgrade Materials</CardTitle>
            <CardDescription>
              {maxPowerMaterialOwned} / 31 - (
              {Math.round((maxPowerMaterialOwned / 31) * 100)}%) Max Power
              Materials
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-full overflow-hidden">
            <ScrollArea className="w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Power</TableHead>
                    <TableHead>Stone</TableHead>
                    <TableHead>Somber</TableHead>
                    <TableHead>Grave</TableHead>
                    <TableHead>Ghost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, i) => {
                    const smithingStone =
                      i < 9
                        ? (ERDB.bolstering as Record<string, Bolstering>)[
                            i == 8
                              ? 'Ancient Dragon Smithing Stone'
                              : `Smithing Stone [${(i + 1).toString()}]`
                          ]
                        : undefined;
                    const somberSmithingStone =
                      i < 10
                        ? (ERDB.bolstering as Record<string, Bolstering>)[
                            i == 9
                              ? 'Somber Ancient Dragon Smithing Stone'
                              : `Somber Smithing Stone [${(i + 1).toString()}]`
                          ]
                        : undefined;
                    const ghostGlovewart =
                      i < 10
                        ? (ERDB.bolstering as Record<string, Bolstering>)[
                            i == 9
                              ? 'Great Ghost Glovewort'
                              : `Ghost Glovewort [${(i + 1).toString()}]`
                          ]
                        : undefined;
                    const graveGlovewart =
                      i < 10
                        ? (ERDB.bolstering as Record<string, Bolstering>)[
                            i == 9
                              ? 'Great Grave Glovewort'
                              : `Grave Glovewort [${(i + 1).toString()}]`
                          ]
                        : undefined;

                    return (
                      <TableRow key={i}>
                        <TableCell>+{i + 1}</TableCell>
                        {[
                          smithingStone,
                          somberSmithingStone,
                          graveGlovewart,
                          ghostGlovewart,
                        ].map((item, i) => {
                          const bellBearingName =
                            item && item.name in materialToBellBearings
                              ? materialToBellBearings[
                                  item.name as keyof typeof materialToBellBearings
                                ]
                              : undefined;

                          const bellBearing =
                            bellBearingName && ERDB.shop[bellBearingName];

                          const bellLocation =
                            bellBearing && bellNameLocation[bellBearingName];
                          const bellOwned =
                            ((bellBearing &&
                              inventoryQuantityById.get(bellBearing.id)) ??
                              0) > 0 ||
                            (bellLocation &&
                              'boss' in bellLocation &&
                              bellLocation.boss.killed);

                          const imgSrc =
                            item &&
                            new URL(
                              `../../assets/erdb/icons/bolstering-materials/${item.icon.toString()}.png`,
                              import.meta.url
                            ).href;
                          return (
                            <TableCell key={i} className={cn('p-2')}>
                              <Tooltip>
                                <TooltipTrigger
                                  className={cn(
                                    'flex items-center rounded-lg p-1',
                                    bellOwned
                                      ? 'border border-green-300/50'
                                      : ''
                                  )}
                                >
                                  <div className="flex flex-wrap items-center justify-center gap-1">
                                    {item && (
                                      <>
                                        <img className="size-8" src={imgSrc} />

                                        <span className="w-10 whitespace-nowrap">
                                          {inventoryQuantityById.get(item.id) ??
                                            0}
                                          {item.name ==
                                            'Ancient Dragon Smithing Stone' &&
                                            ' / 13'}
                                          {item.name ==
                                            'Somber Ancient Dragon Smithing Stone' &&
                                            ' / 8'}
                                          {item.name ==
                                            'Great Grave Glovewort' && ' / 6'}
                                          {item.name ==
                                            'Great Ghost Glovewort' && ' / 4'}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="flex max-w-72 flex-col items-center">
                                  <img src={imgSrc} className="size-40" />
                                  <p className="text-lg">{item?.name}</p>
                                  {bellLocation && (
                                    <>
                                      <br />
                                      <p className="w-full text-wrap text-center">
                                        Bell bearing found{' '}
                                        {'boss' in bellLocation
                                          ? `from boss ${bellLocation.boss.bossName}`
                                          : `in ${bellLocation.location}`}
                                      </p>
                                    </>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function FlaskItem({
  item,
  iconType,
  max,
}: {
  item: Bolstering | Tool;
  iconType: 'tools' | 'bolstering-materials';
  max: number;
}) {
  const slot = useSelectedSlot();
  const inventoryQuantityById = new Map(
    slot
      ? inventoryDbView(slot).items.map((item) => [item.item_id, item.quantity])
      : []
  );

  const imgSrc = new URL(
    `../../assets/erdb/icons/${iconType == 'tools' ? 'tools' : 'bolstering-materials'}/${item.icon.toString()}.png`,
    import.meta.url
  ).href;
  return (
    <div className="flex items-center justify-between gap-10 rounded-lg transition-colors hover:bg-muted/50">
      <Tooltip>
        <TooltipTrigger>
          <img className="size-12" src={imgSrc} />
        </TooltipTrigger>
        <TooltipContent>
          <img className="size-40" src={imgSrc} />
        </TooltipContent>
      </Tooltip>
      <div className="flex flex-col items-end p-2">
        <p>{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {inventoryQuantityById.get(item.id) ?? 0} / {max}
        </p>
      </div>
    </div>
  );
}
