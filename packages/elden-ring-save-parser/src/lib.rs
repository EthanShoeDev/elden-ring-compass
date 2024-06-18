mod db;
mod read;
mod save;
mod util;
mod utils;
mod vm;
mod write;

use save::save::save::*;
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

#[wasm_bindgen]
pub fn load_save_contents(save_data: &[u8], slot_index: isize) -> JsValue {
    let save_result = Save::from_contents(save_data.to_vec());
    let save = save_result.unwrap();
    save.
    serde_wasm_bindgen::to_value(&save.save_type)
}
