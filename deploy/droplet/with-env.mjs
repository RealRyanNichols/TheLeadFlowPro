// Runs a command with the variables from an env file added to its environment.
//
//   node deploy/droplet/with-env.mjs /run/secrets/webenv -- npm run build
//
// The droplet image build uses it so `npm run build` sees the same production
// variables a Vercel build does, from a BuildKit secret that never lands in an
// image layer. The file format matches Docker Compose env_file: KEY=value per
// line, # comments, optional `export `, and optional quotes. Double quotes
// honour \n, \" and \\; single quotes are literal.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Parses env-file text into a plain object. Later keys win. */
export function parseEnvFile(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rest] = match;
    let value = rest;
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value
        .slice(1, -1)
        .replace(/\\(n|"|\\)/g, (_, c) => (c === "n" ? "\n" : c));
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    out[key] = value;
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const [file, dashes, command, ...args] = process.argv.slice(2);
  if (!file || dashes !== "--" || !command) {
    console.error("usage: node with-env.mjs <env-file> -- <command> [args...]");
    process.exit(2);
  }
  const vars = parseEnvFile(readFileSync(file, "utf8"));
  const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...vars } });
  child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
}
