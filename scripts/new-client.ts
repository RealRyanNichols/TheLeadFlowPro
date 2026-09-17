// Scaffold a client site from the factory template.
//
//   npm run factory:new -- --config factory/clients/fixture-fence-co.json
//   npm run factory:new -- --config path/to/site.config.json --out build/clients
//
// Copies factory/template into build/clients/<slug> (gitignored), writes the
// validated config as site.config.json, and prints the next steps. Nothing is
// deployed, no account is touched, and the output directory is never inside
// this repo's tracked tree.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateClientConfig, type ClientConfig } from "../factory/template/lib/config.ts";

const TEMPLATE = resolve(process.cwd(), "factory/template");

export type ScaffoldResult = { outDir: string; slug: string };

export function scaffoldClientSite(config: ClientConfig, outRoot: string, opts: { force?: boolean } = {}): ScaffoldResult {
  const problems = validateClientConfig(config);
  if (problems.length) {
    throw new Error(`config is not valid:\n${problems.map((p) => `  ${p.path}: ${p.message}`).join("\n")}`);
  }
  const outDir = join(resolve(outRoot), config.slug);
  if (existsSync(outDir)) {
    if (!opts.force) throw new Error(`${outDir} already exists (pass --force to replace it)`);
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });
  cpSync(TEMPLATE, outDir, {
    recursive: true,
    filter: (src) => !src.includes(`${TEMPLATE}/node_modules`) && !src.includes(`${TEMPLATE}/.next`),
  });
  writeFileSync(join(outDir, "site.config.json"), `${JSON.stringify(config, null, 2)}\n`);
  return { outDir, slug: config.slug };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("new-client.ts")) {
  const configPath = arg("config");
  if (!configPath) {
    console.error("usage: npm run factory:new -- --config <site.config.json> [--out build/clients] [--force]");
    process.exit(2);
  }
  const config = JSON.parse(readFileSync(resolve(configPath), "utf8")) as ClientConfig;
  try {
    const { outDir, slug } = scaffoldClientSite(config, arg("out") ?? "build/clients", { force: process.argv.includes("--force") });
    console.log(`Scaffolded ${slug} at ${outDir}`);
    console.log("");
    console.log("Next:");
    console.log(`  1. npm run factory:qa -- --config ${configPath}`);
    console.log(`  2. cd ${outDir} && npm install && npm run dev`);
    console.log("  3. Follow docs/engines/7.1-client-site-factory.md for the launch checklist.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
