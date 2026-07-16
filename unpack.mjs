// Self-extracting deploy for TheLeadFlowPro.
// Runs before `next build`: clears the old site's source, then writes the
// current tree from payload.b64. Canonical pretty source: the versioned zips
// (and this payload — it decompresses to the full commented source).
import { brotliDecompressSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

const STALE = ["app","components","lib","pages","src","styles","public","middleware.ts","middleware.js","tailwind.config.ts","tailwind.config.js","postcss.config.js","postcss.config.mjs","next.config.js","next.config.mjs","next.config.ts","tsconfig.json","package-lock.json"];
for (const d of STALE) { try { rmSync(d, { recursive: true, force: true }); } catch {} }

const files = JSON.parse(
  brotliDecompressSync(Buffer.from(readFileSync("payload.b64", "utf8").trim(), "base64")).toString("utf8")
);
let n = 0;
for (const [p, v] of Object.entries(files)) {
  if (p.includes("..") || p.startsWith("/")) continue;
  mkdirSync(dirname(p), { recursive: true });
  if (v && typeof v === "object" && v.b64) writeFileSync(p, Buffer.from(v.data, "base64"));
  else writeFileSync(p, v, "utf8");
  n++;
}
console.log(`[unpack] wrote ${n} source files`);
