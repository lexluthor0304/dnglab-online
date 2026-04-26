#!/usr/bin/env bash
# Build the rawler-wasm crate for the browser using wasm-pack.
# Output lands in /Users/lex/dnglab/wasm/pkg/.
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo_root/wasm"

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "wasm-pack not found. Install with:" >&2
  echo "  curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh" >&2
  exit 1
fi

# Make sure the target is installed (idempotent).
rustup target add wasm32-unknown-unknown >/dev/null

wasm-pack build --target web --release --out-dir pkg

# Optional extra size optimization. wasm-pack already runs wasm-opt -O,
# but -Oz is more aggressive on size.
if command -v wasm-opt >/dev/null 2>&1; then
  for f in pkg/*_bg.wasm; do
    wasm-opt -Oz "$f" -o "$f.tmp" && mv "$f.tmp" "$f"
  done
fi

echo
ls -lh pkg/
