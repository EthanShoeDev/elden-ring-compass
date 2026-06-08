import { GOODS } from '@elden-ring-compass/data';
import { itemIconThumbUrl, itemIconUrl } from '@elden-ring-compass/data/images';
import { Link } from '@tanstack/react-router';
import {
  CoinsIcon,
  MapIcon,
  PackageIcon,
  SkullIcon,
  SwordIcon,
  type LucideIcon,
} from 'lucide-react';

import { goodsByName } from '@/lib/game-data';
import { assertDefined, cn } from '@/lib/utils';
import { eventsDbView } from '@/lib/vm/events';
import { inventoryDbView } from '@/lib/vm/inventory';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { ActiveEffectsCard } from './active-effects-card';
import { CompletionBreakdown, CompletionHero } from './completion-overview';
import { EquipmentCard } from './equipment-card';
import { RegionsDataTable } from './regions-data-table';
import { ConnectSaveButton } from '../misc/save-file-source-selector';
import { TooltipImg } from '../misc/tooltip-img';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

/** An at-a-glance stat tile (top row of the run dashboard). */
function Tile({
  icon: Icon,
  label,
  value,
  sub,
  locked,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  locked?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl border border-border bg-card p-4',
        locked && 'opacity-60',
      )}
    >
      <div className='flex items-center justify-between'>
        <span className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
          {label}
        </span>
        <Icon className='size-[18px] text-muted-foreground' />
      </div>
      <div className='text-2xl font-semibold tabular-nums'>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className='text-[11.5px] text-muted-foreground'>{sub}</div>}
    </div>
  );
}

/** Empty state — connect hero + locked tiles, shown when no save is loaded. */
function OverviewEmpty() {
  return (
    <>
      <div className='flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center'>
        <span className='flex size-14 items-center justify-center rounded-xl border border-border bg-muted'>
          <SwordIcon className='size-7' />
        </span>
        <h3 className='text-xl font-semibold tracking-tight'>Track your journey</h3>
        <p className='max-w-xl text-sm leading-relaxed text-muted-foreground'>
          Connect a save file and this becomes your personal run dashboard — bosses defeated, items
          collected, equipped loadout, active effects, character stats, and discovered map
          locations, all updating live as you play. No save? Explore the world map and full item
          catalog freely.
        </p>
        <div className='flex flex-wrap justify-center gap-2'>
          <ConnectSaveButton />
          <Button variant='outline' render={<Link to='/' />}>
            <MapIcon /> Explore the map
          </Button>
        </div>
      </div>
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <Tile locked icon={SkullIcon} label='Bosses Defeated' value='—' sub='Connect to track' />
        <Tile locked icon={SwordIcon} label='Rune Level' value='—' sub='Connect to track' />
        <Tile locked icon={PackageIcon} label='Items Collected' value='—' sub='Connect to track' />
        <Tile locked icon={CoinsIcon} label='Runes Held' value='—' sub='Connect to track' />
      </div>
    </>
  );
}

