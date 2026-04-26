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

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;

    // Root → language redirect.
    if (p === "/" || p === "") {
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
    if (p === "/ads.txt" || p === "/robots.txt") {
      const h = new Headers(res.headers);
      h.set("Content-Type", "text/plain; charset=utf-8");
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
