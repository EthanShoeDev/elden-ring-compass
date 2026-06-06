import { TableId } from '@/components/data-table/data-table-store';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { useMemo } from 'react';
import {
  type InventoryRow,
  type InventoryTableType,
  useInventoryTables,
} from './inventory-catalog';
import { eventsDbView } from './vm/events';
import { regionsDbView } from './vm/regions';

export function useDataTableData(tableId: 'events'): ReturnType<typeof eventsDbView>;
export function useDataTableData(tableId: 'regions'): ReturnType<typeof regionsDbView>;
export function useDataTableData(tableId: InventoryTableType): Array<InventoryRow>;
export function useDataTableData(
  tableId: TableId,
): ReturnType<typeof eventsDbView> | ReturnType<typeof regionsDbView> | Array<InventoryRow> {
  const slot = useSelectedSlot();
  const allTables = useInventoryTables();

  const items = useMemo(() => {
    if (tableId == 'events') return eventsDbView(slot);
    if (tableId == 'regions') return regionsDbView(slot);
    // 'weapons', 'weapon-calculator' and 'bosses' serve their own data (see
    // weapons-data-table.tsx / weapon-ar-calculator.tsx / bosses-data-table.tsx),
    // not the save-driven inventory join, so they never reach this hook.
    if (tableId == 'weapons' || tableId == 'weapon-calculator' || tableId == 'bosses') return [];
    return allTables[tableId].items;
  }, [slot, tableId, allTables]);

  return items;
}
