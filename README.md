# dnglab-online

Convert any camera RAW file to DNG, entirely in the browser. No upload, no server.

[![Live](https://img.shields.io/badge/live-dng.neoanaloglab.com-2ea44f)](https://dng.neoanaloglab.com)
[![License: LGPL-2.1](https://img.shields.io/badge/license-LGPL--2.1-blue.svg)](LICENSE)

This is a fork of [dnglab/dnglab](https://github.com/dnglab/dnglab) that compiles the
`rawler` decoder + DNG writer to WebAssembly and ships it as a static web app.
The original Rust CLI (`dnglab`) and library (`rawler`) are preserved unchanged.

## Try it

<https://dng.neoanaloglab.com> — drag a RAW file into the page, get a DNG back.
Available in English, 中文, and 日本語.

## Why

The Adobe DNG Converter is closed-source and Windows/macOS only. The upstream
`dnglab` CLI works on Linux but assumes you have a Rust toolchain or a Debian
package handy. `dnglab-online` removes both barriers — anything with a modern
browser can convert RAW to DNG without installing anything and without sending
files to a third party.

## Features

- **100% client-side.** RAW bytes never leave your device; conversion runs in a
  Web Worker on a `Uint8Array`.
- **Same camera support as upstream.** Anything `rawler` decodes (CR3/CR2/NEF/
  ARW/RAF/ORF/RW2/PEF/IIQ/3FR/…) works here. See
  [SUPPORTED_CAMERAS.md](SUPPORTED_CAMERAS.md).
- **Lossless DNG (LJPEG-92)** by default; uncompressed is one option toggle away.
- **Preview, thumbnail, scaling toggles** exposed in the UI.
- **Trilingual** with localized `/en/`, `/zh/`, `/ja/` routes and SEO metadata.
- **Retro pixel-font / CRT aesthetic**, optional CRT scanline effect.
- **Privacy-friendly.** No analytics beyond a single GA4 page-view tag (opt-out
  via cookie banner). No file upload, no fingerprinting, no third-party widgets.

## Architecture

```
┌────────────────────────┐         ┌──────────────────────────┐
│  Browser (Vite + TS)   │         │  Cloudflare Workers      │
│  ────────────────────  │         │  ──────────────────────  │
│  • drop-zone UI        │  HTML   │  • static asset serving  │
│  • Web Worker          │ ◀─────▶ │  • lang routing          │
│  • rawler-wasm         │         │  • Content-Type for .wasm│
└──────────┬─────────────┘         └──────────────────────────┘
           │ wasm
           ▼
┌────────────────────────┐
│  rawler-wasm crate     │
│  (wasm-bindgen)        │
│  convert_raw_to_dng()  │
│  detect_camera()       │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  rawler crate          │  ← upstream, unmodified
│  (RAW decode +         │
│   DNG writer)          │
└────────────────────────┘
```

The WASM glue is a thin layer (`wasm/src/lib.rs`, ~90 lines) that wires
`Uint8Array` ↔ `rawler::dng::convert::convert_raw_source`. A few crate-feature
tweaks make `rawler` build for `wasm32-unknown-unknown`:

- `chrono` with `wasmbind` so `Local::now()` doesn't panic on `time not implemented`.
- `getrandom` with `wasm_js` and `uuid` with `js` for the v4 UUID path.
- `params.embedded = false` to avoid `std::thread::spawn`, which is unavailable
  on `wasm32-unknown-unknown`.

## Repository layout

```
.
├── rawler/        # upstream library — RAW decoders, DNG writer
├── bin/           # upstream CLI — the dnglab binary
├── wasm/          # NEW: rawler-wasm crate (wasm-bindgen bindings)
└── web/           # NEW: Vite + TS frontend, Cloudflare Worker
    ├── src/       #   UI, i18n, Web Worker entry
    ├── scripts/   #   page generators (HTML, sitemap, supported cameras)
    ├── worker/    #   Cloudflare Worker for lang routing + headers
    └── public/    #   static assets (fonts, favicon, robots.txt)
```

## Build & develop

### Prerequisites

- Rust toolchain (`rustup`) with the `wasm32-unknown-unknown` target
- [`wasm-pack`](https://rustwasm.github.io/wasm-pack/) (`cargo install wasm-pack`)
- Node.js 20+

### Local dev

```bash
cd web
npm install
npm run wasm        # builds rawler-wasm into wasm/pkg/
npm run dev         # generates HTML, starts Vite on http://localhost:5173
```

`npm run dev` runs the page generator first (`scripts/gen-pages.ts` materializes
trilingual HTML files) and then Vite. The dev server reloads on TS/CSS changes;
re-run `npm run wasm` if you touch Rust.

### Production build

```bash
cd web
npm run build       # wasm + page gen + vite build + sitemap
npm run preview     # serve dist/ locally via wrangler
```

### Deploy (Cloudflare Workers)

```bash
cd web
npm run deploy      # wraps `wrangler deploy`
```

Production config lives in [`web/wrangler.jsonc`](web/wrangler.jsonc). The
custom domain `dng.neoanaloglab.com` is bound automatically; change `name`,
`routes`, and the `vars` block if you fork.

CI is wired to Cloudflare Workers Builds — see
[CLOUDFLARE_BUILDS.md](CLOUDFLARE_BUILDS.md) for the GA4 measurement-id env var
setup and the `gen-cameras` build step.

## Using the WASM crate directly

`wasm/pkg/` is a standard `wasm-pack` output, so you can pull it into any
bundler-driven project:

```ts
import init, { convert_raw_to_dng, detect_camera } from "rawler-wasm";

await init();
const raw = new Uint8Array(await file.arrayBuffer());
const camera = detect_camera(raw);             // "Canon EOS R5"
const dng = convert_raw_to_dng(raw, {          // Uint8Array of DNG bytes
  lossless: true,
  preview: true,
  thumbnail: true,
  filename: file.name,
});
```

Run heavy conversions in a Web Worker — a 50 MB CR3 takes a few seconds and
will block the UI thread otherwise.

## CLI

The original `dnglab` command-line tool is unchanged in this fork. For CLI
usage, supported subcommands, and `analyze`/`extract`/`makedng` flags, see the
upstream documentation at <https://github.com/dnglab/dnglab>.

## Credits

This project would not exist without:

- [**dnglab/dnglab**](https://github.com/dnglab/dnglab) and the `rawler` crate —
  every byte of decoding logic comes from there.
- The Darktable team and Laurent Clévy's CR3 reverse-engineering work, on which
  much of `rawler` is built.
- The wider rawloader / open-source RAW community.

The web UI, WASM bindings, multilingual content, and Cloudflare deployment
are the only original contributions of this fork.

## License

LGPL-2.1, inherited from upstream `dnglab` / `rawler`. See [LICENSE](LICENSE).
