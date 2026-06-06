import { BOSSES, eventFlagOffset } from '@elden-ring-compass/data';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

import type { MasterPixel } from '@/lib/map-affine';
import { bossFlagToPixel } from '@/lib/vm/map-pins';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { commonAccessorColumnDef, commonPinColumnDef } from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type BossRow = {
  id: number; // the boss's defeat-flag id (unique)
  name: string;
  mapId: string;
  // Present only for bosses with an extracted overworld position — those rows are
  // pinnable; the rest render a muted dash in the pin column.
  pixel?: MasterPixel;
  defeated: boolean | null;
};

/**
 * Every boss in the game (extracted arena/defeat-flag list — ~200 rows, not just
 * the curated story bosses in the gallery above). Each row's pin drops the boss
 * on the interactive map (when it has an extracted position); connect a save to
 * light up the Defeated column. Mirrors the design kit's all-bosses table.
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
      out.push({
        id: b.defeatFlagId,
        name: b.name,
        mapId: b.mapId,
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
      commonAccessorColumnDef(helper, 'mapId', 'Map'),
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
          {' · '}filter by name or map, then tap the pin to drop a boss on the map.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable tableId='bosses' columns={columns} data={rows} />
      </CardContent>
    </Card>
  );
}
