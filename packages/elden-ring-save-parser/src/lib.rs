mod db;
mod read;
mod save;
mod util;
mod utils;
mod vm;
mod write;

use save::common::save_slot::SaveSlot;
use save::common::user_data_10::*;
use save::common::user_data_11::*;
use save::save::save::*;
use serde::Serialize;
use serde_wasm_bindgen::Serializer;

use wasm_bindgen::prelude::*;

extern crate web_sys;

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

// #[wasm_bindgen]
// pub fn load_slots(save_data: &[u8]) -> Result<JsValue, JsValue> {
//     let save_result = Save::from_contents(save_data.to_vec());
//     let save = save_result.unwrap();
//     let save_type = save.save_type;
//     // save_type.get_character_steam_id(index)
//     // save_type.get_profile_summary(index)
//     let save_result = Save::from_contents(save_data.to_vec());
//     let save = save_result.unwrap();
//     let save_type = save.save_type;
//     let active_slot_indexes = save_type.active_slots(); // [bool; 10]
//     let mut slots = Vec::new();

//     for (index, active) in active_slot_indexes.iter().enumerate() {
//         if *active {
//             let slot = save_type.get_slot(index);
//             slots.push(slot);
//         }
//     }
//     let serializer = Serializer::new().serialize_large_number_types_as_bigints(true);
//     let js_value = slots.serialize(&serializer).unwrap();

//     Ok(js_value)
// }
#[derive(Serialize)]
struct JSEldenRingSave {
    global_steam_id: u64,
    character_steam_ids: Vec<u64>,
    profile_summaries: Vec<ProfileSummary>,
    regulation: Vec<u8>,
    slots: Vec<SaveSlot>,
    user_data_11: UserData11,
}

fn save_to_js(save: Save) -> JSEldenRingSave {
    let save_type = save.save_type;
    let active_slot_indexes = save_type.active_slots(); // [bool; 10]
    let mut slots = Vec::new();
    let mut character_steam_ids = Vec::new();
    let mut profile_summaries = Vec::new();

    for (index, active) in active_slot_indexes.iter().enumerate() {
        if *active {
            let slot = save_type.get_slot(index);
            slots.push(slot.clone());
            character_steam_ids.push(save_type.get_character_steam_id(index).clone());
            profile_summaries.push(save_type.get_profile_summary(index).clone());
        }
    }

    JSEldenRingSave {
        global_steam_id: save_type.get_global_steam_id(),
        character_steam_ids,
        profile_summaries,
        regulation: save_type.get_regulation().to_vec(),
        slots,
        user_data_11: save_type.get_user_data_11().clone(),
    }
}

#[wasm_bindgen]
pub fn parse_save_internal_rust(save_data: &[u8]) -> Result<JsValue, JsValue> {
    let save_result = Save::from_contents(save_data.to_vec());
    let save = save_result.unwrap();
    let js_save = save_to_js(save);
    let serializer = Serializer::new().serialize_large_number_types_as_bigints(true);
    let js_value = js_save.serialize(&serializer).unwrap();

    Ok(js_value)
}
