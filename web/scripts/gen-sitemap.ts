// Post-build: walk dist/**/*.html and emit dist/sitemap.xml with hreflang
// alternates linking each language version of every page.

import { statSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { LANGS, PAGES } from "./pages";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const dist = resolve(root, "dist");

const SITE_ORIGIN = process.env.VITE_SITE_ORIGIN || "https://dng.neoanaloglab.com";

function pageUrl(lang: string, slug: string): string {
  return `${SITE_ORIGIN}/${lang}/${slug}${slug ? "/" : ""}`;
}

function exists(p: string): boolean {
  try { return statSync(p).isFile(); } catch { return false; }
}

const today = new Date().toISOString().slice(0, 10);
const urls: string[] = [];

for (const page of PAGES) {
  for (const lang of LANGS) {
    const distFile = resolve(dist, lang, page.slug, "index.html");
    if (!exists(distFile) && !exists(resolve(dist, lang, `${page.slug}.html`))) continue;
    const loc = pageUrl(lang, page.slug);
    const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(l, page.slug)}"/>`).join("\n");
    urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
${alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl("zh", page.slug)}"/>
  </url>`);
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;

const out = resolve(dist, "sitemap.xml");
writeFileSync(out, xml);
console.log(`gen-sitemap: wrote ${urls.length} URLs → ${relative(root, out)}`);
