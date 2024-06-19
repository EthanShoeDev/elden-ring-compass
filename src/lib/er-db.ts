import { ACCESSORY_NAME } from './elden-ring-db/ACCESSORY_NAME';
import { AOWS } from './elden-ring-db/AOWS';
import { AOW_NAME } from './elden-ring-db/AOW_NAME';
import { ARCHE_TYPE } from './elden-ring-db/ARCHE_TYPE';
import { ARMORS } from './elden-ring-db/ARMORS';
import { ARMOR_NAME } from './elden-ring-db/ARMOR_NAME';
import { BOSSES } from './elden-ring-db/BOSSES';
import { COLOSSEUMS } from './elden-ring-db/COLOSSEUMS';
import { COOKBOOKS } from './elden-ring-db/COOKBOOKS';
import { EVENT_FLAGS } from './elden-ring-db/EVENT_FLAGS';
import { GRACES } from './elden-ring-db/GRACES';
import { ITEMS } from './elden-ring-db/ITEMS';
import { ITEM_NAMES } from './elden-ring-db/ITEM_NAMES';
import { MAPS } from './elden-ring-db/MAPS';
import { MAP_NAMES } from './elden-ring-db/MAP_NAMES';
import { REGIONS } from './elden-ring-db/REGIONS';
import { STARTING_CLASSES } from './elden-ring-db/STARTING_CLASSES';
import * as STATS from './elden-ring-db/STATS';
import { SUMMONING_POOLS } from './elden-ring-db/SUMMONING_POOLS';
import { TALISMANS } from './elden-ring-db/TALISMANS';
import { WEAPONS } from './elden-ring-db/WEAPONS';
import { WEAPON_NAME } from './elden-ring-db/WEAPON_NAME';
import { WHETBLADES } from './elden-ring-db/WHETBLADES';

export const RAW_ELDEN_RING_DB = {
  ACCESSORY_NAME, // itemId -> name
  AOWS, //
  AOW_NAME,
  ARCHE_TYPE,
  ARMORS,
  ARMOR_NAME,
  BOSSES,
  COLOSSEUMS,
  COOKBOOKS,
  EVENT_FLAGS,
  GRACES,
  ITEMS,
  ITEM_NAMES,
  MAPS,
  MAP_NAMES,
  REGIONS,
  STARTING_CLASSES,
  STATS,
  SUMMONING_POOLS,
  TALISMANS,
  WEAPONS,
  WEAPON_NAME,
  WHETBLADES,
};

export function playerNameBytesToString(bytes: Readonly<number[]>) {
  return bytes
    .map((i) => String.fromCharCode(i))
    .join('')
    .replaceAll(String.fromCharCode(0), ' ')
    .trimEnd()
    .toLowerCase();
}
