import {
  commonAccessorColumnDef,
  commonSelectColumnDef,
} from '@/components/data-table/common-column-defs';
import { DataTable } from '@/components/data-table/data-table';
import { TooltipImg } from '@/components/misc/tooltip-img';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { useDataTableData } from '@/lib/data-table-data';
import {
  Ammo,
  Armament,
  Armor,
  Ashes,
  Bolstering,
  Crafting,
  ERDB,
  Gesture,
  Info,
  KeyItem,
  Shop,
  Spell,
  Spirit,
  Talisman,
  Tool,
  useAllErdb,
} from '@/lib/erdb';
import { MapItem } from '@/lib/map-db';
import {
  ColumnDef,
  ColumnHelper,
  createColumnHelper,
} from '@tanstack/react-table';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useTableSelection = create<{
  table: InventoryTableType;
  setTableType: (table: InventoryTableType) => void;
}>()(
  persist(
    (set) => ({
      table: 'armaments',
      setTableType: (table) => {
        set({ table });
      },
    }),
    {
      name: 'inventory-table-selection',
    }
  )
);

export function InventoryDataTableCard() {
  const { table, setTableType } = useTableSelection();
  const allErdb = useAllErdb();

  const items = useDataTableData(table);
  const ownedCount = allErdb[table].ownedCount;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <Combobox
            placeholder="Filter by category"
            valueState={[
              table,
              (val) => {
                if (!val) return;
                setTableType(val as InventoryTableType);
              },
            ]}
            emptyLabel=""
            items={Object.entries(tables).map(([tableId, info]) => {
              const table = tableId as keyof typeof ERDB;
              const ownedCount = allErdb[table].ownedCount;
              const items = allErdb[table].items;
              return {
                label: info.label,
                value: table,
                dropDownItem: (
                  <>
                    <span>{info.label}</span>
                    <span className="ml-auto font-mono text-muted-foreground">
                      {ownedCount}/{items.length} (
                      {((ownedCount / items.length) * 100)
                        .toFixed(0)
                        .padStart(2, ' ')}
                      %)
                    </span>
                  </>
                ),
              };
            })}
            triggerButtonClassName="text-2xl font-semibold h-auto"
          />
        </CardTitle>
        <CardDescription>
          {ownedCount} / {items.length}
          <br />
          {((ownedCount / items.length) * 100).toFixed(0)}% owned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          tableId={table}
          columns={tables[table].columns}
          data={items}
          initialColumnVisibility={{
            Description: false,
          }}
        />
      </CardContent>
    </Card>
  );
}

type InfoFromSlot = { quantity: number; map_data?: MapItem };
type DefaultItem = (
  | Ammo
  | Armament
  | Armor
  | Ashes
  | Bolstering
  | Crafting
  | Gesture
  | Info
  | KeyItem
  | Shop
  | Spell
  | Spirit
  | Talisman
  | Tool
) &
  InfoFromSlot;
function defaultColumns<T extends DefaultItem>(
  columnHelperT: ColumnHelper<T>,
  imgUrlFn: (icon: number) => string
): Array<ColumnDef<T>> {
  const columnHelperD = columnHelperT as unknown as ColumnHelper<DefaultItem>;
  return [
    commonSelectColumnDef(columnHelperD),
    commonAccessorColumnDef(columnHelperD, 'id', 'ID', {
      size: 1,
    }),
    columnHelperD.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        return (
          <div>
            <TooltipImg
              imgSrc={imgUrlFn(cell.row.original.icon)}
              alt={cell.row.original.name}
            />
          </div>
        );
      },
      enableHiding: true,
    }),
    commonAccessorColumnDef(columnHelperD, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelperD, 'quantity', 'Quantity'),
    commonAccessorColumnDef(columnHelperD, 'rarity', 'Rarity'),
    commonAccessorColumnDef(
      columnHelperD,
      (row) => !!row.map_data,
      'Has Coordinates'
    ),
  ] as unknown as Array<ColumnDef<T>>;
}

