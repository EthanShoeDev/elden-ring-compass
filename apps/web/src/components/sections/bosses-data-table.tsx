import { BOSSES, eventFlagOffset } from '@elden-ring-compass/data';
import { ColumnDef, createColumnHelper, Row } from '@tanstack/react-table';
import { useMemo } from 'react';

import { type BossBadge, BADGE_LABEL, bossBadges, bossMapName, bossReward } from '@/lib/boss-meta';
import type { MasterPixel } from '@/lib/map-affine';
import { bossFlagToPixel } from '@/lib/vm/map-pins';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { commonAccessorColumnDef, commonPinColumnDef } from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BossBadges } from './boss-badge';

type BossRow = {
  id: number; // the boss's defeat-flag id (unique)
  name: string;
  mapName: string;
  // The boss's category, most-significant badge first (Demigod / Shardbearer /
  // Legend / Great Enemy / Field / Dungeon). `category` is the primary badge's
  // label, used for sorting + the faceted filter.
  category: string;
  badges: BossBadge[];
  // Remembrance (or Heart of Bayle) reward, blank for the ~85% that drop neither.
  reward: string;
  rewardIcon?: string;
  runes: number;
  // Present only for bosses with an extracted overworld position — those rows are
  // pinnable; the rest render a muted dash in the pin column.
  pixel?: MasterPixel;
  defeated: boolean | null;
};

// Cell renderers kept at module scope (not redefined per render) so the table's
// column defs stay stable and don't trip react/no-unstable-nested-components.
const renderCategoryCell = ({ row }: { row: Row<BossRow> }) => (
  <BossBadges badges={row.original.badges} />
);

const renderRewardCell = ({ row }: { row: Row<BossRow> }) =>
  row.original.reward ? (
    <div className='flex items-center gap-1.5'>
      {row.original.rewardIcon && (
        <img src={row.original.rewardIcon} alt='' className='size-6 shrink-0' />
      )}
      <span className='text-xs'>{row.original.reward}</span>
    </div>
  ) : (
    <span className='text-muted-foreground'>—</span>
  );

const renderRunesCell = ({ row }: { row: Row<BossRow> }) => (
  <span className='font-mono text-xs tabular-nums'>
    {row.original.runes > 0 ? row.original.runes.toLocaleString() : '—'}
  </span>
);

/**
 * Every boss in the game (extracted arena/defeat-flag list — ~210 rows, not just
 * the curated story bosses in the gallery above). Each row's pin drops the boss
 * on the interactive map (when it has an extracted position); connect a save to
 * light up the Defeated column. The Map column shows a readable place name, the
 * Category column the wiki classification, and Reward/Runes what the kill grants.
 */
export function BossesDataTable() {
  const slot = useSelectedSlot();
  const connected = !!slot;

  const rows = useMemo<Array<BossRow>>(() => {
    // Read a boss defeat flag straight from the save bitfield (same approach as
    // the story-boss gallery), so the table reflects your run live.
    const isDefeated = (flagId: number): boolean => {
      if (!slot) return false;
      const offset = eventFlagOffset(flagId);
      if (!offset) return false;
      return ((slot.event_flags.flags[offset[0]] ?? 0) & (1 << offset[1])) !== 0;
    };

    const seen = new Set<number>();
    const out: Array<BossRow> = [];
    for (const b of BOSSES) {
      if (!b.name || seen.has(b.defeatFlagId)) continue;
      seen.add(b.defeatFlagId);
      const badges = bossBadges(b.defeatFlagId, b.mapId);
      const reward = bossReward(b.defeatFlagId);
      out.push({
        id: b.defeatFlagId,
        name: b.name,
        mapName: bossMapName(b.mapId),
        category: badges[0] ? BADGE_LABEL[badges[0]] : '',
        badges,
        reward: reward?.name ?? '',
        rewardIcon: reward?.iconUrl,
        runes: b.runes,
        pixel: bossFlagToPixel.get(b.defeatFlagId),
        defeated: connected ? isDefeated(b.defeatFlagId) : null,
      });
    }
    return out;
  }, [slot, connected]);

  const columns = useMemo<Array<ColumnDef<BossRow>>>(() => {
    const helper = createColumnHelper<BossRow>();
    const cols: Array<ColumnDef<BossRow>> = [
      commonPinColumnDef(helper),
      commonAccessorColumnDef(helper, 'name', 'Name', { filterFn: 'includesString' }),
      commonAccessorColumnDef(helper, 'mapName', 'Map', { filterFn: 'includesString' }),
      commonAccessorColumnDef(helper, 'category', 'Category', { cell: renderCategoryCell }),
      commonAccessorColumnDef(helper, 'reward', 'Reward', { cell: renderRewardCell }),
      commonAccessorColumnDef(helper, 'runes', 'Runes', {
        enableColumnFilter: false,
        cell: renderRunesCell,
      }),
    ];
    if (connected) cols.push(commonAccessorColumnDef(helper, 'defeated', 'Defeated'));
    return cols;
  }, [connected]);

  const defeatedCount = rows.filter((r) => r.defeated).length;

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>All Bosses</CardTitle>
        <CardDescription>
          {connected
            ? `${defeatedCount} / ${rows.length} - (${Math.round((defeatedCount / rows.length) * 100)}% defeated)`
            : `${rows.length} bosses in the game`}
          {' · '}filter by name, map, category or reward, then tap the pin to drop a boss on the
          map.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable tableId='bosses' columns={columns} data={rows} />
      </CardContent>
    </Card>
  );
}
