//! WASM entry point for the Elden Ring Compass save parser.
//!
//! This crate is a thin boundary: it parses an uploaded save with our fork of ER-Save-Lib
//! (`er-save-lib`) and serializes the lean, web-facing `LeanSave` DTO to a JS value in a single
//! call. All save-format knowledge (and the kept/dropped data decisions) lives in the fork's
//! `web_export` module. See docs/projects/wasm-save-parser-rewrite.md.

use er_save_lib::SaveApi;
use wasm_bindgen::prelude::*;

/// Parse an Elden Ring save file (PC `.sl2` or PS) and return the lean `LeanSave` DTO.
///
/// Returns a JS object: `{ global_steam_id, character_steam_ids, slots }`. Throws (rejects with
/// a JS error string) on a malformed save or serialization failure.
#[wasm_bindgen]
pub fn parse_save(save_data: &[u8]) -> Result<JsValue, JsValue> {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    let save = SaveApi::from_slice(save_data)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse Elden Ring save: {e}")))?;

    serde_wasm_bindgen::to_value(&save.lean_export())
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize save: {e}")))
}
