import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { hostname } from "node:os";
import { createOpenAIImageProvider } from "../lib/pictureStudio/provider";
import { processNextPictureJob } from "../lib/pictureStudio/worker";
import * as store from "../lib/pictureStudio/store";
import { storageReady } from "../lib/pictureStudio/storage";

export function validatePictureWorkerEnvironment(env: NodeJS.ProcessEnv = process.env) {
  if (env.PICTURE_STUDIO_ENABLED !== "true" || env.PICTURE_AUTOMATION_ENABLED !== "true") throw new Error("Picture Studio automation is disabled.");
  if (!env.OPENAI_API_KEY?.trim()) throw new Error("The image provider key is not configured.");
  if (!env.PICTURE_DATABASE_URL?.trim()) throw new Error("A dedicated local picture database connection is required.");
  let database: URL;
  try { database = new URL(env.PICTURE_DATABASE_URL); } catch { throw new Error("The picture database connection is invalid."); }
  if (!["postgres:", "postgresql:"].includes(database.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) {
    throw new Error("Picture Studio must use the existing droplet's local Postgres connection.");
  }
  const storageRoot = env.PICTURE_STORAGE_DIR || "/var/lib/leadflow-picture-studio";
  if (!isAbsolute(storageRoot) || /(?:^|\/)public(?:\/|$)/i.test(storageRoot)) throw new Error("Picture storage must be an absolute private directory outside public assets.");
  const daily = Number(env.PICTURE_DAILY_BUDGET_CENTS || 2500);
  const image = Number(env.PICTURE_MAX_IMAGE_COST_CENTS || 100);
  if (!Number.isSafeInteger(daily) || daily < 1 || daily > 2500 || !Number.isSafeInteger(image) || image < 1 || image > 100) {
    throw new Error("Picture generation budgets must remain within the configured safety ceilings.");
  }
  return { storageRoot: resolve(storageRoot), workerId: `picture-studio:${hostname()}:${process.pid}` };
}

function waitForNextPoll(signal: AbortSignal, milliseconds = 5000) {
  return new Promise<void>((done) => {
    if (signal.aborted) { done(); return; }
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", finish); done(); };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", finish, { once: true });
  });
}

async function main() {
  const configuration = validatePictureWorkerEnvironment();
  const directory = await stat(configuration.storageRoot).catch(() => null);
  if (!directory?.isDirectory() || (directory.mode & 0o007) !== 0 || !(await storageReady())) throw new Error("Provision the protected private picture storage folder before starting the worker.");
  await access(configuration.storageRoot, constants.R_OK | constants.W_OK);
  if (!(await store.databaseReady())) throw new Error("The picture database migration is not ready.");
  if (process.argv.includes("--check")) {
    console.log("Picture Studio preflight passed: automation flags, local database, private storage and provider configuration. No provider call was made.");
    process.exit(0);
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  const provider = createOpenAIImageProvider(process.env.OPENAI_API_KEY!);
  let healthBusy = false;
  let unhealthy = false;
  await store.workerHeartbeat(configuration.workerId);
  const health = setInterval(() => {
    if (healthBusy) return;
    healthBusy = true;
    void store.workerHeartbeat(configuration.workerId).catch(() => { unhealthy = true; controller.abort(); }).finally(() => { healthBusy = false; });
  }, 30_000);
  health.unref();
  console.log("Picture Studio worker started with one job at a time and spend limits enabled.");
  try {
    while (!controller.signal.aborted) {
      const worked = await processNextPictureJob({ store, provider, ...configuration, signal: controller.signal });
      if (!worked) await waitForNextPoll(controller.signal);
    }
    if (unhealthy) throw new Error("Picture database heartbeat failed.");
  } finally {
    clearInterval(health);
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}

// Environment validation can be imported by tests without starting or spending.
if (process.argv[1]?.endsWith("picture-studio-worker.ts")) {
  main().then(() => process.exit(0)).catch(() => {
    console.error("Picture Studio worker stopped. Check protected configuration, database, storage and paused jobs before restarting.");
    process.exit(1);
  });
}
