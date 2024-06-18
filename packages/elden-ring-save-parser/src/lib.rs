mod db;
mod read;
mod save;
mod util;
mod utils;
mod vm;
mod write;

use save::common::save_slot::SaveSlot;
use save::save::save::*;
use serde::ser::{Serialize, SerializeStruct, Serializer};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn test_string() -> String {
    // "Hello, elden-ring-save-parser!".to_string()

    match Save::default().save_type {
        SaveType::PlayStation(_) => "PlayStation".to_string(),
        _ => "Unknown".to_string(),
    }
}

#[wasm_bindgen]
pub fn test_save_val() -> String {
    match Save::default().save_type {
        SaveType::PlayStation(_) => "PlayStation".to_string(),
        _ => "PC".to_string(),
    }
}

#[wasm_bindgen]
pub fn take_number_slice_by_shared_ref(save_data: &[u8]) -> String {
    let save_result = Save::from_contents(save_data.to_vec());
    let save = save_result.unwrap();
    match save.save_type {
        SaveType::PlayStation(_) => "PlayStation".to_string(),
        _ => "PC".to_string(),
    }
}

impl Serialize for SaveSlot {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("SaveSlot", 30)?; // Adjust the number of fields accordingly

        // // Serialize simple fields directly
        // state.serialize_field("ga_items", &self.ga_items)?;
        // state.serialize_field("player_game_data", &self.player_game_data)?;
        // // Example of handling a large array efficiently
        // // Convert the _0xd0 array to a base64 string for efficient serialization
        // let _0xd0_base64 = encode(&self._0xd0);
        // state.serialize_field("_0xd0", &_0xd0_base64)?;

        // // Continue with other fields, applying similar logic
        // // ...

        state.end()
    }
}

#[wasm_bindgen]
pub fn load_save_contents(save_data: &[u8], slot_index: usize) -> Result<JsValue, JsValue> {
    let save_result = Save::from_contents(save_data.to_vec());
    let save = save_result.unwrap();
    let save_type = save.save_type;
    let slot = save_type.get_slot(slot_index);
    Ok(serde_wasm_bindgen::to_value(&slot)?)
}
