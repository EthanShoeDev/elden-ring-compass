"""
Regenerate `reference-fields.er0000.json`, the M2 parity golden for the parser's
newly-extracted fields, from the vendored er-save-manager Python reference parser
(an independent implementation of the ER save format).

Run from anywhere:
    uv run --no-project --python 3.12 --with packaging \
        python packages/save-parser/test/fixtures/gen-reference-fields.py

Outputs the active slots in the same order the TS parser emits them, so
`reference.slots[i]` lines up with `parsed.slots[i]` in `parity.test.ts`.
"""

import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
REF_SRC = REPO_ROOT / "docs" / "cloned-repos-as-docs" / "er-save-manager" / "src"
SAVE = REPO_ROOT / "packages" / "save-parser" / "test" / "fixtures" / "ER0000.sl2"
DEST = Path(__file__).resolve().parent / "reference-fields.er0000.json"

sys.path.insert(0, str(REF_SRC))
from er_save_manager.parser.save import load_save  # noqa: E402

save = load_save(str(SAVE))
ud10 = save.user_data_10_parsed
profiles = ud10.profile_summary.profiles

slots = []
for i, slot in enumerate(save.character_slots):
    if slot.version == 0:
        continue
    p = slot.player_game_data
    aw = slot.active_weapon_slots_and_arm_style
    slots.append({
        "version": slot.version,
        "steam_id": str(slot.steam_id),
        "seconds_played": profiles[i].seconds_played,
        "character_name": p.character_name,
        "level": p.level,
        "hp": p.hp, "max_hp": p.max_hp, "base_max_hp": p.base_max_hp,
        "fp": p.fp, "max_fp": p.max_fp, "base_max_fp": p.base_max_fp,
        "stamina": p.sp, "max_stamina": p.max_sp, "base_max_stamina": p.base_max_sp,
        "buildup": {
            "poison": p.poison_buildup, "rot": p.rot_buildup, "bleed": p.bleed_buildup,
            "death": p.death_buildup, "frost": p.frost_buildup, "sleep": p.sleep_buildup,
            "madness": p.madness_buildup,
        },
        "voice_type": p.voice_type, "gift": p.gift,
        "additional_talisman_slot_count": p.additional_talisman_slot_count,
        "summon_spirit_level": p.summon_spirit_level,
        "furl": bool(p.furl_calling_finger_on),
        "white_cipher": bool(p.white_cipher_ring_on),
        "blue_cipher": bool(p.blue_cipher_ring_on),
        "great_rune": bool(p.great_rune_on),
        "max_crimson": p.max_crimson_flask_count, "max_cerulean": p.max_cerulean_flask_count,
        "active_weapon_slots": {
            "arm_style": aw.arm_style,
            "left_hand": aw.left_hand_weapon_active_slot,
            "right_hand": aw.right_hand_weapon_active_slot,
            "left_arrow": aw.left_arrow_active_slot,
            "right_arrow": aw.right_arrow_active_slot,
            "left_bolt": aw.left_bolt_active_slot,
            "right_bolt": aw.right_bolt_active_slot,
        },
        "equipped_spells": [s.spell_id for s in slot.equipped_spells.spell_slots],
        "equipped_gestures": slot.equipped_gestures.gesture_ids,
        "gestures_nonzero": sum(1 for g in slot.gestures.gesture_ids if g not in (0, 0xFFFFFFFE)),
        "gestures_len": len(slot.gestures.gesture_ids),
        "equipped_physics": [slot.equipped_physics.slot1, slot.equipped_physics.slot2],
        "acquired_projectiles": [pr.id for pr in slot.acquired_projectiles.projectiles],
        "horse": {
            "coords": [slot.horse.coordinates.x, slot.horse.coordinates.y, slot.horse.coordinates.z],
            "map_id": list(slot.horse.map_id.data),
            "hp": slot.horse.hp, "state": int(slot.horse.state),
        },
        "blood_stain": {
            "coords": [slot.blood_stain.coordinates.x, slot.blood_stain.coordinates.y, slot.blood_stain.coordinates.z],
            "map_id": list(slot.blood_stain.map_id.data),
            "runes": slot.blood_stain.runes,
        },
        "world_time": {"hour": slot.world_area_time.hour, "minute": slot.world_area_time.minute, "second": slot.world_area_time.second},
        "world_weather": {"area_id": slot.world_area_weather.area_id, "weather_type": slot.world_area_weather.weather_type, "timer": slot.world_area_weather.timer},
        "base_version": {"base_version": slot.base_version.base_version, "is_latest_version": slot.base_version.is_latest_version},
        "deaths": slot.total_deaths_count,
        "last_rested_grace": slot.last_rested_grace,
        "spawn_point_entity_id": slot.spawn_point_entity_id,
        "dlc": {
            "shadow_of_erdtree": bool(slot.dlc.shadow_of_erdtree),
            "preorder_the_ring": bool(slot.dlc.preorder_the_ring),
            "preorder_ring_of_miquella": bool(slot.dlc.preorder_ring_of_miquella),
        },
        "map_id": list(slot.map_id.data),
    })

out = {"global_steam_id": str(ud10.steam_id), "slots": slots}
with open(DEST, "w", encoding="utf-8") as fh:
    json.dump(out, fh, indent=2)
print(f"wrote {os.path.relpath(DEST, REPO_ROOT)}: {len(slots)} active slots")
