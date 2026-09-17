// Loads and validates site.config.json once for the standalone app.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateClientConfig, type ClientConfig } from "./config";

let cached: ClientConfig | null = null;

export function loadConfig(): ClientConfig {
  if (cached) return cached;
  const raw = readFileSync(join(process.cwd(), "site.config.json"), "utf8");
  const parsed = JSON.parse(raw) as ClientConfig;
  const problems = validateClientConfig(parsed);
  if (problems.length) {
    throw new Error(`site.config.json is not valid:\n${problems.map((p) => `  ${p.path}: ${p.message}`).join("\n")}`);
  }
  cached = parsed;
  return parsed;
}
