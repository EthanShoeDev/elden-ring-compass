import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { useAtom, useAtomValue } from '@effect/atom-react';

import { filteredWeaponsAtom, weaponSearchAtom, type Weapon } from '@/lib/atoms/weapons';
import { commonAccessorColumnDef, commonSelectColumnDef } from '../data-table/common-column-defs';
import { DataTable } from '../data-table/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

// Reference section for the effect-atom data layer (client-side-db Phase A):
// a save-independent browser over the generated weapons dataset. Reads a derived
// atom (`filteredWeaponsAtom`) via `useAtomValue` and drives the search through a
// writable atom (`weaponSearchAtom`) — no React Query, no prop threading.
export function WeaponsDataTable() {
  const weapons = useAtomValue(filteredWeaponsAtom);
  const [search, setSearch] = useAtom(weaponSearchAtom);

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Weapons</CardTitle>
        <CardDescription>{weapons.length} armaments</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <Input
          className='max-w-sm'
          placeholder='Search weapons by name or id…'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
        <DataTable tableId='weapons' columns={columns} data={[...weapons]} />
      </CardContent>
    </Card>
  );
}

const columnHelper = createColumnHelper<Weapon>();
const columns: Array<ColumnDef<Weapon>> = [
  commonSelectColumnDef(columnHelper),
  commonAccessorColumnDef(columnHelper, 'id', 'ID', { size: 1 }),
  commonAccessorColumnDef(columnHelper, 'name', 'Name'),
  commonAccessorColumnDef(columnHelper, 'weight', 'Weight'),
  commonAccessorColumnDef(columnHelper, 'attackPhysical', 'Phys'),
  commonAccessorColumnDef(columnHelper, 'reqStrength', 'Str'),
  commonAccessorColumnDef(columnHelper, 'reqDexterity', 'Dex'),
  commonAccessorColumnDef(columnHelper, 'reqIntelligence', 'Int'),
  commonAccessorColumnDef(columnHelper, 'reqFaith', 'Fai'),
  commonAccessorColumnDef(columnHelper, 'reqArcane', 'Arc'),
];
