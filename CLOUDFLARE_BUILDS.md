# Cloudflare Workers Builds setup

This repo deploys to a Cloudflare Worker named **`neoanaloglab-web`**
(custom domain target: `dng.neoanaloglab.com`). The Worker is already
created on the **ネオアナログ株式会社** Cloudflare account
(account id `f58b8eb9bc38d1abc7b4796e41249b46`) by an initial
`wrangler deploy`. Auto-deploy on every `git push origin main` is wired up
through Cloudflare's native **Workers Builds** dashboard integration.

## One-time setup in the Cloudflare dashboard

1. Go to **Workers & Pages → `neoanaloglab-web` → Settings → Builds**.
2. Click **Connect to Git**.
3. Cloudflare prompts you to install the Cloudflare GitHub App. Pick
   **lexluthor0304** as the install scope and grant access to the
   `lexluthor0304/dnglab-online` repository (private).
4. Back in the dashboard, configure the build:

   | Field | Value |
   | ----- | ----- |
   | Repository | `lexluthor0304/dnglab-online` |
   | Production branch | `main` |
   | **Root directory** | `web` |
   | Build command | `npm install && npm run build:ci` |
   | Deploy command | `npx wrangler deploy` |
   | Non-production branch deploys | optional; can leave off |

5. Build environment variables (production):
   | Name | Value |
   | ---- | ----- |
   | `VITE_ADSENSE_CLIENT` | `ca-pub-XXXXXXXXXXXXXXXX` (replace once AdSense approved) |
   | `VITE_SITE_ORIGIN` | `https://dng.neoanaloglab.com` |
   | `VITE_BRAND_HOME` | `https://neoanaloglab.com` |

   These are read by Vite at build time (`import.meta.env.*`) and baked
   into the JS bundle. Setting them in the dashboard overrides
   `.env.production` (which contains placeholders).

6. Click **Save and Deploy**. Cloudflare clones the repo into its build
   container, runs `npm install && npm run build:ci`, then `wrangler
   deploy`. ~2 minutes end to end.

## Why `build:ci` and not `build`

`npm run build` calls `bash ../scripts/build-wasm.sh` which needs Rust +
`wasm-pack`. The Cloudflare build container has Node but not Rust, and
installing the Rust toolchain on every build adds ~3 minutes. Instead,
`wasm/pkg/` is committed into the repo (the wasm-pack output, ~4.5 MB).
`npm run build:ci` skips the wasm step and reuses the committed
artifacts.

When you change Rust code, rebuild locally:

```bash
bash scripts/build-wasm.sh
git add wasm/pkg/
git commit -m "Rebuild wasm"
git push
```

## Custom domain (`dng.neoanaloglab.com`)

After the first deploy, in the Worker's **Settings → Domains & Routes**:

1. Click **Add Custom Domain**.
2. Enter `dng.neoanaloglab.com`. Cloudflare creates the DNS record
   automatically because `neoanaloglab.com` is on this account.
3. Wait ~30 s for the cert to issue.
4. The site is live at https://dng.neoanaloglab.com.

Until then it is reachable at
https://neoanaloglab-web.lexluthor0304.workers.dev.