export function OverviewSection() {
  const slot = useSelectedSlot();

  if (!slot) return <OverviewEmpty />;

  const inventoryQuantityById = new Map(
    slot ? inventoryDbView(slot).items.map((item) => [item.item_id, item.quantity]) : [],
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

  const ownedByName = (name: string) =>
    inventoryQuantityById.get(goodsByName.get(name)?.id ?? -1) ?? 0;

  const maxPowerMaterialOwned =
    ownedByName('Ancient Dragon Smithing Stone') +
    ownedByName('Somber Ancient Dragon Smithing Stone') +
    ownedByName('Great Ghost Glovewort') +
    ownedByName('Great Grave Glovewort');

  const baseFlaskItem = assertDefined(
    goodsByName.get('Flask of Crimson Tears'),
    'Flask of Crimson Tears missing from data',
  );

  const usersFlask =
    Array.from({ length: 12 })
      .map((_, i) =>
        goodsByName.get(`${baseFlaskItem.name}${i == 0 ? '' : ` +${(i + 1).toString()}`}`),
      )
      .filter((flask) => flask !== undefined)
      .toReversed()
      .find((flask) => (inventoryQuantityById.get(flask.id) ?? 0) > 0) ?? baseFlaskItem;

  const ceruleanFlask = assertDefined(
    goodsByName.get('Flask of Cerulean Tears'),
    'Flask of Cerulean Tears missing from data',
  );

  return (
    <>
      <CompletionHero />
      <CompletionBreakdown />

      <div className='grid gap-5 lg:grid-cols-2'>
        <EquipmentCard />
        <ActiveEffectsCard />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flasks</CardTitle>
          <CardDescription>
            Flask charges, seeds, sacred tears &amp; physick crystal tears
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-1'>
          <FlaskItem item={usersFlask} max={14} />
          <Separator />
          <FlaskItem item={ceruleanFlask} max={14} />
          <Separator />
          <FlaskItem item={goodsByName.get('Golden Seed')} max={30} />
          <Separator />
          <FlaskItem item={goodsByName.get('Sacred Tear')} max={12} />
          <Separator />
          <WondrousPhysick />
        </CardContent>
      </Card>

      <Card className='overflow-hidden'>
        <CardHeader>
          <CardTitle>Upgrade Materials</CardTitle>
          <CardDescription>
            {maxPowerMaterialOwned} / 31 - ({Math.round((maxPowerMaterialOwned / 31) * 100)}%) Max
            Power Materials
          </CardDescription>
        </CardHeader>
        <CardContent className='max-w-full overflow-hidden'>
          <ScrollArea className='w-full'>
            <Table className='w-full'>
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
                      ? goodsByName.get(
                          i == 8
                            ? 'Ancient Dragon Smithing Stone'
                            : `Smithing Stone [${(i + 1).toString()}]`,
                        )
                      : undefined;
                  const somberSmithingStone =
                    i < 10
                      ? goodsByName.get(
                          i == 9
                            ? 'Somber Ancient Dragon Smithing Stone'
                            : `Somber Smithing Stone [${(i + 1).toString()}]`,
                        )
                      : undefined;
                  const ghostGlovewart =
                    i < 10
                      ? goodsByName.get(
                          i == 9
                            ? 'Great Ghost Glovewort'
                            : `Ghost Glovewort [${(i + 1).toString()}]`,
                        )
                      : undefined;
                  const graveGlovewart =
                    i < 10
                      ? goodsByName.get(
                          i == 9
                            ? 'Great Grave Glovewort'
                            : `Grave Glovewort [${(i + 1).toString()}]`,
                        )
                      : undefined;

                  return (
                    <TableRow key={i}>
                      <TableCell>+{i + 1}</TableCell>
                      {[smithingStone, somberSmithingStone, graveGlovewart, ghostGlovewart].map(
                        (item, i) => {
                          const bellBearingName =
                            item && item.name in materialToBellBearings
                              ? materialToBellBearings[
                                  item.name as keyof typeof materialToBellBearings
                                ]
                              : undefined;

                          const bellBearing = bellBearingName && goodsByName.get(bellBearingName);

                          const bellLocation = bellBearing && bellNameLocation[bellBearingName];
                          const bellOwned =
                            ((bellBearing && inventoryQuantityById.get(bellBearing.id)) ?? 0) > 0 ||
                            (bellLocation && 'boss' in bellLocation && bellLocation.boss.killed);

                          const imgSrc = item && itemIconUrl(item.icon);
                          return (
                            <TableCell key={i} className={cn('p-2')}>
                              <Tooltip>
                                <TooltipTrigger
                                  className={cn(
                                    'flex items-center rounded-lg p-1',
                                    bellOwned ? 'border border-green-300/50' : '',
                                  )}
                                >
                                  <div className='flex flex-wrap items-center justify-center gap-1'>
                                    {item && (
                                      <>
                                        <img className='size-8' src={imgSrc} alt={item.name} />

                                        <span className='w-10 whitespace-nowrap'>
                                          {inventoryQuantityById.get(item.id) ?? 0}
                                          {item.name == 'Ancient Dragon Smithing Stone' && ' / 13'}
                                          {item.name == 'Somber Ancient Dragon Smithing Stone' &&
                                            ' / 8'}
                                          {item.name == 'Great Grave Glovewort' && ' / 6'}
                                          {item.name == 'Great Ghost Glovewort' && ' / 4'}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className='flex max-w-72 flex-col items-center'>
                                  <img
                                    loading='lazy'
                                    src={imgSrc}
                                    className='size-40'
                                    alt={item?.name ?? ''}
                                  />
                                  <p className='text-lg'>{item?.name}</p>
                                  {bellLocation && (
                                    <>
                                      <br />
                                      <p className='w-full text-wrap text-center'>
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
                        },
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* World discovery — regions are a completion stat, surfaced here rather
          than in their own nav slot (they have no map markers to browse to). */}
      <RegionsDataTable />
    </>
  );
}

/**
 * Wondrous Physick crystal-tear collection — every tear rendered as an icon (owned highlighted,
 * missing dimmed + grayscale), with a name + collected-status tooltip. The two tears you mix into
 * the physick come from this set, so it sits with the flasks.
 */
function WondrousPhysick() {
  const slot = useSelectedSlot();
  const quantityById = new Map(
    slot ? inventoryDbView(slot).items.map((item) => [item.item_id, item.quantity]) : [],
  );
  const tears = GOODS.filter((g) => g.category === 'Crystal Tear' && !g.name.startsWith('[ERROR]'));
  const ownedCount = tears.filter((t) => (quantityById.get(t.id) ?? 0) > 0).length;
  const physick = goodsByName.get('Flask of Wondrous Physick');

  return (
    <div className='flex flex-col gap-2 pt-1'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          {physick && <img src={itemIconUrl(physick.icon) ?? ''} alt='' className='size-8' />}
          <span className='text-sm font-medium'>Flask of Wondrous Physick</span>
        </div>
        <span className='text-sm text-muted-foreground tabular-nums'>
          {ownedCount} / {tears.length}
        </span>
      </div>
      <div className='flex flex-wrap gap-1.5'>
        {tears.map((tear) => {
          const owned = (quantityById.get(tear.id) ?? 0) > 0;
          return (
            <Tooltip key={tear.id}>
              <TooltipTrigger
                className={cn(
                  'rounded-md p-0.5 transition-opacity',
                  owned ? 'border border-green-300/50' : 'opacity-30 grayscale',
                )}
              >
                <img src={itemIconUrl(tear.icon) ?? ''} alt={tear.name} className='size-8' />
              </TooltipTrigger>
              <TooltipContent className='flex max-w-60 flex-col items-center gap-1'>
                <img loading='lazy' src={itemIconUrl(tear.icon) ?? ''} alt='' className='size-28' />
                <p className='text-center'>{tear.name}</p>
                <p className='text-xs text-muted-foreground'>
                  {owned ? 'Collected' : 'Not collected'}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function FlaskItem({
  item,
  max,
}: {
  item: { id: number; name: string; icon: number } | undefined;
  max: number;
}) {
  const slot = useSelectedSlot();
  const inventoryQuantityById = new Map(
    slot ? inventoryDbView(slot).items.map((item) => [item.item_id, item.quantity]) : [],
  );

  if (!item) return null;
  const imgSrc = itemIconUrl(item.icon) ?? '';
  return (
    <div className='flex items-center justify-between gap-10 rounded-lg transition-colors hover:bg-muted/50'>
      <TooltipImg imgSrc={imgSrc} thumbSrc={itemIconThumbUrl(item.icon)} />
      <div className='flex flex-col items-end p-2'>
        <p>{item.name}</p>
        <p className='text-sm text-muted-foreground'>
          {inventoryQuantityById.get(item.id) ?? 0} / {max}
        </p>
      </div>
    </div>
  );
}