type AmmoItem = Ammo & InfoFromSlot;
const ammoColumns: Array<ColumnDef<AmmoItem>> = (() => {
  const columnHelper = createColumnHelper<AmmoItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/ammo/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(
      columnHelper,
      (row) =>
        row.effects
          .map(
            (e) =>
              `${e.attribute} ${e.type == 'positive' ? (e.model == 'additive' ? '+' : '* ') : e.model == 'additive' ? '-' : '* -'}${e.value.toString()}${e.conditions ? ` ${e.conditions.join(',')}` : ''}`
          )
          .join('\n'),
      'Effects'
    ),
  ];
})();

type ArmamentItem = Armament & InfoFromSlot & { weapon_upgrade_level: number };
const armColumns: Array<ColumnDef<ArmamentItem>> = (() => {
  const columnHelper = createColumnHelper<ArmamentItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/armaments/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(columnHelper, 'allow_ash_of_war', 'Allow AOW'),
    commonAccessorColumnDef(columnHelper, 'is_buffable', 'Buffable'),
    commonAccessorColumnDef(
      columnHelper,
      'weapon_upgrade_level',
      'Upgrade Level'
    ),
    commonAccessorColumnDef(columnHelper, 'weight', 'Weight'),
    commonAccessorColumnDef(
      columnHelper,
      'upgrade_material',
      'Upgrade Material'
    ),
    commonAccessorColumnDef(
      columnHelper,
      (row) =>
        row.effects
          .map(
            (e) =>
              `${e.attribute} ${e.type == 'positive' ? (e.model == 'additive' ? '+' : '* ') : e.model == 'additive' ? '-' : '* -'}${e.value.toString()}${e.conditions ? ` ${e.conditions.join(',')}` : ''}`
          )
          .join('\n'),
      'Effects'
    ),
  ];
})();

type ArmorItem = Armor & InfoFromSlot;
const armorColumns: Array<ColumnDef<ArmorItem>> = (() => {
  const columnHelper = createColumnHelper<ArmorItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/armor/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(columnHelper, 'weight', 'Weight'),
    commonAccessorColumnDef(
      columnHelper,
      (row) =>
        row.effects
          .map(
            (e) =>
              `${e.attribute} ${e.type == 'positive' ? (e.model == 'additive' ? '+' : '* ') : e.model == 'additive' ? '-' : '* -'}${e.value.toString()}${e.conditions ? ` ${e.conditions.join(',')}` : ''}`
          )
          .join('\n'),
      'Effects'
    ),
  ];
})();

type AshesItem = Ashes & InfoFromSlot;
const ashesColumns: Array<ColumnDef<AshesItem>> = (() => {
  const columnHelper = createColumnHelper<AshesItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/ashes-of-war/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.armament_categories.join(', '),
      'Armament Categories'
    ),
  ];
})();

type BolsteringItem = Bolstering & InfoFromSlot;
const bolsteringColumns: Array<ColumnDef<BolsteringItem>> = (() => {
  const columnHelper = createColumnHelper<BolsteringItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/bolstering-materials/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
  ];
})();

type CraftingItem = Crafting & InfoFromSlot;
const craftingColumns: Array<ColumnDef<CraftingItem>> = (() => {
  const columnHelper = createColumnHelper<CraftingItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/crafting-materials/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
  ];
})();

