import { defineConfig } from "vite";
import { readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Walk the project root and collect every *.html file as a Rollup entry.
// Output path mirrors source path: web/zh/about/index.html → dist/zh/about/index.html.
function discoverPages(): Record<string, string> {
  const out: Record<string, string> = {};
  const skip = new Set(["node_modules", "dist", "src", "scripts", "worker", "public", ".wrangler"]);
  const walk = (dir: string, depth: number) => {
    for (const entry of readdirSync(dir)) {
      if (depth === 0 && skip.has(entry)) continue;
      if (entry.startsWith(".")) continue;
      const abs = resolve(dir, entry);
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        walk(abs, depth + 1);
      } else if (entry.endsWith(".html")) {
        const rel = relative(__dirname, abs).replace(/\\/g, "/");
        const key = rel.replace(/\.html$/, "") || "index";
        out[key] = abs;
      }
    }
  };
  walk(__dirname, 0);
  return out;
}

export default defineConfig({
  base: "/",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: discoverPages(),
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  worker: { format: "es" },
  server: { fs: { allow: [".."] } },
});
