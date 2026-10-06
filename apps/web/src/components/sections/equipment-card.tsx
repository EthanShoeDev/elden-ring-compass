import { equipmentDbView } from '@/lib/vm/equipement';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';

const isEquipped = (e: { name: string }) => e.name !== 'Empty';

/** A single equipped armament row: weapon name + its attached Ash of War. */
function ArmamentRow({ item }: { item: { name: string; ashOfWar: { id: number; name: string } } }) {
  return (
    <div className='flex flex-col'>
      <span className='text-sm'>{item.name}</span>
      {item.ashOfWar.id !== 0 && (
        <span className='text-xs text-muted-foreground'>Ash of War: {item.ashOfWar.name}</span>
      )}
    </div>
  );
}

function GearRow({ label, name }: { label: string; name: string }) {
  return (
    <div className='flex items-center justify-between gap-6 text-sm'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span>{name}</span>
    </div>
  );
}

/**
 * Equipped loadout for the selected slot — armaments (with their Ash of War,
 * resolved from each weapon's `gem_gaitem_handle`), armor, and talismans. Reads
 * the long-dormant `equipmentDbView`; the Ash of War line is the new bit.
 */
export function EquipmentCard() {
  const slot = useSelectedSlot();
  const eq = equipmentDbView(slot);

  // Keyed by hand + slot position: the same weapon can be equipped in two slots.
  const armaments = [
    ...eq.right_hand_armaments.map((item, i) => ({ slot: `R${(i + 1).toString()}`, item })),
    ...eq.left_hand_armaments.map((item, i) => ({ slot: `L${(i + 1).toString()}`, item })),
  ].filter(({ item }) => isEquipped(item));
  const armor = [
    ['Head', eq.head],
    ['Chest', eq.chest],
    ['Arms', eq.arms],
    ['Legs', eq.legs],
  ] as const;
  const talismans = eq.talismans.filter(isEquipped);

  return (
    <Card className='min-w-64'>
      <CardHeader>
        <CardTitle>Equipment</CardTitle>
        <CardDescription>Equipped loadout</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        <div className='flex flex-col gap-1'>
          <div className='text-xs font-medium text-muted-foreground'>Armaments</div>
          {armaments.length > 0 ? (
            armaments.map(({ slot: armSlot, item }) => <ArmamentRow key={armSlot} item={item} />)
          ) : (
            <span className='text-sm text-muted-foreground'>None equipped</span>
          )}
        </div>
        <Separator />
        <div className='flex flex-col gap-1'>
          <div className='text-xs font-medium text-muted-foreground'>Armor</div>
          {armor.map(([label, piece]) => (
            <GearRow key={label} label={label} name={isEquipped(piece) ? piece.name : '—'} />
          ))}
        </div>
        <Separator />
        <div className='flex flex-col gap-1'>
          <div className='text-xs font-medium text-muted-foreground'>
            Talismans ({talismans.length}/{eq.talisman_count})
          </div>
          {talismans.length > 0 ? (
            talismans.map((item) => (
              <span key={item.id} className='text-sm'>
                {item.name}
              </span>
            ))
          ) : (
            <span className='text-sm text-muted-foreground'>None equipped</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
