//! BCn DDS → PNG, exposed over a tiny C ABI for `bun:ffi`.
//!
//! `dds_to_png` takes the bytes of a standalone DDS file (as found inside an
//! Elden Ring TPF on PC), decodes whatever BCn format it uses via `image_dds`,
//! and returns PNG bytes. The caller reads `out_len` bytes from the returned
//! pointer, then hands the pointer back to `free_buf` to release it.

use std::io::Cursor;
use std::slice;

use image::ImageFormat;
use image_dds::ddsfile::Dds;

fn convert(input: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let dds = Dds::read(input)?;
    let image = image_dds::image_from_dds(&dds, 0)?;
    let mut out = Vec::new();
    image.write_to(&mut Cursor::new(&mut out), ImageFormat::Png)?;
    Ok(out)
}

/// Decode a DDS buffer to PNG. On success returns a heap pointer and writes the
/// PNG length to `out_len`; on failure returns null and writes 0. The pointer
/// must be freed with `free_buf(ptr, out_len)`.
///
/// # Safety
/// `in_ptr` must point to `in_len` readable bytes; `out_len` must be writable.
#[no_mangle]
pub unsafe extern "C" fn dds_to_png(in_ptr: *const u8, in_len: usize, out_len: *mut usize) -> *mut u8 {
    if in_ptr.is_null() || out_len.is_null() {
        return std::ptr::null_mut();
    }
    let input = slice::from_raw_parts(in_ptr, in_len);
    match convert(input) {
        Ok(buf) => {
            let mut boxed = buf.into_boxed_slice();
            let ptr = boxed.as_mut_ptr();
            *out_len = boxed.len();
            std::mem::forget(boxed);
            ptr
        }
        Err(_) => {
            *out_len = 0;
            std::ptr::null_mut()
        }
    }
}

/// Free a buffer returned by `dds_to_png`.
///
/// # Safety
/// `ptr`/`len` must be exactly what a prior `dds_to_png` call returned.
#[no_mangle]
pub unsafe extern "C" fn free_buf(ptr: *mut u8, len: usize) {
    if !ptr.is_null() && len > 0 {
        drop(Box::from_raw(slice::from_raw_parts_mut(ptr, len)));
    }
}
