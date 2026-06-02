import { TableId } from '@/components/data-table/data-table-store';
import { InventoryTableType } from '@/components/sections/inventory-data-table-card';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { useMemo } from 'react';
import { InventoryItem, useAllErdb } from './erdb';
import { eventsDbView } from './vm/events';
import { regionsDbView } from './vm/regions';

export function useDataTableData(tableId: 'events'): ReturnType<typeof eventsDbView>;
export function useDataTableData(tableId: 'regions'): ReturnType<typeof regionsDbView>;
export function useDataTableData(tableId: InventoryTableType): Array<InventoryItem>;
export function useDataTableData(
  tableId: TableId,
): ReturnType<typeof eventsDbView> | ReturnType<typeof regionsDbView> | Array<InventoryItem> {
  const slot = useSelectedSlot();
  const allErdb = useAllErdb();

  const items = useMemo(() => {
    if (tableId == 'events') return eventsDbView(slot);
    if (tableId == 'regions') return regionsDbView(slot);
    // 'weapons' is served by its own effect-atom (see weapons-data-table.tsx),
    // not the save-driven inventory join, so it never reaches this hook.
    if (tableId == 'weapons') return [];
    return allErdb[tableId].items;
  }, [slot, tableId, allErdb]);

  return items;
}
