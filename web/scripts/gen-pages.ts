// Materializes every HTML entry on disk before Vite reads them.
// Run from `npm run build` and `npm run dev` (idempotent; safe to re-run).

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES, LANGS, type Lang, type PageDef } from "./pages";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

// Inline .env loader. tsx (used to run this script) doesn't auto-load .env
// files like Vite does, so we parse them ourselves. process.env wins so
// Cloudflare Workers Builds dashboard env vars override file values.
function loadDotEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const envFile = loadDotEnv(resolve(root, ".env.production"));
const fromEnv = (key: string, fallback = "") => process.env[key] ?? envFile[key] ?? fallback;

const dicts: Record<Lang, Record<string, string>> = {
  zh: JSON.parse(readFileSync(resolve(root, "src/i18n/locales/zh.json"), "utf8")),
  en: JSON.parse(readFileSync(resolve(root, "src/i18n/locales/en.json"), "utf8")),
  ja: JSON.parse(readFileSync(resolve(root, "src/i18n/locales/ja.json"), "utf8")),
};

const SITE_ORIGIN = fromEnv("VITE_SITE_ORIGIN", "https://dng.neoanaloglab.com");
const BRAND_HOME  = fromEnv("VITE_BRAND_HOME",  "https://neoanaloglab.com");
const REPO_URL    = fromEnv("VITE_REPO_URL",    "https://github.com/lexluthor0304/dnglab-online");
const REPO_SLUG   = REPO_URL.replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
// GA4 measurement id. Set to empty in shell (e.g. via `npm run dev`) to skip
// injection during local development so dev pageviews don't pollute stats.
const GA_ID       = fromEnv("VITE_GA_ID");

function gaSnippet(): string {
  if (!GA_ID) return "";
  // Standard gtag.js v4 snippet, exactly as Google supplies it.
  return `<!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>`;
}

function tt(lang: Lang, key: string): string {
  return dicts[lang][key] ?? key;
}

// ---------------- JSON-LD schema generation ----------------

const LANG_TAG: Record<Lang, string> = { zh: "zh-CN", en: "en-US", ja: "ja-JP" };

function pageUrl(lang: Lang, slug: string): string {
  return `${SITE_ORIGIN}/${lang}/${slug}${slug ? "/" : ""}`;
}

// Common @id refs so JSON-LD nodes link to one another.
const ORG_ID  = `${SITE_ORIGIN}/#organization`;
const SITE_ID = `${SITE_ORIGIN}/#website`;
const APP_ID  = `${SITE_ORIGIN}/#software`;

function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    "name": "NeoAnalogLab",
    "url": BRAND_HOME,
    "sameAs": [REPO_URL],
  };
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    "url": SITE_ORIGIN,
    "name": "dnglab-online",
    "alternateName": ["NeoAnalogLab DNG Converter", "dnglab online"],
    "description": "Free, fully client-side RAW → DNG converter that runs in the browser.",
    "publisher": { "@id": ORG_ID },
    "inLanguage": LANGS.map(l => LANG_TAG[l]),
  };
}

function softwareApplicationNode() {
  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    "name": "dnglab-online",
    "alternateName": "NeoAnalogLab DNG Converter",
    "url": SITE_ORIGIN,
    "applicationCategory": "MultimediaApplication",
    "applicationSubCategory": "Photography Tool",
    "operatingSystem": "Any (browser)",
    "browserRequirements": "Requires WebAssembly and ES2022 (Chrome/Edge ≥ 100, Firefox ≥ 100, Safari ≥ 15.4)",
    "isAccessibleForFree": true,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
    },
    "publisher": { "@id": ORG_ID },
    "softwareVersion": "1.0",
    "license": "https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html",
    "codeRepository": REPO_URL,
    "featureList": [
      "Convert Canon CR3, CR2, CRW to Adobe DNG",
      "Convert Nikon NEF, NRW to Adobe DNG",
      "Convert Sony ARW, SR2, SRF to Adobe DNG",
      "Convert Fujifilm RAF to Adobe DNG",
      "LJPEG-92 lossless DNG compression",
      "Optional embedded preview and thumbnail",
      "100% client-side (no upload, no server processing)",
      "Trilingual UI: English, 简体中文, 日本語",
    ],
  };
}

