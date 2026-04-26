// Mounts an AdSense <ins> tag inside the host element only when an
// AdSense client id is configured (production env). In dev the host stays
// empty so we don't bloat the dev console with adsbygoogle warnings.

declare global {
  interface Window {
    adsbygoogle?: object[];
  }
}

let scriptInjected = false;

function injectScript(client: string): void {
  if (scriptInjected) return;
  scriptInjected = true;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(s);
}

export type AdSlotOptions = {
  slot: string;
  format?: "auto" | "fluid";
  layout?: "in-article" | undefined;
  className?: string;
};

/**
 * Render an ad slot if VITE_ADSENSE_CLIENT is set. Otherwise no-op.
 */
export function mountAdSlot(host: HTMLElement, opts: AdSlotOptions): void {
  const client = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) ?? "";
  if (!client) return;
  injectScript(client);

  const ins = document.createElement("ins");
  ins.className = `adsbygoogle ad-slot ${opts.className ?? ""}`.trim();
  ins.style.display = "block";
  ins.setAttribute("data-ad-client", client);
  ins.setAttribute("data-ad-slot", opts.slot);
  ins.setAttribute("data-ad-format", opts.format ?? "auto");
  ins.setAttribute("data-full-width-responsive", "true");
  if (opts.layout === "in-article") {
    ins.setAttribute("data-ad-layout", "in-article");
  }
  host.appendChild(ins);

  (window.adsbygoogle = window.adsbygoogle || []).push({});
}
