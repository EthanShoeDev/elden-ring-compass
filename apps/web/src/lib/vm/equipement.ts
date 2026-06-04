import { aowNameById, nameById } from '../game-data';
import { Slot } from '../wasm-wrapper';
import { InventoryGaItemTypeToOffset, InventoryItemTypeToOffset } from './inventory';
/** No Ash of War attached (the gem handle on a weapon reads 0). */
const noAsh = { id: 0, name: 'None' } as const;
export type EquippedAsh = { id: number; name: string };
const empty = {
  gaitem_handle: 0,
  id: 0,
  equip_index: 0,
  name: 'Empty',
  ashOfWar: noAsh,
};
export function equipmentDbView(slot?: Readonly<Slot>) {
  if (!slot)
    return {
      arms: empty,
      arrows: [empty, empty],
      left_hand_armaments: [empty, empty, empty],
      right_hand_armaments: [empty, empty, empty],
      head: empty,
      chest: empty,
      legs: empty,
      pouch: [empty],
      quickslots: [empty, empty, empty, empty, empty, empty, empty, empty],
      talisman_count: 0,
      talismans: [empty, empty, empty, empty],
    };
  const gaHandleToGaItemId = new Map(slot.ga_items.map((g) => [g.gaitem_handle, g.item_id]));
  // handle -> the full ga_item, so a weapon can resolve its attached Ash of War
  // (gem) by following `gem_gaitem_handle` to another ga_item.
  const gaByHandle = new Map(slot.ga_items.map((g) => [g.gaitem_handle, g]));

  /** Resolve a weapon's equipped Ash of War via its gem handle (None if unattached). */
  const ashOfWarFor = (weaponGaHandle: number): EquippedAsh => {
    const gemHandle = gaByHandle.get(weaponGaHandle)?.gem_gaitem_handle ?? 0;
    if (!gemHandle) return noAsh;
    const gemItemId = gaByHandle.get(gemHandle)?.item_id ?? 0;
    if (!gemItemId) return noAsh;
    // AoW gems carry the AOW data offset; de-offset to the AshOfWar id.
    const aowId = (gemItemId ^ InventoryItemTypeToOffset.AOW) >>> 0;
    return { id: aowId, name: aowNameById.get(aowId) ?? 'Unknown' };
  };

  const talisman_count = (() => {
    let count = 1;
    for (let i = 0; i < slot.equip_inventory_data.key_inventory_items_distinct_count; i++) {
      const key_item = slot.equip_inventory_data.key_items[i];
      if (!key_item) continue;
      if ((key_item.ga_item_handle ^ InventoryGaItemTypeToOffset.ITEM) == 10040) {
        count = Math.min(1 + key_item.quantity, 4);
      }
    }
    return count;
  })();

  const equip_index_from_ga_handle = (gaitem_handle: number) => {
    let equip_index = slot.equip_inventory_data.common_items.findIndex(
      (common_item) => common_item.ga_item_handle == gaitem_handle,
    );
    equip_index = equip_index == -1 ? 0 : equip_index;
    return equip_index;
  };

  const weapon_arms = (side: 'left' | 'right') =>
    Array.from({ length: 3 }, (_, i) => {
      const gaitem_handle =
        (side == 'left'
          ? slot.chr_asm2.left_hand_armaments[i]
          : slot.chr_asm2.right_hand_armaments[i]) ?? 0;
      const id = gaHandleToGaItemId.get(gaitem_handle);
      const equip_index = equip_index_from_ga_handle(gaitem_handle);
      return {
        gaitem_handle,
        id,
        equip_index,
        name: id ? (nameById.get(id) ?? 'Unknown') : 'Empty',
        ashOfWar: id ? ashOfWarFor(gaitem_handle) : noAsh,
      };
    });

  const left_hand_armaments = weapon_arms('left');
  const right_hand_armaments = weapon_arms('right');

  const arrows = Array.from({ length: 2 }, (_, i) => {
    const gaitem_handle = slot.chr_asm2.arrows[i] ?? 0;
    const id = gaHandleToGaItemId.get(gaitem_handle) ?? 0;
    const equip_index = equip_index_from_ga_handle(gaitem_handle);
    return {
      gaitem_handle,
      id,
      equip_index,
      name: id ? (nameById.get(id) ?? 'Unknown') : 'Empty',
    };
  });

  const armor_fn = (ga_handle: Readonly<number>) => {
    const item_id = gaHandleToGaItemId.get(ga_handle) ?? 0;
    const armor_id = item_id != 0 ? item_id ^ InventoryItemTypeToOffset.ARMOR : 0;
    const equip_index = equip_index_from_ga_handle(ga_handle);
    return {
      ga_handle,
      id: armor_id,
      equip_index,
      name: armor_id ? (nameById.get(armor_id) ?? 'Unknown') : 'Empty',
    };
  };

  const head = armor_fn(slot.chr_asm2.head);
  const chest = armor_fn(slot.chr_asm2.chest);
  const arms = armor_fn(slot.chr_asm2.arms);
  const legs = armor_fn(slot.chr_asm2.legs);

  const talismans = Array.from({ length: 4 }, (_, i) => {
    const gaitem_handle = slot.chr_asm2.talismans[i] ?? 0;
    const item_id = gaHandleToGaItemId.get(gaitem_handle) ?? 0;
    const talisman_id = item_id != 0 ? item_id ^ InventoryGaItemTypeToOffset.ACCESSORY : 0;
    const equip_index = equip_index_from_ga_handle(gaitem_handle);
    return {
      gaitem_handle,
      id: talisman_id,
      equip_index,
      name: talisman_id ? (nameById.get(talisman_id) ?? 'Unknown') : 'Empty',
    };
  });

  const itemFn = (gaitem_handle: Readonly<number>) => {
    const item_id = gaHandleToGaItemId.get(gaitem_handle) ?? 0;
    const id = item_id != 0 ? item_id ^ InventoryGaItemTypeToOffset.ITEM : 0;
    const equip_index = equip_index_from_ga_handle(gaitem_handle);
    return {
      gaitem_handle,
      id,
      equip_index,
      name: id ? (nameById.get(id) ?? 'Unknown') : 'Empty',
    };
  };

  const quickslots = Array.from({ length: 10 }, (_, i) => {
    // An absent/empty quick slot reads as handle 0, which itemFn renders as 'Empty'.
    const gaitem_handle = slot.equip_item_data.quick_slot_items[i]?.item_id ?? 0;

    return itemFn(gaitem_handle);
  });

  const pouch = Array.from({ length: 8 }, (_, i) =>
    itemFn(slot.equip_item_data.pouch_items[i]?.item_id ?? 0),
  );

  return {
    talisman_count,
    left_hand_armaments,
    right_hand_armaments,
    arrows,
    head,
    chest,
    arms,
    legs,
    talismans,
    quickslots,
    pouch,
  };
}
