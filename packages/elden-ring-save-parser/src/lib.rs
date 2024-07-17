mod db;
mod read;
mod save;
mod util;
mod utils;
mod vm;
mod write;
extern crate console_error_panic_hook;

use std::path::PathBuf;

use save::common::save_slot::SaveSlot;
use save::common::user_data_10::*;
use save::common::user_data_11::*;
use save::save::save::*;
use serde::*;

// use wasm_bindgen::prelude::*;

// extern crate web_sys;

// macro_rules! log {
//     ( $( $t:tt )* ) => {
//         web_sys::console::log_1(&format!( $( $t )* ).into());
//     }
// }

#[derive(Serialize)]
struct JSEldenRingSave {
    global_steam_id: u64,
    character_steam_ids: Vec<u64>,
    profile_summaries: Vec<ProfileSummary>,
    slots: Vec<SaveSlot>,
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
        slots,
    }
}

// // #[wasm_bindgen]
// pub fn parse_save_internal_rust(save_data: &[u8]) -> Result<JsValue, JsValue> {
//     // console_error_panic_hook::set_once();

//     let save = Save::from_contents(save_data.to_vec()).unwrap();
//     let js_save = save_to_js(save);

//     let serializer = Serializer::new().serialize_large_number_types_as_bigints(true);

//     Ok(js_save.serialize(serializer))
// }

// #[wasm_bindgen]
pub fn parse_save_internal_rust_path(file: &str) -> String {
    // console_error_panic_hook::set_once();

    let path = PathBuf::from(file);
    let save = Save::from_path(&path).unwrap();
    let js_save = save_to_js(save);
    // let serializer = Serializer::new().serialize_large_number_types_as_bigints(true);

    // Ok(js_save.serialize(&serializer).unwrap())
    let json = serde_json::to_string(&js_save).unwrap();
    json
}
