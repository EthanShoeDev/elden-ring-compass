import { ACCESSORY_NAME } from './elden-ring-raw-db/ACCESSORY_NAME';
import { AOWS } from './elden-ring-raw-db/AOWS';
import { AOW_NAME } from './elden-ring-raw-db/AOW_NAME';
import { ARCHE_TYPE } from './elden-ring-raw-db/ARCHE_TYPE';
import { ARMORS } from './elden-ring-raw-db/ARMORS';
import { ARMOR_NAME } from './elden-ring-raw-db/ARMOR_NAME';
import { BOSSES } from './elden-ring-raw-db/BOSSES';
import { COLOSSEUMS } from './elden-ring-raw-db/COLOSSEUMS';
import { COOKBOOKS } from './elden-ring-raw-db/COOKBOOKS';
import { EVENT_FLAGS } from './elden-ring-raw-db/EVENT_FLAGS';
import { GRACES } from './elden-ring-raw-db/GRACES';
import { ITEMS } from './elden-ring-raw-db/ITEMS';
import { ITEM_NAMES } from './elden-ring-raw-db/ITEM_NAMES';
import { MAPS } from './elden-ring-raw-db/MAPS';
import { MAP_NAMES } from './elden-ring-raw-db/MAP_NAMES';
import { REGIONS } from './elden-ring-raw-db/REGIONS';
import { STARTING_CLASSES } from './elden-ring-raw-db/STARTING_CLASSES';
import * as STATS from './elden-ring-raw-db/STATS';
import { SUMMONING_POOLS } from './elden-ring-raw-db/SUMMONING_POOLS';
import { TALISMANS } from './elden-ring-raw-db/TALISMANS';
import { WEAPONS } from './elden-ring-raw-db/WEAPONS';
import { WEAPON_NAME } from './elden-ring-raw-db/WEAPON_NAME';
import { WHETBLADES } from './elden-ring-raw-db/WHETBLADES';

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
