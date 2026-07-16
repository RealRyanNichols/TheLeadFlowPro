// Self-extracting deploy for TheLeadFlowPro.
// Runs before `next build`: clears EVERYTHING from the old repo except build
// infrastructure, then writes the current tree from payload.b64.
// Canonical pretty source: the versioned zips (payload decompresses to it).
import { brotliDecompressSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { dirname } from "node:path";

const KEEP = new Set(["node_modules", ".next", ".git", ".vercel", ".npmrc", "unpack.mjs", "payload.b64", "package.json", "vercel.json"]);
for (const entry of readdirSync(".")) {
  if (KEEP.has(entry)) continue;
  try { rmSync(entry, { recursive: true, force: true }); } catch {}
}

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
