import { ARCHE_TYPE } from '../elden-ring-raw-db/ARCHE_TYPE';
import { Slot } from '../wasm-wrapper';

type ArcheType = keyof typeof ARCHE_TYPE;

const archeTypeIdToLabel = new Map<number, ArcheType>(
  Object.entries(ARCHE_TYPE).map(([k, v]) => [v, k as ArcheType])
);

export function statsDbView(slot: Readonly<Slot>) {
  return {
    steam_id: slot.steam_id,
    gender: slot.player_game_data.gender == 0x0 ? 'female' : 'male',
    match_making_weapon_level: slot.player_game_data.match_making_wpn_lvl,
    arche_type:
      archeTypeIdToLabel.get(slot.player_game_data.arche_type) ?? 'Unknown',
    stats: {
      vigor: slot.player_game_data.vigor,
      mind: slot.player_game_data.mind,
      endurance: slot.player_game_data.endurance,
      strength: slot.player_game_data.strength,
      dexterity: slot.player_game_data.dexterity,
      intelligence: slot.player_game_data.intelligence,
      faith: slot.player_game_data.faith,
      arcane: slot.player_game_data.arcane,
      level: slot.player_game_data.level,
      souls: slot.player_game_data.souls,
      soulsmemory: slot.player_game_data.soulsmemory,
    },
    coords: slot.player_coords,
  };
}
