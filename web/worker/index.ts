/// <reference types="@cloudflare/workers-types" />
// Cloudflare Worker entrypoint. The Static Assets binding (`ASSETS`) does
// the heavy lifting; this layer adds:
//   - Accept-Language redirect from "/" to "/{lang}/"
//   - Content-Type override for *.wasm (with long immutable cache)
//   - Content-Type override for /ads.txt /robots.txt /sitemap.xml
//
// Everything else passes straight through to the assets fetcher.

interface Env {
  ASSETS: Fetcher;
  DEFAULT_LANG: string;
  SITE_ORIGIN: string;
  BRAND_HOME: string;
}

type Lang = "zh" | "en" | "ja";

function pickLang(req: Request, fallback: string): Lang {
  const al = (req.headers.get("accept-language") ?? "").toLowerCase();
  for (const tag of al.split(",").map((s) => s.trim().split(";")[0])) {
    if (tag.startsWith("ja")) return "ja";
    if (tag.startsWith("zh")) return "zh";
    if (tag.startsWith("en")) return "en";
  }
  return (fallback === "en" || fallback === "ja") ? fallback : "zh";
}

// User-agent matcher for known search and AI crawlers. When one of these hits
// the root URL we serve the 200 landing (with hreflang + JSON-LD) directly
// instead of bouncing through a 302 — gives crawlers a clean canonical page
// to index and cite. Human browsers continue to get the Accept-Language 302.
const BOT_UA_RE =
  /\b(GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|Claude-SearchBot|PerplexityBot|Perplexity-User|Google-Extended|GoogleOther|Googlebot|Bingbot|Applebot|CCBot|FacebookBot|Meta-ExternalAgent|DuckAssistBot|cohere-ai|YandexBot|Baiduspider)\b/i;

function isBot(req: Request): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  return BOT_UA_RE.test(ua);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;

    // Root → language redirect (humans only). Bots get the static 200 landing.
    if (p === "/" || p === "") {
      if (isBot(req)) {
        return env.ASSETS.fetch(req);
      }
      const lang = pickLang(req, env.DEFAULT_LANG);
      return Response.redirect(`${url.origin}/${lang}/`, 302);
    }

    // Pass through to static assets and rewrite headers if needed.
    const res = await env.ASSETS.fetch(req);

    if (p.endsWith(".wasm")) {
      const h = new Headers(res.headers);
      h.set("Content-Type", "application/wasm");
      h.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(res.body, { status: res.status, headers: h });
    }
    if (p === "/ads.txt" || p === "/robots.txt" || p === "/llms.txt" || p === "/AGENTS.md" || p === "/pricing.md") {
      const h = new Headers(res.headers);
      h.set("Content-Type", p.endsWith(".md") ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8");
      h.set("Cache-Control", "public, max-age=3600");
      return new Response(res.body, { status: res.status, headers: h });
    }
    if (p === "/sitemap.xml") {
      const h = new Headers(res.headers);
      h.set("Content-Type", "application/xml; charset=utf-8");
      h.set("Cache-Control", "public, max-age=3600");
      return new Response(res.body, { status: res.status, headers: h });
    }
    return res;
  },
} satisfies ExportedHandler<Env>;
