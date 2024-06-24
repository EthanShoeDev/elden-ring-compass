/* eslint-disable @typescript-eslint/no-explicit-any */
import ammo from '@/assets/erdb/json/ammo.json';
import armaments from '@/assets/erdb/json/armaments.json';
import armor from '@/assets/erdb/json/armor.json';
import ashes from '@/assets/erdb/json/ashes-of-war.json';
import bolstering from '@/assets/erdb/json/bolstering-materials.json';
import correctionAttack from '@/assets/erdb/json/correction-attack.json';
import correctionGraph from '@/assets/erdb/json/correction-graph.json';
import crafting from '@/assets/erdb/json/crafting-materials.json';
import gestures from '@/assets/erdb/json/gestures.json';
import info from '@/assets/erdb/json/info.json';
import keys from '@/assets/erdb/json/keys.json';
import reinforcements from '@/assets/erdb/json/reinforcements.json';
import shop from '@/assets/erdb/json/shop.json';
import spells from '@/assets/erdb/json/spells.json';
import spirit from '@/assets/erdb/json/spirit-ashes.json';
import talismans from '@/assets/erdb/json/talismans.json';
import tools from '@/assets/erdb/json/tools.json';

type Ammo = {
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
  effects: Array<any>;
  status_effects: any;
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
  effects: Array<{
    attribute: string;
    value: number;
    model: 'additive' | 'multiplicative';
    type: 'positive' | 'negative';
    conditions?: Array<string>;
  }>;
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

export const ERDB = {
  ammo: ammo as Record<string, Ammo>,
  armaments: armaments as Record<string, Armament>,
  armor,
  ashes,
  bolstering,
  correctionAttack,
  correctionGraph,
  crafting,
  gestures,
  info,
  keys,
  reinforcements,
  shop,
  spells,
  spirit,
  talismans,
  tools,
};
