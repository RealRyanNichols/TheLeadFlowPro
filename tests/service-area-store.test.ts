import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  publicTerritories,
  type Inquiry,
  type Registry,
  type Territory,
} from "../lib/service-areas/engine.ts";
import {
  initializeServiceAreaStore,
  readServiceAreaState,
  saveServiceAreaRegistry,
  serviceAreaDirectory,
  submitServiceAreaInquiry,
  type StoreOptions,
} from "../lib/service-areas/store.ts";

const privateRecord: Territory = {
  id: "synthetic-promise",
  clientName: "Synthetic private client",
  industry: "farm-ag",
  services: ["hay", "earthwork"],
  exclusivity: "industry",
  stage: "review",
  geometry: { kind: "unknown" },
  centerVerified: false,
  publicGeometry: null,
  publicRegion: "",
  publicApproved: false,
  publicConsent: "",
  evidence: "Private synthetic source",
  notes: "Pending operating base",
  expiresAt: null,
  inquiryId: null,
  adRadiusMiles: null,
  adTargetingVerified: false,
};
const initial: Registry = { version: 1, territories: [privateRecord] };
const inquiry = (change: Partial<Inquiry> = {}): Inquiry => ({
  requestId: randomUUID(),
  name: "Synthetic operator",
  email: "operator@example.com",
  business: "Synthetic business",
  industry: "farm-ag",
  services: ["hay", "earthwork"],
  market: "Tyler, TX",
  scope: "local",
  states: [],
  miles: 35,
  publicConsent: false,
  contactConsent: true,
  ...change,
});
async function fixture(t: {
  after: (fn: () => Promise<void>) => void;
}): Promise<StoreOptions> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "leadflow-area-store-test-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory };
}

test("private initialization is durable, restrictive, idempotent, and never publishes pending promises", async (t) => {
  const options = await fixture(t);
  assert.equal(await readServiceAreaState(options), null);
  const first = await initializeServiceAreaStore(
    initial,
    "synthetic-admin",
    options,
  );
  assert.equal(first.revision, 1);
  assert.equal((await lstat(options.directory!)).mode & 0o777, 0o700);
  assert.equal(
    (await lstat(path.join(options.directory!, "state.json"))).mode & 0o777,
    0o600,
  );
  assert.deepEqual(publicTerritories(first.registry), []);
  const restored = await initializeServiceAreaStore(
    { version: 1, territories: [] },
    "another-admin",
    options,
  );
  assert.equal(restored.registry.territories[0].id, privateRecord.id);
  assert.equal(restored.audit.length, 1);
});

