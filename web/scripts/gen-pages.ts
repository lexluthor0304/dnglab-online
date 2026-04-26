// Materializes every HTML entry on disk before Vite reads them.
// Run from `npm run build` and `npm run dev` (idempotent; safe to re-run).

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES, LANGS, type Lang, type PageDef } from "./pages";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

const dicts: Record<Lang, Record<string, string>> = {
  zh: JSON.parse(readFileSync(resolve(root, "src/i18n/locales/zh.json"), "utf8")),
  en: JSON.parse(readFileSync(resolve(root, "src/i18n/locales/en.json"), "utf8")),
  ja: JSON.parse(readFileSync(resolve(root, "src/i18n/locales/ja.json"), "utf8")),
};

const SITE_ORIGIN = process.env.VITE_SITE_ORIGIN || "https://dng.neoanaloglab.com";
const BRAND_HOME  = process.env.VITE_BRAND_HOME  || "https://neoanaloglab.com";

function tt(lang: Lang, key: string): string {
  return dicts[lang][key] ?? key;
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
  <script>window.__LANG__="${lang}";</script>`;
}

function header(lang: Lang): string {
  const link = (slug: string, key: string) => `<a href="/${lang}/${slug}${slug ? "/" : ""}" data-i18n="${key}">${escapeHtml(tt(lang, key))}</a>`;
  return `<header class="site-header">
  <a class="brand" href="/${lang}/" data-i18n="brand">${escapeHtml(tt(lang, "brand"))}</a>
  <nav>
    ${link("",         "nav.home")}
    ${link("cameras",  "nav.cameras")}
    ${link("guides/cr3","nav.guides")}
    ${link("faq",      "nav.faq")}
    ${link("about",    "nav.about")}
  </nav>
  <div class="header-actions">
    <span id="status-pill" class="pill" data-i18n="status.warming">${escapeHtml(tt(lang, "status.warming"))}</span>
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
    · <a href="https://github.com/dnglab/dnglab" data-i18n="footer.github">${escapeHtml(tt(lang, "footer.github"))}</a>
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

function renderRootRedirect(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>NeoAnalogLab — RAW to DNG</title>
  <meta name="description" content="Convert any camera RAW to DNG in your browser.">
  <link rel="canonical" href="${SITE_ORIGIN}/">
  <meta http-equiv="refresh" content="0; url=/zh/">
</head>
<body>
  <script type="module" src="/src/entries/redirect.ts"></script>
  <p><a href="/zh/">中文</a> · <a href="/en/">English</a> · <a href="/ja/">日本語</a></p>
</body>
</html>`;
}

function renderPage(lang: Lang, page: PageDef): string {
  let body: string;
  if (page.kind === "tool") {
    body = toolBody(lang);
  } else {
    const html = page.bodyFile ? loadBody(lang, page.bodyFile) : `<p>(empty)</p>`;
    body = page.kind === "cameras" ? camerasBody(lang, page, html) : contentBody(lang, page, html);
  }
  return `<!doctype html>
<html ${htmlAttrs(lang)}>
<head>
${head(lang, page)}
</head>
<body>
${header(lang)}
${body}
${footer(lang)}
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

// Root redirect.
writeOut("index.html", renderRootRedirect());

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
