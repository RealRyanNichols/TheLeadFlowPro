// E2E configuration for the free-tools section.
//
// Run: npm run test:e2e            (starts a dev server if one is not running)
//
// Unit tests stay on `npm test` (tests/*.test.ts, node:test); these specs live
// in tests/e2e/*.spec.ts so neither runner picks up the other's files.

import { existsSync } from "node:fs";
import { defineConfig } from "playwright/test";

// Managed environments pre-install a Chromium at a stable path that may not
// match the npm-pinned Playwright build. Prefer it when present; elsewhere
// (a laptop with `npx playwright install` run) fall back to the default.
const PREINSTALLED = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 2,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    launchOptions: existsSync(PREINSTALLED)
      ? { executablePath: PREINSTALLED, args: ["--no-sandbox"] }
      : { args: ["--no-sandbox"] },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/tools",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