test("two concurrent operator saves preserve one winner, reject stale revisions, and retain the audit", async (t) => {
  const options = await fixture(t);
  await initializeServiceAreaStore(initial, "synthetic-admin", options);
  const changed = (note: string): Registry => ({
    version: 1,
    territories: [{ ...privateRecord, notes: note }],
  });
  const results = await Promise.allSettled([
    saveServiceAreaRegistry(
      changed("First operator edit"),
      1,
      "operator-a",
      options,
    ),
    saveServiceAreaRegistry(
      changed("Second operator edit"),
      1,
      "operator-b",
      options,
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const failure = results.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  assert.equal(failure.reason.status, 409);
  const stored = (await readServiceAreaState(options))!;
  assert.equal(stored.revision, 2);
  assert.equal(stored.audit.length, 2);
  assert.equal(
    stored.audit[1].previous_document!.territories[0].notes,
    privateRecord.notes,
  );
  assert.equal(
    stored.audit[1].next_document.territories[0].notes,
    stored.registry.territories[0].notes,
  );
});

test("identical retries dedup while corrected radius, services, scope, and consent preserve new private snapshots", async (t) => {
  const options = await fixture(t);
  await initializeServiceAreaStore(initial, "synthetic-admin", options);
  const first = inquiry();
  assert.equal(
    (await submitServiceAreaInquiry(first, options)).id,
    first.requestId,
  );
  assert.equal(
    (await submitServiceAreaInquiry(first, options)).id,
    first.requestId,
  );
  assert.equal(
    (
      await submitServiceAreaInquiry(
        {
          ...first,
          requestId: randomUUID(),
          market: "tyler, tx",
          services: ["earthwork", "hay"],
        },
        options,
      )
    ).id,
    first.requestId,
  );
  for (const change of [
    { miles: 50 },
    { services: ["hay"] },
    { scope: "national" as const },
    { publicConsent: true },
  ]) {
    const corrected = { ...first, ...change, requestId: randomUUID() };
    const entry = await submitServiceAreaInquiry(corrected, options);
    assert.equal(entry.id, corrected.requestId);
    assert.deepEqual(entry.document, corrected);
    assert.equal(entry.lead_id, null);
    assert.equal(entry.crm_status, "pending_manual_handoff");
    assert.equal(
      (
        await submitServiceAreaInquiry(
          { ...corrected, requestId: randomUUID() },
          options,
        )
      ).id,
      corrected.requestId,
    );
  }
  await assert.rejects(
    () => submitServiceAreaInquiry({ ...first, miles: 60 }, options),
    { status: 409 },
  );
  await assert.rejects(
    () =>
      submitServiceAreaInquiry(
        { ...first, requestId: randomUUID(), miles: 60 },
        options,
      ),
    { status: 429 },
  );
  const state = (await readServiceAreaState(options))!;
  assert.equal(state.inquiries.length, 5);
  assert.equal(state.revision, 1);
  assert.deepEqual(publicTerritories(state.registry), []);
});

test("state-set corrections save, and irrelevant state-coverage radius/order do not inflate identical repeats", async (t) => {
  const options = await fixture(t);
  await initializeServiceAreaStore(initial, "synthetic-admin", options);
  const first = inquiry({ scope: "states", states: ["TX", "LA"] });
  await submitServiceAreaInquiry(first, options);
  assert.equal(
    (
      await submitServiceAreaInquiry(
        { ...first, requestId: randomUUID(), states: ["LA", "TX"], miles: 50 },
        options,
      )
    ).id,
    first.requestId,
  );
  const corrected = { ...first, requestId: randomUUID(), states: ["TX", "OK"] };
  assert.equal(
    (await submitServiceAreaInquiry(corrected, options)).id,
    corrected.requestId,
  );
});

test("linked publication consent is checked under the same lock before the registry can change", async (t) => {
  const options = await fixture(t);
  await initializeServiceAreaStore(initial, "synthetic-admin", options);
  const incoming = inquiry();
  await submitServiceAreaInquiry(incoming, options);
  const interest: Territory = {
    ...privateRecord,
    id: "synthetic-interest",
    stage: "interest",
    geometry: {
      kind: "radius",
      center: { lat: 32.3513, lng: -95.3011 },
      miles: 35,
    },
    publicGeometry: {
      kind: "radius",
      center: { lat: 32.3513, lng: -95.3011 },
      miles: 35,
    },
    publicRegion: "Tyler area",
    publicApproved: true,
    publicConsent: "Synthetic operator attempted approval",
    inquiryId: incoming.requestId,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  await assert.rejects(
    () =>
      saveServiceAreaRegistry(
        { version: 1, territories: [privateRecord, interest] },
        1,
        "synthetic-admin",
        options,
      ),
    { status: 400 },
  );
  assert.equal((await readServiceAreaState(options))!.revision, 1);
  assert.equal((await readServiceAreaState(options))!.audit.length, 1);
});

test("concurrent processes cannot lose private inquiries or inflate identical submissions", async (t) => {
  const options = await fixture(t);
  await initializeServiceAreaStore(initial, "synthetic-admin", options);
  const run = promisify(execFile),
    base = inquiry();
  const storeUrl = new URL("../lib/service-areas/store.ts", import.meta.url)
    .href;
  const hook = path.resolve("scripts/register-ts.mjs");
  await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      run(process.execPath, [
        "--experimental-strip-types",
        "--no-warnings",
        "--import",
        hook,
        "--input-type=module",
        "-e",
        `import {submitServiceAreaInquiry} from ${JSON.stringify(storeUrl)}; await submitServiceAreaInquiry(${JSON.stringify({ ...base, requestId: randomUUID(), email: index < 2 ? base.email : `operator-${index}@example.com` })},${JSON.stringify(options)});`,
      ]),
    ),
  );
  const stored = (await readServiceAreaState(options))!;
  assert.equal(stored.inquiries.length, 3);
  assert.equal(stored.registry.territories.length, 1);
});

test("corrupt, exposed, symlinked, or interrupted storage fails closed without replacing prior data", async (t) => {
  const options = await fixture(t),
    file = path.join(options.directory!, "state.json");
  await initializeServiceAreaStore(initial, "synthetic-admin", options);
  const previous = await readFile(file, "utf8");
  await mkdir(path.join(options.directory!, ".write-lock"), { mode: 0o700 });
  await assert.rejects(
    () =>
      submitServiceAreaInquiry(inquiry(), { ...options, lockTimeoutMs: 20 }),
    /storage is busy/,
  );
  assert.equal(await readFile(file, "utf8"), previous);
  assert.ok(
    (await lstat(path.join(options.directory!, ".write-lock"))).isDirectory(),
  );
  await rm(path.join(options.directory!, ".write-lock"), { recursive: true });
  await chmod(file, 0o644);
  await assert.rejects(() => readServiceAreaState(options), /permissions/);
  await chmod(file, 0o600);
  await writeFile(file, "invalid JSON");
  await assert.rejects(() => readServiceAreaState(options));
  await assert.rejects(() =>
    initializeServiceAreaStore(initial, "synthetic-admin", options),
  );
  assert.equal(await readFile(file, "utf8"), "invalid JSON");
  await rm(file);
  await writeFile(
    path.join(options.directory!, "private-copy.json"),
    previous,
    { mode: 0o600 },
  );
  await symlink(path.join(options.directory!, "private-copy.json"), file);
  await assert.rejects(() => readServiceAreaState(options), /permissions/);
});

test("uninitialized intake and public-asset data paths are rejected", async (t) => {
  const options = await fixture(t);
  await assert.rejects(
    () => submitServiceAreaInquiry(inquiry(), options),
    /temporarily unavailable/,
  );
  assert.equal(await readServiceAreaState(options), null);
  assert.throws(
    () =>
      serviceAreaDirectory({
        directory: path.resolve("public", "private-inquiries"),
      }),
    /outside public assets/,
  );
  assert.throws(
    () => serviceAreaDirectory({ directory: "relative-data" }),
    /absolute/,
  );
});
