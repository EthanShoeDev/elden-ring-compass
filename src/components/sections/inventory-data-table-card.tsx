import {
  commonSelectColumnDef,
  commonAccessorColumnDef,
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
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useTableSelection = create<{
  table: TableType;
  setTableType: (table: TableType) => void;
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

  const items = allErdb[table].items;
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
                setTableType(val as TableType);
              },
            ]}
            emptyLabel=""
            items={Object.entries(tables).map(([table, info]) => {
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
type Quantity = { quantity: number | undefined };
type AmmoItem = Ammo & Quantity;
const ammoColumns: Array<ColumnDef<AmmoItem>> = (() => {
  const columnHelper = createColumnHelper<AmmoItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),

    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/ammo/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),
    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
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

type ArmamentItem = Armament & Quantity & { weapon_upgrade_level: number };
const armColumns: Array<ColumnDef<ArmamentItem>> = (() => {
  const columnHelper = createColumnHelper<ArmamentItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/armaments/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'allow_ash_of_war', 'Allow AOW'),
    commonAccessorColumnDef(columnHelper, 'is_buffable', 'Buffable'),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
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

type ArmorItem = Armor & Quantity;
const armorColumns: Array<ColumnDef<ArmorItem>> = (() => {
  const columnHelper = createColumnHelper<ArmorItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/armor/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
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

type AshesItem = Ashes & Quantity;
const ashesColumns: Array<ColumnDef<AshesItem>> = (() => {
  const columnHelper = createColumnHelper<AshesItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/ashes-of-war/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.armament_categories.join(', '),
      'Armament Categories'
    ),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
  ];
})();

type BolsteringItem = Bolstering & Quantity;
const bolsteringColumns: Array<ColumnDef<BolsteringItem>> = (() => {
  const columnHelper = createColumnHelper<BolsteringItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/bolstering-materials/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
  ];
})();

type CraftingItem = Crafting & Quantity;
const craftingColumns: Array<ColumnDef<CraftingItem>> = (() => {
  const columnHelper = createColumnHelper<CraftingItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/crafting-materials/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
  ];
})();

type GestureItem = Gesture & Quantity;
const gesturesColumns: Array<ColumnDef<GestureItem>> = (() => {
  const columnHelper = createColumnHelper<GestureItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/gestures/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
  ];
})();
type InfoItem = Info & Quantity;
const infoColumns: Array<ColumnDef<InfoItem>> = (() => {
  const columnHelper = createColumnHelper<InfoItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/info/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
  ];
})();
type KeyItemRow = KeyItem & Quantity;
const keyColumns: Array<ColumnDef<InfoItem>> = (() => {
  const columnHelper = createColumnHelper<KeyItemRow>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/keys/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
  ];
})();
type ShopItem = Shop & Quantity;
const shopColumns: Array<ColumnDef<ShopItem>> = (() => {
  const columnHelper = createColumnHelper<ShopItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/shop/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
  ];
})();
type SpellItem = Spell & Quantity;
const spellColumns: Array<ColumnDef<SpellItem>> = (() => {
  const columnHelper = createColumnHelper<SpellItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/spells/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
    commonAccessorColumnDef(columnHelper, 'category', 'Category'),
    commonAccessorColumnDef(columnHelper, 'fp_cost', 'FP Cost'),
    commonAccessorColumnDef(columnHelper, 'sp_cost', 'SP Cost'),
    commonAccessorColumnDef(columnHelper, 'is_weapon_buff', 'Is Weapon Buff'),
  ];
})();
type SpiritItem = Spirit & Quantity;
const spiritColumns: Array<ColumnDef<SpiritItem>> = (() => {
  const columnHelper = createColumnHelper<SpiritItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/spirit-ashes/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
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
type TalismanItem = Talisman & Quantity;
const talismanColumns: Array<ColumnDef<TalismanItem>> = (() => {
  const columnHelper = createColumnHelper<TalismanItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/talismans/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
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
type ToolItem = Tool & Quantity;
const toolColumns: Array<ColumnDef<ToolItem>> = (() => {
  const columnHelper = createColumnHelper<ToolItem>();

  return [
    commonSelectColumnDef(columnHelper),
    commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
    columnHelper.display({
      id: 'icon',
      header: 'Icon',
      size: 1,
      maxSize: 1,
      cell: (cell) => {
        const imgUrl = new URL(
          `../../assets/erdb/icons/tools/${cell.row.original.icon.toString()}.png`,
          import.meta.url
        ).href;
        return (
          <div>
            <TooltipImg imgSrc={imgUrl} alt={cell.row.original.name} />
          </div>
        );
      },
      enableHiding: true,
    }),

    commonAccessorColumnDef(columnHelper, 'name', 'Name', {
      filterFn: 'includesString',
    }),
    commonAccessorColumnDef(columnHelper, 'quantity', 'Quantity'),
    commonAccessorColumnDef(
      columnHelper,
      (row) => row.description.join('\n'),
      'Description',
      {
        filterFn: 'includesString',
      }
    ),
    commonAccessorColumnDef(columnHelper, 'rarity', 'Rarity'),
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

type TableType = keyof typeof tables;
