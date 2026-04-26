/// <reference lib="webworker" />
// Runs inside a dedicated Web Worker. Owns the wasm instance and all the
// long-running CPU work so the main thread can keep painting.
//
// The wasm bundle is the rawler-wasm crate output (wasm-pack --target web).
// Vite resolves the file: dependency from web/package.json.

import init, { convert_raw_to_dng, detect_camera } from "rawler-wasm";

declare const self: DedicatedWorkerGlobalScope;

type Req =
  | { id: number; kind: "warm" }
  | { id: number; kind: "detect"; bytes: Uint8Array }
  | { id: number; kind: "convert"; bytes: Uint8Array; options: ConvertOptions };

type ConvertOptions = {
  lossless?: boolean;
  preview?: boolean;
  thumbnail?: boolean;
  applyScaling?: boolean;
  index?: number;
  artist?: string;
  software?: string;
  filename?: string;
};

let ready: Promise<void> | null = null;
const ensure = (): Promise<void> => (ready ??= init().then(() => undefined));

self.onmessage = async (ev: MessageEvent<Req>) => {
  const msg = ev.data;
  try {
    await ensure();
    if (msg.kind === "warm") {
      self.postMessage({ id: msg.id, kind: "warm-ok" });
    } else if (msg.kind === "detect") {
      const info = detect_camera(msg.bytes);
      self.postMessage({ id: msg.id, kind: "detect-result", info });
    } else if (msg.kind === "convert") {
      const dng = convert_raw_to_dng(msg.bytes, msg.options as unknown as Record<string, unknown>);
      // Transfer the underlying buffer back so the main thread receives it without a copy.
      self.postMessage({ id: msg.id, kind: "result", dng }, [dng.buffer]);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    self.postMessage({ id: msg.id, kind: "error", message });
  }
};
