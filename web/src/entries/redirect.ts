// Root index.html JS fallback — the Worker already does Accept-Language
// routing at the edge, so this only fires when someone hits a static-only
// preview without the Worker (e.g. plain `vite preview` against dist/).

const DEFAULT = "zh";
const navLang = (typeof navigator !== "undefined" && navigator.language || "").toLowerCase();
const lang =
  navLang.startsWith("ja") ? "ja" :
  navLang.startsWith("zh") ? "zh" :
  navLang.startsWith("en") ? "en" :
  DEFAULT;
window.location.replace(`/${lang}/`);
