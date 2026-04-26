// Single source of truth for what HTML pages exist on the site.
// gen-pages.ts walks this list to materialize the actual *.html files
// before Vite reads them.

export type Lang = "zh" | "en" | "ja";
export const LANGS: Lang[] = ["zh", "en", "ja"];

export type PageKind = "tool" | "content" | "cameras";

export type PageDef = {
  /** URL path segment under the language root, "" for the home page. */
  slug: string;
  /** Which entry script binds it. */
  kind: PageKind;
  /** i18n key for the page title (used in <title>); falls back to slug. */
  titleKey: string;
  /** Plain English description for AdSense / SEO; per-language override below. */
  descKey: string;
  /** Plain text body file under src/content/{lang}/ — the body HTML is loaded
   *  from there when the gen script renders the page. Optional for the tool. */
  bodyFile?: string;
};

export const PAGES: PageDef[] = [
  { slug: "",            kind: "tool",    titleKey: "tool.title",      descKey: "tagline" },
  { slug: "about",       kind: "content", titleKey: "nav.about",       descKey: "tagline",         bodyFile: "about.html" },
  { slug: "faq",         kind: "content", titleKey: "nav.faq",         descKey: "tagline",         bodyFile: "faq.html" },
  { slug: "cameras",     kind: "cameras", titleKey: "nav.cameras",     descKey: "tagline",         bodyFile: "cameras.html" },
  { slug: "privacy",     kind: "content", titleKey: "nav.privacy",     descKey: "tagline",         bodyFile: "privacy.html" },
  { slug: "terms",       kind: "content", titleKey: "nav.terms",       descKey: "tagline",         bodyFile: "terms.html" },
  { slug: "cookies",     kind: "content", titleKey: "nav.cookies",     descKey: "tagline",         bodyFile: "cookies.html" },
  { slug: "guides/cr3",  kind: "content", titleKey: "nav.guides",      descKey: "tagline",         bodyFile: "guides-cr3.html" },
  { slug: "guides/arw",  kind: "content", titleKey: "nav.guides",      descKey: "tagline",         bodyFile: "guides-arw.html" },
];
