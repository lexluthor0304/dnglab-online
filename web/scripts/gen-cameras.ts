// Parses /Users/lex/dnglab/SUPPORTED_CAMERAS.md (the upstream camera list)
// into src/data/cameras.json so the cameras-page entry can render a table
// without runtime markdown parsing.
//
// Upstream format: one big GitHub-flavoured markdown table at the top with
// columns: | Make | Model | State | Modes | Remarks |.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "../..");

const md = readFileSync(resolve(repoRoot, "SUPPORTED_CAMERAS.md"), "utf8");

type Row = {
  make: string;
  model: string;
  supported: string;
  modes: string;
  remarks: string;
};

const rows: Row[] = [];
let inTable = false;
let pastSeparator = false;

for (const rawLine of md.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line.startsWith("|") || !line.endsWith("|")) {
    inTable = false;
    pastSeparator = false;
    continue;
  }
  const cells = line.slice(1, -1).split("|").map((s: string) => s.trim());
  // Header row?
  if (!inTable && /^make$/i.test(cells[0])) {
    inTable = true;
    continue;
  }
  if (inTable && !pastSeparator) {
    // Separator row "| --- | --- | …".
    if (cells.every((c: string) => /^:?-+:?$/.test(c))) {
      pastSeparator = true;
      continue;
    }
    // No separator after header? Treat next line as data.
    pastSeparator = true;
  }
  if (inTable && pastSeparator) {
    rows.push({
      make:      cells[0] ?? "",
      model:     cells[1] ?? "",
      supported: cells[2] ?? "",
      modes:     cells[3] ?? "",
      remarks:   cells[4] ?? "",
    });
  }
}

const outPath = resolve(__dirname, "../src/data/cameras.json");
writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log(`gen-cameras: wrote ${rows.length} rows → ${outPath}`);
