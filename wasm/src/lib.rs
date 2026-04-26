//! WebAssembly bindings around the `rawler` crate.
//!
//! Exposes a single end-to-end RAW → DNG conversion entry point plus a small
//! camera-detection helper. All work is done in-memory on a `Uint8Array`
//! provided by JavaScript.

use std::io::Cursor;

use rawler::{
  decoders::RawDecodeParams,
  dng::{
    DngCompression,
    convert::{ConvertParams, convert_raw_source},
  },
  get_decoder,
  rawsource::RawSource,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn _start() {
  console_error_panic_hook::set_once();
}

#[derive(serde::Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
struct JsConvertOptions {
  lossless: Option<bool>,
  preview: Option<bool>,
  thumbnail: Option<bool>,
  apply_scaling: Option<bool>,
  index: Option<usize>,
  artist: Option<String>,
  software: Option<String>,
  filename: Option<String>,
}

/// Convert an in-memory camera RAW file to a DNG byte stream.
///
/// `input` is the RAW file as a `Uint8Array`. `options` is an optional plain
/// JS object; see `JsConvertOptions` for available keys (camelCase).
#[wasm_bindgen]
pub fn convert_raw_to_dng(input: &[u8], options: JsValue) -> Result<Vec<u8>, JsError> {
  let opts: JsConvertOptions = if options.is_undefined() || options.is_null() {
    JsConvertOptions::default()
  } else {
    serde_wasm_bindgen::from_value(options).map_err(|e| JsError::new(&e.to_string()))?
  };

  let source = RawSource::new_from_slice(input);

  let mut params = ConvertParams::default();
  // std::thread::spawn panics on wasm32-unknown-unknown; the spawn site is
  // gated behind params.embedded, so force it off here.
  params.embedded = false;
  if let Some(v) = opts.lossless {
    params.compression = if v { DngCompression::Lossless } else { DngCompression::Uncompressed };
  }
  if let Some(v) = opts.preview {
    params.preview = v;
  }
  if let Some(v) = opts.thumbnail {
    params.thumbnail = v;
  }
  if let Some(v) = opts.apply_scaling {
    params.apply_scaling = v;
  }
  if let Some(v) = opts.index {
    params.index = v;
  }
  if let Some(s) = opts.software {
    params.software = s;
  }
  params.artist = opts.artist;

  let mut out = Cursor::new(Vec::with_capacity(input.len()));
  let name = opts.filename.as_deref().unwrap_or("input.raw");
  convert_raw_source(&source, &mut out, name, &params).map_err(|e| JsError::new(&format!("rawler: {e}")))?;
  Ok(out.into_inner())
}

/// Identify the camera that produced the supplied RAW file.
///
/// Returns a string like `"Canon EOS R5"`. Useful for showing a quick label in
/// the UI before kicking off a full conversion.
#[wasm_bindgen]
pub fn detect_camera(input: &[u8]) -> Result<String, JsError> {
  let source = RawSource::new_from_slice(input);
  let dec = get_decoder(&source).map_err(|e| JsError::new(&e.to_string()))?;
  let img = dec
    .raw_image(&source, &RawDecodeParams::default(), true)
    .map_err(|e| JsError::new(&e.to_string()))?;
  Ok(format!("{} {}", img.clean_make, img.clean_model))
}