function breadcrumbNode(lang: Lang, page: PageDef) {
  const items: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: tt(lang, "nav.home"), item: pageUrl(lang, "") },
  ];
  if (page.slug) {
    // For nested slugs like "guides/cr3" emit one crumb per path segment.
    const parts = page.slug.split("/");
    let acc = "";
    parts.forEach((seg, i) => {
      acc = acc ? `${acc}/${seg}` : seg;
      const isLast = i === parts.length - 1;
      const name = isLast ? tt(lang, page.titleKey) : tt(lang, `nav.${seg}`);
      items.push({
        "@type": "ListItem",
        position: items.length + 1,
        name,
        item: pageUrl(lang, acc),
      });
    });
  }
  return {
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

// Strip tags, collapse whitespace.
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Parse "<h2>Question</h2>\n<p>Answer paragraph(s)</p>..." into Q/A pairs.
// Adjacent <p>/<ul>/<ol> blocks following an <h2> are concatenated as the
// answer until the next <h2> or end of input.
function extractFaq(html: string): Array<{ q: string; a: string }> {
  const out: Array<{ q: string; a: string }> = [];
  // Split on <h2>...</h2> while keeping the question.
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const q = stripHtml(m[1]);
    const a = stripHtml(m[2]);
    if (q && a) out.push({ q, a });
  }
  return out;
}

function faqPageNode(lang: Lang, page: PageDef, html: string) {
  const faq = extractFaq(html);
  if (faq.length === 0) return null;
  return {
    "@type": "FAQPage",
    "@id": pageUrl(lang, page.slug) + "#faqpage",
    "url": pageUrl(lang, page.slug),
    "inLanguage": LANG_TAG[lang],
    "mainEntity": faq.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a },
    })),
  };
}

// Pull the first <ol> block and treat each <li> as a HowTo step.
function extractSteps(html: string): string[] {
  const ol = /<ol[^>]*>([\s\S]*?)<\/ol>/i.exec(html);
  if (!ol) return [];
  const steps: string[] = [];
  const li = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = li.exec(ol[1])) !== null) {
    const text = stripHtml(m[1]);
    if (text) steps.push(text);
  }
  return steps;
}

// Pull the first <p> as a description.
function extractIntro(html: string): string {
  const m = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html);
  return m ? stripHtml(m[1]) : "";
}

function howToNode(lang: Lang, page: PageDef, html: string) {
  const steps = extractSteps(html);
  if (steps.length === 0) return null;
  const url = pageUrl(lang, page.slug);
  return {
    "@type": "HowTo",
    "@id": url + "#howto",
    "url": url,
    "inLanguage": LANG_TAG[lang],
    "name": `${tt(lang, page.titleKey)} — ${page.slug.includes("cr3") ? "Canon CR3 → DNG" : "Sony ARW → DNG"}`,
    "description": extractIntro(html),
    "totalTime": "PT1M",
    "tool": [
      { "@type": "HowToTool", "name": "dnglab-online (browser)" },
      { "@type": "HowToTool", "name": "Modern web browser with WebAssembly" },
    ],
    "step": steps.map((text, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "text": text,
    })),
  };
}

function articleNode(lang: Lang, page: PageDef, html: string) {
  const url = pageUrl(lang, page.slug);
  return {
    "@type": "Article",
    "@id": url + "#article",
    "url": url,
    "inLanguage": LANG_TAG[lang],
    "headline": tt(lang, page.titleKey),
    "description": extractIntro(html) || tt(lang, page.descKey),
    "isPartOf": { "@id": SITE_ID },
    "publisher": { "@id": ORG_ID },
    "about": { "@id": APP_ID },
  };
}

