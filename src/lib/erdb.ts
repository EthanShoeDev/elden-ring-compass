/* eslint-disable @typescript-eslint/no-explicit-any */
import ammo from '@/assets/erdb/json/ammo.json';
import armaments from '@/assets/erdb/json/armaments.json';
import armor from '@/assets/erdb/json/armor.json';
import ashes from '@/assets/erdb/json/ashes-of-war.json';
import bolstering from '@/assets/erdb/json/bolstering-materials.json';
// import correctionAttack from '@/assets/erdb/json/correction-attack.json';
// import correctionGraph from '@/assets/erdb/json/correction-graph.json';
import crafting from '@/assets/erdb/json/crafting-materials.json';
import gestures from '@/assets/erdb/json/gestures.json';
import info from '@/assets/erdb/json/info.json';
import keys from '@/assets/erdb/json/keys.json';
// import reinforcements from '@/assets/erdb/json/reinforcements.json';
import shop from '@/assets/erdb/json/shop.json';
import spells from '@/assets/erdb/json/spells.json';
import spirit from '@/assets/erdb/json/spirit-ashes.json';
import talismans from '@/assets/erdb/json/talismans.json';
import tools from '@/assets/erdb/json/tools.json';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { inventoryDbView } from './vm/inventory';

export type Ammo = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  damage: {
    physical: number;
    stamina: number;
  };
  category: string;
  effects: Array<{
    attribute: string;
    value: number;
    model: 'additive' | 'multiplicative';
    type: 'positive' | 'negative';
    conditions?: Array<string>;
  }>;
  status_effects: any;
};

type Effect = {
  attribute: string;
  value: number;
  model: 'additive' | 'multiplicative';
  type: 'positive' | 'negative';
  conditions?: Array<string>;
};

export type Armament = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  behavior_variation_id: number;
  category: string;
  weight: number;
  default_skill_id: number;
  allow_ash_of_war: boolean;
  is_buffable: boolean;
  is_l1_guard: boolean;
  upgrade_material: string;
  upgrade_costs: Array<number>;
  attack_attributes: Array<string>;
  sp_consumption_rate: number;
  requirements: {
    strength?: number;
    dexterity?: number;
    faith?: number;
    intelligence?: number;
    arcane?: number;
  };
  effects: Array<Effect>;
  affinity: any;
};

export type Bolstering = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  category: string;
};

export type Tool = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  category: string;
  availability: string;
  fp_cost: number;
  is_consumed: boolean;
  is_ladder_usable: boolean;
  is_horseback_usable: boolean;
  effects: Array<any>;
};

export type Armor = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  category: string;
  altered: string;
  weight: number;
  icon_fem: number;
  absorptions: {
    physical: number;
    strike: number;
    slash: number;
    pierce: number;
    magic: number;
    fire: number;
    lightning: number;
    holy: number;
  };
  resistances: {
    immunity: number;
    robustness: number;
    focus: number;
    vitality: number;
    poise: number;
  };
  effects: Array<Effect>;
};

export type Ashes = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
    location: string;
    region: string;
  }>;
  remarks: Array<any>;
  armament_categories: Array<string>;
  default_affinity: string;
  possible_affinities: Array<string>;
  skill_id: number;
};

export type Crafting = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  category: string;
  hint: string;
  products: Array<string>;
};

export type Gesture = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
};

export type Info = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  category: string;
};

export type KeyItem = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  category: string;
};

export type Shop = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  category: string;
};

export type Spell = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  fp_cost: number;
  fp_cost_extra: number;
  sp_cost: number;
  sp_cost_extra: number;
  category: string;
  slots_used: number;
  hold_action: string;
  is_weapon_buff: boolean;
  is_shield_buff: boolean;
  is_horseback_castable: boolean;
  requirements: {
    intelligence: number;
  };
};

export type Spirit = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
    location: string;
    region: string;
    requirements: Array<string>;
  }>;
  remarks: Array<any>;
  summon_quantity: number;
  abilities: Array<string>;
  summon_name: string;
  fp_cost: number;
  hp_cost: number;
  upgrade_material: string;
  upgrade_costs: Array<number>;
};

export type Talisman = {
  full_hex_id: string;
  id: number;
  name: string;
  summary: string;
  description: Array<string>;
  is_tradable: boolean;
  price_sold: number;
  rarity: string;
  icon: number;
  max_held: number;
  max_stored: number;
  locations: Array<{
    summary: string;
  }>;
  remarks: Array<any>;
  weight: number;
  effects: Array<{
    attribute: string;
    value: number;
    model: string;
    type: string;
  }>;
  conflicts: Array<string>;
};

export const ERDB = {
  ammo: ammo as Record<string, Ammo>,
  armaments: armaments as Record<string, Armament>,
  armor,
  ashes,
  bolstering,
  // correctionAttack,
  // correctionGraph,
  crafting,
  gestures,
  info,
  keys,
  // reinforcements,
  shop,
  spells,
  spirit,
  talismans,
  tools: tools as Record<string, Tool>,
} satisfies Record<string, Record<string, { id: number }>>;

export const useErdb = <T extends { id: number }>(
  erdbItems: Array<T>
): {
  items: Array<T & { quantity: number }>;
  ownedCount: number;
} => {
  const slot = useSelectedSlot();

  const inventoryQuantityById = new Map(
    slot
      ? inventoryDbView(slot).items.map((item) => [item.item_id, item.quantity])
      : []
  );

  const items = erdbItems.map((value) => ({
    quantity: inventoryQuantityById.get(value.id) ?? 0,
    ...value,
  }));

  const ownedCount = items.filter((item) => item.quantity > 0).length;

  return { items, ownedCount };
};
