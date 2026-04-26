// Wires the footer "Cookie settings" link to Google's Funding Choices CMP.
// In dev (no AdSense) it's a no-op.

declare global {
  interface Window {
    googlefc?: {
      callbackQueue?: Array<unknown>;
      showRevocationMessage?: () => void;
    };
  }
}

export function initConsentLink(link: HTMLElement): void {
  const enabled = !!(import.meta.env.VITE_ADSENSE_CLIENT as string | undefined);
  if (!enabled) {
    // Hide the cookie-settings link in dev to avoid a dead button.
    link.hidden = true;
    return;
  }
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const fc = window.googlefc;
    if (fc?.showRevocationMessage) {
      fc.showRevocationMessage();
    } else if (fc?.callbackQueue) {
      fc.callbackQueue.push({
        CONSENT_API_READY: () => window.googlefc?.showRevocationMessage?.(),
      });
    }
  });
}
