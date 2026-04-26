// Replaces the /zh|en|ja/ prefix in the current path. The header markup
// already contains <a href="..."> for each language; this just sets
// aria-current on the active one.

const RE = /^\/(zh|en|ja)(\/|$)/;

export function initLangSwitcher(host: HTMLElement, current: "zh" | "en" | "ja"): void {
  for (const a of Array.from(host.querySelectorAll<HTMLAnchorElement>("a[data-lang]"))) {
    const target = a.getAttribute("data-lang") as "zh" | "en" | "ja";
    if (target === current) a.setAttribute("aria-current", "true");
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const path = window.location.pathname;
      const next = RE.test(path)
        ? path.replace(RE, `/${target}$2`)
        : `/${target}/`;
      window.location.assign(next);
    });
  }
}
