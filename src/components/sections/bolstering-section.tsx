import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { inventoryDbView } from '@/lib/vm/inventory';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { Bolstering, ERDB } from '@/lib/erdb';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { eventsDbView } from '@/lib/vm/events';
import { cn } from '@/lib/utils';

export function BolsteringSection() {
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
        killed: events.find((e) => e.eventId === 32020800)?.on === 'on',
      },
    },
    "Smithing-Stone Miner's Bell Bearing [2]": { location: 'Sealed Tunnel' },
    "Smithing-Stone Miner's Bell Bearing [3]": { location: 'Zamor Ruins' },
    "Smithing-Stone Miner's Bell Bearing [4]": {
      boss: {
        bossName: 'Godskin Duo',
        killed: events.find((e) => e.eventId === 13000850)?.on === 'on',
      },
    },
    "Somberstone Miner's Bell Bearing [1]": {
      boss: {
        bossName: 'Fallingstar Beast (Sellia Crystal Tunnel)',
        killed: events.find((e) => e.eventId === 32080800)?.on === 'on',
      },
    },
    "Somberstone Miner's Bell Bearing [2]": {
      boss: {
        bossName: 'Crystalian Spear and Crystalian Ringblade (Altus Tunnel)',
        killed: events.find((e) => e.eventId === 32050800)?.on === 'on',
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bolstering Materials</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Card className="">
          <CardHeader>
            <CardTitle>Flasks</CardTitle>
            <CardDescription></CardDescription>
            <CardContent>
              {/* {JSON.stringify(ERDB.bolstering['Golden Seed'])} */}
              {/* {JSON.stringify(ERDB.bolstering['Sacred Tear'])} */}
              {/* {JSON.stringify(ERDB.tools['Flask of Cerulean Tears'])} */}
              {/* Flask of Crimson Tears */}
              {/* Flask of Wondrous Physick */}
              {/* {JSON.stringify(ERDB.tools['Golden Rune [11]'])} */}
              {/* {JSON.stringify(ERDB.tools['Spectral Steed Whistle'])} */}
              {/* {JSON.stringify(ERDB.tools['Wraith Calling Bell'])} */}
            </CardContent>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Materials</CardTitle>
            <CardDescription>2 / 3 - Smiting Stones for RH</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableHead>Power</TableHead>
                <TableHead>Stone</TableHead>
                <TableHead>Somber</TableHead>
                <TableHead>Grave</TableHead>
                <TableHead>Ghost</TableHead>
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
                        return (
                          <TableCell key={i} className={cn('p-2')}>
                            <Tooltip>
                              <TooltipTrigger
                                className={cn(
                                  'flex items-center rounded-lg p-1',
                                  bellOwned ? 'border border-green-500' : ''
                                )}
                              >
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  {item && (
                                    <>
                                      <img
                                        className="size-8"
                                        src={
                                          new URL(
                                            `../../assets/erdb/icons/bolstering-materials/${item.icon.toString()}.png`,
                                            import.meta.url
                                          ).href
                                        }
                                      />

                                      <span className="w-10 whitespace-nowrap">
                                        {inventoryQuantityById.get(item.id) ??
                                          0}
                                        {item.name ==
                                          'Ancient Dragon Smithing Stone' &&
                                          ' / 13'}
                                        {item.name ==
                                          'Somber Ancient Dragon Smithing Stone' &&
                                          ' / 8'}
                                        {item.name == 'Great Grave Glovewort' &&
                                          ' / 6'}
                                        {item.name == 'Great Ghost Glovewort' &&
                                          ' / 4'}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="flex flex-col">
                                <p className="text-lg">{item?.name}</p>
                                {bellLocation && (
                                  <p>
                                    Bell bearing found{' '}
                                    {'boss' in bellLocation
                                      ? `from boss ${bellLocation.boss.bossName}`
                                      : `in ${bellLocation.location}`}
                                  </p>
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
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
