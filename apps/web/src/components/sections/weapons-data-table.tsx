import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { useAtom, useAtomValue } from '@effect/atom-react';

import {
  affinityVariantCountAtom,
  filteredWeaponsAtom,
  showAffinityVariantsAtom,
  weaponSearchAtom,
  type EnrichedWeapon,
} from '@/lib/atoms/weapons';
import { commonAccessorColumnDef, commonPinColumnDef } from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// Reference section for the effect-atom data layer (client-side-db Phase A):
// a save-independent browser over the generated weapons dataset. Reads a derived
// atom (`filteredWeaponsAtom`) via `useAtomValue` and drives the search through a
// writable atom (`weaponSearchAtom`) — no React Query, no prop threading.
export function WeaponsDataTable() {
  const weapons = useAtomValue(filteredWeaponsAtom);
  const [search, setSearch] = useAtom(weaponSearchAtom);
  const [showVariants, setShowVariants] = useAtom(showAffinityVariantsAtom);
  const variantCount = useAtomValue(affinityVariantCountAtom);

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Weapons</CardTitle>
        <CardDescription>
          {weapons.length} armaments
          {!showVariants && ` · ${variantCount} affinity variants hidden`}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-wrap items-center gap-4'>
          <Input
            className='max-w-sm'
            placeholder='Search weapons by name or id…'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
          <Label className='flex items-center gap-2'>
            <Checkbox
              checked={showVariants}
              onCheckedChange={(checked) => {
                setShowVariants(checked);
              }}
            />
            Show affinity variants
          </Label>
        </div>
        <DataTable tableId='weapons' columns={columns} data={[...weapons]} />
      </CardContent>
    </Card>
  );
}

const columnHelper = createColumnHelper<EnrichedWeapon>();
const columns: Array<ColumnDef<EnrichedWeapon>> = [
  commonPinColumnDef(columnHelper),
  commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
  commonAccessorColumnDef(columnHelper, 'name', 'Name'),
  commonAccessorColumnDef(columnHelper, 'affinity', 'Affinity'),
  commonAccessorColumnDef(columnHelper, 'weight', 'Weight'),
  commonAccessorColumnDef(columnHelper, 'attackPhysical', 'Phys'),
  commonAccessorColumnDef(columnHelper, 'reqStrength', 'Str'),
  commonAccessorColumnDef(columnHelper, 'reqDexterity', 'Dex'),
  commonAccessorColumnDef(columnHelper, 'reqIntelligence', 'Int'),
  commonAccessorColumnDef(columnHelper, 'reqFaith', 'Fai'),
  commonAccessorColumnDef(columnHelper, 'reqArcane', 'Arc'),
];
