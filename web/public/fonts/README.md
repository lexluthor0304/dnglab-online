# NeoAnalogLab — pixel fonts

The frontend self-hosts these fonts for crisp, predictable pixel rendering.
All four are licensed under the SIL Open Font License 1.1 (OFL-1.1).

| File | Source | Size (woff2) |
| ---- | ------ | ------------ |
| `PressStart2P-Regular.woff2` | https://fonts.google.com/specimen/Press+Start+2P (Latin slice from gstatic) | 2.4 KB |
| `VT323-Regular.woff2` | https://fonts.google.com/specimen/VT323 (Latin slice from gstatic) | 3.3 KB |
| `DotGothic16-Regular.woff2` | https://github.com/google/fonts/tree/main/ofl/dotgothic16 (TTF → woff2_compress) | 487 KB |
| `Zpix.woff2` | https://github.com/SolidZORO/zpix-pixel-font v3.1.11 (TTF → woff2_compress) | 846 KB |

`@font-face` declarations in `src/styles/tokens.css` use `unicode-range` so a
Latin-only English page never downloads the CJK pixels, and a Japanese page
only fetches DotGothic16 + Press Start 2P (not Zpix).

The Worker serves these with `Content-Type: font/woff2` and
`Cache-Control: public, max-age=31536000, immutable` (content-addressable).

## Re-creating from source

```bash
brew install woff2

# Latin slices (single-file, served as-is by gstatic):
curl -L -o PressStart2P-Regular.woff2 \
  "https://fonts.gstatic.com/s/pressstart2p/v16/e3t4euO8T-267oIAQAu6jDQyK3nYivNm4I81PZQ.woff2"
curl -L -o VT323-Regular.woff2 \
  "https://fonts.gstatic.com/s/vt323/v18/pxiKyp0ihIEF2isQFJXUdVNFKPY.woff2"

# CJK fonts: download TTF, compress to woff2 to merge gstatic's slice chain
# into a single self-hostable file.
curl -L -o /tmp/DotGothic16.ttf \
  https://github.com/google/fonts/raw/main/ofl/dotgothic16/DotGothic16-Regular.ttf
woff2_compress /tmp/DotGothic16.ttf
mv /tmp/DotGothic16.woff2 ./DotGothic16-Regular.woff2

curl -L -o /tmp/zpix.ttf \
  https://github.com/SolidZORO/zpix-pixel-font/releases/latest/download/zpix.ttf
woff2_compress /tmp/zpix.ttf
mv /tmp/zpix.woff2 ./Zpix.woff2
```
