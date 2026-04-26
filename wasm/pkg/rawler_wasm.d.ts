/* tslint:disable */
/* eslint-disable */
/**
 * Identify the camera that produced the supplied RAW file.
 *
 * Returns a string like `"Canon EOS R5"`. Useful for showing a quick label in
 * the UI before kicking off a full conversion.
 */
export function detect_camera(input: Uint8Array): string;
/**
 * Convert an in-memory camera RAW file to a DNG byte stream.
 *
 * `input` is the RAW file as a `Uint8Array`. `options` is an optional plain
 * JS object; see `JsConvertOptions` for available keys (camelCase).
 */
export function convert_raw_to_dng(input: Uint8Array, options: any): Uint8Array;
export function _start(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly convert_raw_to_dng: (a: number, b: number, c: any) => [number, number, number, number];
  readonly detect_camera: (a: number, b: number) => [number, number, number, number];
  readonly _start: () => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
