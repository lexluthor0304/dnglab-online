// Shared bootstrap logic that every page entry runs after its
// language-specific dictionary has been loaded.

import { initLangSwitcher } from "../ui/LangSwitcher";
import { initCrtToggle } from "../ui/CrtToggle";
import { initConsentLink } from "../ui/ConsentBanner";
import { lang, t } from "../i18n/t";

export function initChrome(): void {
  // Translate every element with a data-i18n="key" attribute.
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-i18n]"))) {
    const k = el.getAttribute("data-i18n");
    if (k) el.textContent = t(k);
  }
  // Translate placeholder / title / aria-label via data-i18n-{attr}="key".
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-i18n-attr]"))) {
    const spec = el.getAttribute("data-i18n-attr") ?? "";
    for (const pair of spec.split(",")) {
      const [attr, key] = pair.split(":");
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    }
  }

  const langHost = document.querySelector<HTMLElement>(".lang-switcher");
  if (langHost) initLangSwitcher(langHost, lang());

  const crtBtn = document.querySelector<HTMLElement>("[data-crt-toggle]");
  if (crtBtn) initCrtToggle(crtBtn);

  const cookieLink = document.querySelector<HTMLElement>("[data-cookie-settings]");
  if (cookieLink) initConsentLink(cookieLink);
}
