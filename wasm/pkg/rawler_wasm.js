// Placeholder. Replaced by wasm-pack output.
// This file exists so `npm install` can resolve the `rawler-wasm` file: dependency
// before the actual wasm crate has been built.
export default async function init() {
  throw new Error(
    "rawler-wasm has not been built yet. Run `npm run wasm` from the web/ directory.",
  );
}
export function convert_raw_to_dng() {
  throw new Error("rawler-wasm not built; run `npm run wasm` first.");
}
export function detect_camera() {
  throw new Error("rawler-wasm not built; run `npm run wasm` first.");
}
