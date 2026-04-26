// Tiny i18n: each HTML page sets window.__LANG__ and imports its language
// dictionary. There is no fallback chain — keys must exist in the active locale.
//
// Per-page bundle minimization: import "./t-zh", "./t-en", or "./t-ja"
// from the page entry; this `t.ts` is the shared signature only.

declare global {
  interface Window {
    __LANG__: "zh" | "en" | "ja";
    __DICT__?: Record<string, string>;
  }
}

export type Lang = "zh" | "en" | "ja";

export function t(key: string): string {
  const dict = (typeof window !== "undefined" && window.__DICT__) || {};
  return dict[key] ?? key;
}

export function lang(): Lang {
  return (typeof window !== "undefined" && window.__LANG__) || "zh";
}

export function setDict(dict: Record<string, string>): void {
  if (typeof window !== "undefined") window.__DICT__ = dict;
}