// Build the JSON-LD <script> tag(s) for a page. Always includes
// Organization + WebSite + Breadcrumb. Adds page-specific nodes per kind.
function jsonLdFor(lang: Lang, page: PageDef, body: string): string {
  const nodes: Array<Record<string, unknown>> = [
    organizationNode(),
    websiteNode(),
    breadcrumbNode(lang, page),
  ];
  if (page.slug === "") {
    // Home: declare the SoftwareApplication entity.
    nodes.push(softwareApplicationNode());
  } else if (page.slug === "faq") {
    const n = faqPageNode(lang, page, body);
    if (n) nodes.push(n);
  } else if (page.slug.startsWith("guides/")) {
    const n = howToNode(lang, page, body);
    if (n) nodes.push(n);
    // Some guides also have a FAQ section; expose it too.
    const f = faqPageNode(lang, page, body);
    if (f) nodes.push(f);
  } else if (page.slug === "compare") {
    nodes.push(articleNode(lang, page, body));
  } else if (page.slug === "cameras") {
    nodes.push({
      "@type": "WebPage",
      "@id": pageUrl(lang, page.slug) + "#webpage",
      "url": pageUrl(lang, page.slug),
      "inLanguage": LANG_TAG[lang],
      "name": tt(lang, page.titleKey),
      "isPartOf": { "@id": SITE_ID },
      "about": { "@id": APP_ID },
    });
  }
  const graph = { "@context": "https://schema.org", "@graph": nodes };
  return `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
}

function htmlAttrs(lang: Lang) {
  return `lang="${lang}"`;
}

function head(lang: Lang, page: PageDef): string {
  const title = `${tt(lang, page.titleKey)} — ${tt(lang, "brand")}`;
  const desc  = tt(lang, page.descKey);
  const path  = `/${lang}/${page.slug}${page.slug ? "/" : ""}`;
  const canonical = `${SITE_ORIGIN}${path}`;

  const alt = LANGS.map(l => `  <link rel="alternate" hreflang="${l}" href="${SITE_ORIGIN}/${l}/${page.slug}${page.slug ? "/" : ""}">`).join("\n");

  // Per-language CJK pixel-font preload, only for the current language.
  const fontPreload =
    lang === "ja" ? `<link rel="preload" as="font" type="font/woff2" href="/fonts/DotGothic16-Regular.woff2" crossorigin>`
    : lang === "zh" ? `<link rel="preload" as="font" type="font/woff2" href="/fonts/Zpix.woff2" crossorigin>`
    : `<link rel="preload" as="font" type="font/woff2" href="/fonts/PressStart2P-Regular.woff2" crossorigin>`;

  const ogLocale = lang === "zh" ? "zh_CN" : lang === "ja" ? "ja_JP" : "en_US";
  const ogAltLocales = LANGS.filter(l => l !== lang).map(l => {
    const code = l === "zh" ? "zh_CN" : l === "ja" ? "ja_JP" : "en_US";
    return `  <meta property="og:locale:alternate" content="${code}">`;
  }).join("\n");

  return `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/zh/${page.slug}${page.slug ? "/" : ""}">
${alt}
  <meta property="og:site_name" content="${tt(lang, "brand")}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_ORIGIN}/og-cover.png">
  <meta property="og:locale" content="${ogLocale}">
${ogAltLocales}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  ${fontPreload}
  <link rel="stylesheet" href="/src/styles/index.css">
  <script>window.__LANG__="${lang}";</script>
  ${gaSnippet()}`;
}

function header(lang: Lang): string {
  const link = (slug: string, key: string) => `<a href="/${lang}/${slug}${slug ? "/" : ""}" data-i18n="${key}">${escapeHtml(tt(lang, key))}</a>`;
  return `<header class="site-header">
  <a class="brand" href="/${lang}/" data-i18n="header.brand">${escapeHtml(tt(lang, "header.brand"))}</a>
  <nav>
    ${link("",         "nav.home")}
    ${link("cameras",  "nav.cameras")}
    ${link("guides/cr3","nav.guides")}
    ${link("compare", "nav.compare")}
    ${link("faq",      "nav.faq")}
    ${link("about",    "nav.about")}
  </nav>
  <div class="header-actions">
    <span id="status-pill" class="pill" data-i18n="status.warming">${escapeHtml(tt(lang, "status.warming"))}</span>
    <span class="github-star">
      <a class="github-button" href="${REPO_URL}"
         data-color-scheme="no-preference: dark; light: light; dark: dark;"
         data-icon="octicon-star" data-show-count="true"
         aria-label="Star ${escapeHtml(REPO_SLUG)} on GitHub">Star</a>
    </span>
    <span class="lang-switcher" aria-label="${escapeHtml(tt(lang, "lang.switcher"))}">
      <a href="/zh/" data-lang="zh">中</a>
      <a href="/en/" data-lang="en">EN</a>
      <a href="/ja/" data-lang="ja">日</a>
    </span>
    <button type="button" class="btn btn-secondary" data-crt-toggle aria-pressed="false" data-i18n="crt.toggle">${escapeHtml(tt(lang, "crt.toggle"))}</button>
  </div>
</header>`;
}

function footer(lang: Lang): string {
  const link = (slug: string, key: string) => `<a href="/${lang}/${slug}/" data-i18n="${key}">${escapeHtml(tt(lang, key))}</a>`;
  return `<footer class="site-footer">
  <p>
    <a href="${BRAND_HOME}" data-i18n="footer.copyright">${escapeHtml(tt(lang, "footer.copyright"))}</a>
    · <span data-i18n="footer.poweredBy">${escapeHtml(tt(lang, "footer.poweredBy"))}</span>
  </p>
  <p>
    ${link("privacy", "nav.privacy")} · ${link("terms", "nav.terms")} · ${link("cookies", "nav.cookies")}
    · <a href="${REPO_URL}" data-i18n="footer.github">${escapeHtml(tt(lang, "footer.github"))}</a>
    · <a href="#" data-cookie-settings data-i18n="footer.cookieSettings">${escapeHtml(tt(lang, "footer.cookieSettings"))}</a>
  </p>
</footer>`;
}

function entryShim(lang: Lang, kind: PageDef["kind"]): string {
  const dict = `/src/i18n/t-${lang}.ts`;
  const entry =
    kind === "tool"    ? "/src/entries/converter.ts"
    : kind === "cameras" ? "/src/entries/cameras.ts"
    :                    "/src/entries/content.ts";
  return `<script type="module">
    import "${dict}";
    import "${entry}";
  </script>`;
}

function toolBody(lang: Lang): string {
  // Per spec: no ad above the fold or near file picker. Small sidebar slot
  // appears further down on wide viewports only.
  return `<main>
  <h1 data-i18n="tool.title">${escapeHtml(tt(lang, "tool.title"))}</h1>
  <p class="tagline" data-i18n="tagline">${escapeHtml(tt(lang, "tagline"))}</p>
  <p class="privacy-note" data-i18n="privacy.note">${escapeHtml(tt(lang, "privacy.note"))}</p>

  <div id="banners" aria-live="polite"></div>

  <div id="dropzone" class="dropzone" tabindex="0" role="button"
       aria-label="${escapeHtml(tt(lang, "tool.dropzone.text"))}">
    <span class="icon" aria-hidden="true" data-i18n="tool.dropzone.icon">${escapeHtml(tt(lang, "tool.dropzone.icon"))}</span>
    <p data-i18n="tool.dropzone.text">${escapeHtml(tt(lang, "tool.dropzone.text"))}</p>
    <p class="hint" data-i18n="tool.dropzone.hint">${escapeHtml(tt(lang, "tool.dropzone.hint"))}</p>
    <input type="file">
  </div>

  <p id="detected" class="detected"></p>

  <form id="options" class="options" hidden>
    <label><input type="checkbox" name="lossless" checked>     <span data-i18n="tool.options.lossless">${escapeHtml(tt(lang, "tool.options.lossless"))}</span></label>
    <label><input type="checkbox" name="preview" checked>      <span data-i18n="tool.options.preview">${escapeHtml(tt(lang, "tool.options.preview"))}</span></label>
    <label><input type="checkbox" name="thumbnail" checked>    <span data-i18n="tool.options.thumbnail">${escapeHtml(tt(lang, "tool.options.thumbnail"))}</span></label>
    <label><input type="checkbox" name="applyScaling">         <span data-i18n="tool.options.applyScaling">${escapeHtml(tt(lang, "tool.options.applyScaling"))}</span></label>
  </form>

  <div id="progress" class="progress" hidden></div>

  <div class="actions">
    <button type="button" id="convert-btn" class="btn" disabled data-i18n="tool.convert">${escapeHtml(tt(lang, "tool.convert"))}</button>
    <button type="button" id="reset-btn" class="btn btn-secondary" hidden data-i18n="tool.reset">${escapeHtml(tt(lang, "tool.reset"))}</button>
    <a id="download" class="btn" hidden data-i18n="tool.download">${escapeHtml(tt(lang, "tool.download"))}</a>
  </div>

  <div id="sidebar-ad" class="ad-host"></div>
</main>`;
}

function contentBody(lang: Lang, page: PageDef, contentHtml: string): string {
  return `<main class="with-sidebar">
  <article>
    <h1>${escapeHtml(tt(lang, page.titleKey))}</h1>
    <div id="ad-top" class="ad-host"></div>
    ${contentHtml}
    <div id="ad-in-article" class="ad-host"></div>
  </article>
  <aside>
    <div id="ad-sidebar" class="ad-host"></div>
  </aside>
</main>`;
}

function camerasBody(lang: Lang, page: PageDef, contentHtml: string): string {
  return `<main class="with-sidebar">
  <article>
    <h1>${escapeHtml(tt(lang, page.titleKey))}</h1>
    <div id="ad-top" class="ad-host"></div>
    ${contentHtml}
    <div id="camera-table-host"></div>
    <div id="ad-in-article" class="ad-host"></div>
  </article>
  <aside>
    <div id="ad-sidebar" class="ad-host"></div>
  </aside>
</main>`;
}

function loadBody(lang: Lang, file: string): string {
  const path = resolve(root, "src/content", lang, file);
  if (!existsSync(path)) {
    // Fallback: empty placeholder so page builds even before content is written.
    return `<p><em>(content TBD)</em></p>`;
  }
  return readFileSync(path, "utf8");
}

function renderRootLanding(): string {
  // The root URL serves a real 200 page with the canonical product description
  // and links to all three language versions. Human browsers run redirect.ts
  // and bounce to /{lang}/ via Accept-Language detection within ~50ms; AI
  // crawlers (which do not execute JS) see this content and can index/cite it.
  // The Cloudflare Worker also short-circuits the redirect for known bot UAs
  // so they get a clean 200 instead of a 302 chain.
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    "name": "NeoAnalogLab",
    "url": BRAND_HOME,
    "sameAs": [REPO_URL]
  };
  const siteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    "url": SITE_ORIGIN,
    "name": "dnglab-online",
    "alternateName": ["NeoAnalogLab DNG Converter", "dnglab online"],
    "description": "Free, fully client-side RAW → DNG converter that runs in the browser.",
    "publisher": { "@id": `${SITE_ORIGIN}/#organization` },
    "inLanguage": ["zh-CN", "en-US", "ja-JP"]
  };
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_ORIGIN}/#software`,
    "name": "dnglab-online",
    "alternateName": "NeoAnalogLab DNG Converter",
    "url": SITE_ORIGIN,
    "applicationCategory": "MultimediaApplication",
    "applicationSubCategory": "Photography Tool",
    "operatingSystem": "Any (browser)",
    "browserRequirements": "Requires WebAssembly and ES2022 (Chrome/Edge ≥ 100, Firefox ≥ 100, Safari ≥ 15.4)",
    "isAccessibleForFree": true,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "publisher": { "@id": `${SITE_ORIGIN}/#organization` },
    "softwareVersion": "1.0",
    "license": "https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html",
    "codeRepository": REPO_URL,
    "featureList": [
      "Convert Canon CR3, CR2, CRW to Adobe DNG",
      "Convert Nikon NEF, NRW to Adobe DNG",
      "Convert Sony ARW, SR2, SRF to Adobe DNG",
      "Convert Fujifilm RAF to Adobe DNG",
      "LJPEG-92 lossless DNG compression",
      "Optional embedded preview and thumbnail",
      "100% client-side (no upload, no server processing)",
      "Trilingual UI: English, 简体中文, 日本語"
    ]
  };
  const altLinks = LANGS.map(l => `  <link rel="alternate" hreflang="${l}" href="${SITE_ORIGIN}/${l}/">`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>dnglab-online — RAW to DNG converter (Canon CR3, Nikon NEF, Sony ARW, in-browser)</title>
  <meta name="description" content="Free, fully client-side RAW → DNG converter. Convert Canon CR3, Nikon NEF, Sony ARW, Fujifilm RAF and more to Adobe DNG 1.4 in your browser. No upload. No server. Open source.">
  <link rel="canonical" href="${SITE_ORIGIN}/">
${altLinks}
  <link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/zh/">
  <meta property="og:site_name" content="NeoAnalogLab">
  <meta property="og:title" content="dnglab-online — RAW to DNG converter">
  <meta property="og:description" content="Free, fully client-side RAW → DNG converter that runs in the browser.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_ORIGIN}/">
  <meta property="og:image" content="${SITE_ORIGIN}/og-cover.png">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script type="application/ld+json">${JSON.stringify(orgSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(siteSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(softwareSchema)}</script>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 720px; margin: 4rem auto; padding: 0 1.5rem; line-height: 1.6; color: #222; background: #f6f6f4; }
    h1 { font-size: 1.6rem; margin-bottom: .25rem; }
    .tagline { color: #555; margin-top: 0; }
    .langs { margin: 2rem 0; padding: 1rem 1.25rem; border: 1px solid #ddd; border-radius: 6px; background: #fff; }
    .langs a { display: inline-block; margin-right: 1rem; font-weight: 600; }
    .meta { color: #777; font-size: .9rem; margin-top: 2rem; }
    .meta a { color: #555; }
  </style>
</head>
<body>
  <h1>dnglab-online — RAW to DNG converter</h1>
  <p class="tagline">Free, fully client-side RAW → DNG converter. Runs entirely in your browser via WebAssembly.</p>

  <p>dnglab-online converts native camera RAW files (Canon CR3 / CR2, Nikon NEF,
  Sony ARW, Fujifilm RAF, Olympus ORF, Panasonic RW2, Pentax PEF, Hasselblad 3FR,
  Phase One IIQ, and dozens more) to Adobe DNG 1.4 with LJPEG-92 lossless
  compression. Your RAW bytes never leave your device — every step happens
  inside the browser sandbox.</p>

  <p>Published by <strong>NeoAnalogLab</strong>. Open source, LGPL-2.1.
  Source on <a href="${REPO_URL}">GitHub</a>.</p>

  <div class="langs" aria-label="Choose a language">
    <p><strong>Choose a language:</strong></p>
    <p>
      <a href="/zh/" hreflang="zh">中文</a>
      <a href="/en/" hreflang="en">English</a>
      <a href="/ja/" hreflang="ja">日本語</a>
    </p>
  </div>

  <p class="meta">
    <a href="/sitemap.xml">Sitemap</a> ·
    <a href="/llms.txt">llms.txt</a> ·
    <a href="/pricing.md">Pricing</a> ·
    <a href="/AGENTS.md">AGENTS.md</a>
  </p>
  <script type="module" src="/src/entries/redirect.ts"></script>
</body>
</html>`;
}

function renderPage(lang: Lang, page: PageDef): string {
  let body: string;
  let rawContent = "";
  if (page.kind === "tool") {
    body = toolBody(lang);
  } else {
    rawContent = page.bodyFile ? loadBody(lang, page.bodyFile) : `<p>(empty)</p>`;
    body = page.kind === "cameras" ? camerasBody(lang, page, rawContent) : contentBody(lang, page, rawContent);
  }
  const jsonLd = jsonLdFor(lang, page, rawContent);
  return `<!doctype html>
<html ${htmlAttrs(lang)}>
<head>
${head(lang, page)}
${jsonLd}
</head>
<body>
${header(lang)}
${body}
${footer(lang)}
<script async defer src="https://buttons.github.io/buttons.js"></script>
${entryShim(lang, page.kind)}
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function writeOut(rel: string, html: string): void {
  const abs = resolve(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, html);
}

// Root landing — real 200 content with hreflang + JSON-LD; redirect.ts bounces
// human visitors to /{lang}/ within ~50ms. AI crawlers (no JS) read this page.
writeOut("index.html", renderRootLanding());

// Per-language pages.
let count = 1;
for (const lang of LANGS) {
  for (const page of PAGES) {
    const rel = page.slug
      ? `${lang}/${page.slug}/index.html`
      : `${lang}/index.html`;
    writeOut(rel, renderPage(lang, page));
    count++;
  }
}

console.log(`gen-pages: wrote ${count} HTML files`);
