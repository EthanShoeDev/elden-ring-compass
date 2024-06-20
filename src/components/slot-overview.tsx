import { Card } from './ui/card';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { statsDbView } from '@/lib/vm/stats';
import { cn } from '@/lib/utils';

export function SlotOverview({ className }: { className?: string }) {
  const slot = useSelectedSlot();
  if (!slot) return <div>No slot selected</div>;

  const statsVm = statsDbView(slot);

  return (
    <Card className={cn('w-full p-4', className)}>
      <div>
        <p>Steam ID: {statsVm.steam_id}</p>
        <p>Gender: {statsVm.gender}</p>
        <p>Weapon Level: {statsVm.match_making_weapon_level}</p>
        <p>Archetype: {statsVm.arche_type}</p>
        <p style={{ marginTop: '20px' }}>Stats</p>
        <p>Vigor: {statsVm.stats.vigor}</p>
        <p>Mind: {statsVm.stats.mind}</p>
        <p>Endurance: {statsVm.stats.endurance}</p>
        <p>Strength: {statsVm.stats.strength}</p>
        <p>Dexterity: {statsVm.stats.dexterity}</p>
        <p>Intelligence: {statsVm.stats.intelligence}</p>
        <p>Faith: {statsVm.stats.faith}</p>
        <p>Arcane: {statsVm.stats.arcane}</p>
        <p>Level: {statsVm.stats.level}</p>
        <p>Souls: {statsVm.stats.souls}</p>
        <p>Souls Memory: {statsVm.stats.soulsmemory}</p>
      </div>
    </Card>
  );
}
