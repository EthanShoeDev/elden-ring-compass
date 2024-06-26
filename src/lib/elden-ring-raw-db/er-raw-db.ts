import { ACCESSORY_NAME } from './ACCESSORY_NAME';
import { AOWS } from './AOWS';
import { AOW_NAME } from './AOW_NAME';
import { ARCHE_TYPE } from './ARCHE_TYPE';
import { ARMORS } from './ARMORS';
import { ARMOR_NAME } from './ARMOR_NAME';
import { BOSSES } from './BOSSES';
import { COLOSSEUMS } from './COLOSSEUMS';
import { COOKBOOKS } from './COOKBOOKS';
import { EVENT_FLAGS } from './EVENT_FLAGS';
import { GRACES } from './GRACES';
import { ITEMS } from './ITEMS';
import { ITEM_NAMES } from './ITEM_NAMES';
import { MAPS } from './MAPS';
import { MAP_NAMES } from './MAP_NAMES';
import { REGIONS } from './REGIONS';
import { STARTING_CLASSES } from './STARTING_CLASSES';
import * as STATS from './STATS';
import { SUMMONING_POOLS } from './SUMMONING_POOLS';
import { TALISMANS } from './TALISMANS';
import { WEAPONS } from './WEAPONS';
import { WEAPON_NAME } from './WEAPON_NAME';
import { WHETBLADES } from './WHETBLADES';

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

export const CLEAN_ELDEN_RING_DB = (() => {
  const inventory = [
    ...Object.entries(WEAPON_NAME).map(([id, name]) => ({
      id: parseInt(id),
      name,
      type: 'weapon',
    })),
    ...Object.entries(ARMOR_NAME).map(([id, name]) => ({
      id: parseInt(id),
      name,
      type: 'armor',
    })),
    ...Object.entries(ACCESSORY_NAME).map(([id, name]) => ({
      id: parseInt(id),
      name,
      type: 'accessory',
    })),
    ...Object.entries(ITEM_NAMES).map(([id, name]) => ({
      id: parseInt(id),
      name,
      type: 'item',
    })),
    ...Object.entries(AOW_NAME).map(([id, name]) => ({
      id: parseInt(id),
      name,
      type: 'aow',
    })),
  ];

  return {
    inventory,
    inventoryIdMap: new Map(inventory.map((item) => [item.id, item])),
    events: [
      ...Object.entries(RAW_ELDEN_RING_DB.GRACES)
        .map(([regionName, gracesMap]) =>
          Object.values(gracesMap).map((tupleDetails) => ({
            regionName,
            map: tupleDetails[0],
            eventId: tupleDetails[1],
            name: tupleDetails[2],
            type: 'grace',
          }))
        )
        .flat(),
      ...Object.values(RAW_ELDEN_RING_DB.WHETBLADES).map((tupleDetails) => ({
        type: 'whetblade',
        eventId: tupleDetails[0],
        name: tupleDetails[1],
      })),
      ...Object.entries(RAW_ELDEN_RING_DB.COOKBOOKS)
        .map(([cookBookCategoryName, books]) =>
          Object.values(books).map((tupleDetails) => ({
            type: 'cookbook',
            eventId: tupleDetails[0],
            name: tupleDetails[1],
            cookBookCategoryName,
          }))
        )
        .flat(),
      ...Object.entries(RAW_ELDEN_RING_DB.MAPS).map(
        ([mapKey, tupleDetails]) => ({
          type: 'map',
          eventId: tupleDetails[0],
          name: tupleDetails[1],
          mapKey,
        })
      ),
      ...Object.entries(RAW_ELDEN_RING_DB.BOSSES)
        .map(([regionName, bossesMap]) =>
          Object.entries(bossesMap).map(([bossKey, tupleDetails]) => ({
            type: 'boss',
            eventId: tupleDetails[0],
            name: tupleDetails[1],
            regionName,
            bossKey,
          }))
        )
        .flat(),
      {
        type: 'boss',
        eventId: 310,
        name: 'Radahn',
        regionName: 'Caelid',
      },
      ...Object.entries(RAW_ELDEN_RING_DB.SUMMONING_POOLS).map(
        ([summonPoolKey, tupleDetails]) => ({
          type: 'summoningPool',
          eventId: tupleDetails[0],
          name: `SummoningPool${tupleDetails[1]}`,
          summonPoolKey,
        })
      ),
      ...Object.entries(RAW_ELDEN_RING_DB.COLOSSEUMS).map(
        ([colosseumKey, tupleDetails]) => ({
          type: 'colosseum',
          eventId: tupleDetails[0],
          name: tupleDetails[1],
          colosseumKey,
        })
      ),
    ],
    equipment: [],
    regions: Object.values(RAW_ELDEN_RING_DB.REGIONS).map((values) => ({
      eventId: values[0],
      name: values[1],
      map: values[2],
      isOpenWorld: values[3],
      isDungeon: values[4],
      isBoss: values[5],
    })),
  };
})();

export function playerNameBytesToString(bytes: Readonly<Array<number>>) {
  const character_name = bytes;
  const character_name_trimmed: Array<number> = [];
  for (let i = 0; i < 0x10; i++) {
    if (character_name[i] == 0) {
      break;
    }
    character_name_trimmed.push(character_name[i]);
  }
  return String.fromCharCode(...character_name_trimmed);
}