type GestureItem = Gesture & InfoFromSlot;
const gesturesColumns: Array<ColumnDef<GestureItem>> = (() => {
  const columnHelper = createColumnHelper<GestureItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/gestures/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
  ];
})();
type InfoItem = Info & InfoFromSlot;
const infoColumns: Array<ColumnDef<InfoItem>> = (() => {
  const columnHelper = createColumnHelper<InfoItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/info/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
  ];
})();
type KeyItemRow = KeyItem & InfoFromSlot;
const keyColumns: Array<ColumnDef<InfoItem>> = (() => {
  const columnHelper = createColumnHelper<KeyItemRow>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/keys/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
  ];
})();
type ShopItem = Shop & InfoFromSlot;
const shopColumns: Array<ColumnDef<ShopItem>> = (() => {
  const columnHelper = createColumnHelper<ShopItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/shop/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
  ];
})();
type SpellItem = Spell & InfoFromSlot;
const spellColumns: Array<ColumnDef<SpellItem>> = (() => {
  const columnHelper = createColumnHelper<SpellItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/spells/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(columnHelper, 'fp_cost', 'FP Cost'),
    commonAccessorColumnDef(columnHelper, 'sp_cost', 'SP Cost'),
    commonAccessorColumnDef(columnHelper, 'is_weapon_buff', 'Is Weapon Buff'),
  ];
})();
type SpiritItem = Spirit & InfoFromSlot;
const spiritColumns: Array<ColumnDef<SpiritItem>> = (() => {
  const columnHelper = createColumnHelper<SpiritItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/spirit-ashes/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'hp_cost', 'HP Cost'),
    commonAccessorColumnDef(columnHelper, 'fp_cost', 'FP Cost'),
    commonAccessorColumnDef(
      columnHelper,
      'upgrade_material',
      'Upgrade Material'
    ),
    commonAccessorColumnDef(columnHelper, 'summon_name', 'Summon Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.abilities.join(', '),
      'Abilities'
    ),
  ];
})();
type TalismanItem = Talisman & InfoFromSlot;
const talismanColumns: Array<ColumnDef<TalismanItem>> = (() => {
  const columnHelper = createColumnHelper<TalismanItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/talismans/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
    commonAccessorColumnDef(columnHelper, 'weight', 'Weight'),
    commonAccessorColumnDef(
      columnHelper,
      (row) =>
        row.effects
          .map(
            (e) =>
              `${e.attribute} ${e.type == 'positive' ? (e.model == 'additive' ? '+' : '* ') : e.model == 'additive' ? '-' : '* -'}${e.value.toString()}`
          )
          .join('\n'),
      'Effects'
    ),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.conflicts.join(', '),
      'Conflicts'
    ),
  ];
})();
type ToolItem = Tool & InfoFromSlot;
const toolColumns: Array<ColumnDef<ToolItem>> = (() => {
  const columnHelper = createColumnHelper<ToolItem>();

  return [
    ...defaultColumns(
      columnHelper,
      (icon) =>
        new URL(
          `../../assets/erdb/icons/tools/${icon.toString()}.png`,
          import.meta.url
        ).href
    ),
  ];
})();

const tables: Record<
  keyof typeof ERDB,
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: Array<ColumnDef<any>>;
    label: string;
  }
> = {
  ammo: {
    columns: ammoColumns,
    label: 'Ammo',
  },
  armaments: {
    label: 'Armaments',
    columns: armColumns,
  },
  armor: {
    label: 'Armor',
    columns: armorColumns,
  },
  ashes: {
    label: 'Ashes of War',
    columns: ashesColumns,
  },
  bolstering: {
    label: 'Bolstering Materials',
    columns: bolsteringColumns,
  },
  crafting: {
    label: 'Crafting',
    columns: craftingColumns,
  },
  gestures: {
    label: 'Gestures',
    columns: gesturesColumns,
  },
  info: {
    label: 'Info Items',
    columns: infoColumns,
  },
  keys: {
    label: 'Key Items',
    columns: keyColumns,
  },
  shop: {
    label: 'Shop Items',
    columns: shopColumns,
  },
  spells: {
    label: 'Spells',
    columns: spellColumns,
  },
  spirit: {
    label: 'Spirit Ashes',
    columns: spiritColumns,
  },
  talismans: {
    label: 'Talismans',
    columns: talismanColumns,
  },
  tools: {
    label: 'Tools',
    columns: toolColumns,
  },
};

export type InventoryTableType = keyof typeof tables;
