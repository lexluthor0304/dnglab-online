# Pricing — dnglab-online

dnglab-online is **free** and **open source** (LGPL-2.1). There is no paid
tier, no signup, no usage cap, no "contact sales" gate.

## Free (and only) plan

- Price: **$0**
- Account required: **No**
- Signup: **None**
- Usage cap: **None** (limited only by the user's own browser memory and CPU)
- File size cap: **None enforced** (practical ceiling ≈ 200 MB on desktop, lower on mobile)
- Files per session: **Unlimited** (one at a time; refresh between conversions is not required)
- Watermarks on output: **None**
- Output ownership: **User retains all rights to the input RAW and output DNG**

## Features

- Convert any camera RAW supported by upstream `rawler` (CR3, CR2, NEF, ARW, RAF, ORF, RW2, PEF, IIQ, 3FR, …) to Adobe DNG 1.4
- Lossless LJPEG-92 compression (default) or uncompressed DNG
- Optional embedded preview image
- Optional embedded thumbnail
- Optional white-level scaling
- Trilingual UI: English, 简体中文, 日本語
- 100% client-side: no upload, no server-side processing, no telemetry beyond a single GA4 page-view tag

## Hosting / infrastructure costs (paid by NeoAnalogLab)

The site is hosted on Cloudflare Workers (free tier). All compute happens on
the user's device; the operator does not pay for per-conversion compute and
will not introduce a paywall.

## Comparison to alternatives

| Tool                | Price | Platform           | Online | Open source |
|---------------------|-------|--------------------|--------|-------------|
| **dnglab-online**   | Free  | Browser (any OS)   | Yes    | Yes (LGPL-2.1) |
| Adobe DNG Converter | Free  | Windows / macOS    | No     | No          |
| dnglab (CLI)        | Free  | Linux / macOS / Win| No     | Yes (LGPL-2.1) |

## Source

- Live tool: <https://dng.neoanaloglab.com>
- Source: <https://github.com/lexluthor0304/dnglab-online>
- Upstream: <https://github.com/dnglab/dnglab>
