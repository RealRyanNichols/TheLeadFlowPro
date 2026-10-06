import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { ClaimedPictureJob, PictureBrief, PictureFile, ScenePlan } from "../lib/pictureStudio/types.ts";
import { buildScenePlan, processNextPictureJob, type PictureWorkerStore } from "../lib/pictureStudio/worker.ts";
import { createOpenAIImageProvider, imageUsageCostCents, IMAGE_EDIT_MODEL, IMAGE_GENERATION_MODEL, PictureProviderError, prepareReferences, type ImageProvider } from "../lib/pictureStudio/provider.ts";
import { validatePictureWorkerEnvironment } from "../scripts/picture-studio-worker.ts";

const brief: PictureBrief = {
  audience: "personal", title: "A new chapter", moment: "Our family celebration", emotion: "hope and pride",
  theme: "Original cinematic adventure", story: "We want a story about choosing more time together.", words: "",
  musicTitle: "", musicArtist: "", musicStartSeconds: null, musicCueNotes: "a gentle start", userConfirmedMusic: false,
  usesLikeness: false, subjectsConsent: true, assetsRights: true,
};
function claim(patch: Partial<ClaimedPictureJob["order"]> = {}): ClaimedPictureJob {
  return {
    job: { id: "11111111-1111-4111-8111-111111111111", orderId: "22222222-2222-4222-8222-222222222222", kind: "image", sceneIndex: 0, attempt: 1, leaseToken: "lease" },
    order: {
      id: "22222222-2222-4222-8222-222222222222", packId: "starter", quantity: 1, pictureCount: 5, amountCents: 9700, email: "person@example.com", name: "Example",
      brief, scenes: [{ index: 0, title: "Moment", prompt: "An original scene", caption: "Our moment." }], assets: [], files: [], status: "generating",
      paymentStatus: "paid", planApprovedAt: "2026-10-06T12:00:00Z", ownerReleasedAt: null, revisionCount: 0, revisionNotes: null, error: null,
      createdAt: "2026-10-06T12:00:00Z", updatedAt: "2026-10-06T12:00:00Z", ...patch,
    },
  };
}
function harness(item = claim()) {
  const events: string[] = [];
  const failures: { message: string; ambiguous?: boolean }[] = [];
  let completed: { files: PictureFile[]; providerRequestId?: string | null; actualCostCents?: number } | null = null;
  let planned: ScenePlan[] | null = null;
  const store: PictureWorkerStore = {
    async claimJob() { events.push("claim"); return item; },
    async heartbeatJob() { events.push("heartbeat"); return true; },
    async reserveSpend(_id, _lease, cents) { events.push(`reserve:${cents}`); return true; },
    async recordProviderStarted() { events.push("started"); return true; },
    async completePlan(_id, _lease, scenes) { planned = scenes; events.push("plan"); },
    async completeImage(_id, _lease, result) { completed = result; events.push("complete"); },
    async failJob(_id, _lease, message, options) { failures.push({ message, ambiguous: options?.ambiguous }); events.push("failed"); },
  };
  return { store, events, failures, get completed() { return completed; }, get planned() { return planned; } };
}
async function fixturePng() { return sharp({ create: { width: 40, height: 80, channels: 3, background: "#f02020" } }).png().toBuffer(); }
const neverProvider: ImageProvider = { async generate() { throw new Error("Provider must not be called"); } };

test("scene plans connect moment, theme, emotion, captions and music without invented timestamps", () => {
  const scenes = buildScenePlan({ brief, pictureCount: 12 });
  assert.equal(scenes.length, 12);
  assert.equal(new Set(scenes.map((scene) => scene.prompt)).size, 12);
  assert.equal(scenes[0].title, "Opening");
  assert.equal(scenes[11].title, "Finale");
  assert.equal(new Set(scenes.map((scene) => scene.title)).size, 12);
  assert.equal(new Set(scenes.map((scene) => scene.caption)).size, 12);
  assert.match(scenes[0].prompt, /Our family celebration/);
  assert.match(scenes[0].prompt, /hope and pride/);
  assert.match(scenes[0].prompt, /Original cinematic adventure/);
  assert.match(scenes[0].caption, /more time together/);
  assert.equal(scenes[0].musicStartSeconds, null);
  assert.match(scenes[0].musicCueNotes || "", /timestamp are unverified/);
  const selected = buildScenePlan({ brief: { ...brief, musicTitle: "Customer song", musicArtist: "Customer artist", musicStartSeconds: 43.5, userConfirmedMusic: true }, pictureCount: 5 });
  assert.equal(selected[0].musicStartSeconds, 43.5);
  assert.match(selected[0].musicCueNotes || "", /Customer-selected start: 43.5 seconds/);
});

test("paid plan jobs do not reserve money or invoke an image provider", async () => {
  const item = claim(); item.job.kind = "plan";
  const h = harness(item);
  await processNextPictureJob({ store: h.store, provider: neverProvider, storageRoot: tmpdir(), workerId: "test" });
  assert.equal(h.planned?.length, 5);
  assert.deepEqual(h.events, ["claim", "plan"]);
});

for (const [name, patch] of [
  ["unpaid", { paymentStatus: "unpaid" }],
  ["refunded", { paymentStatus: "refunded", status: "refunded" }],
  ["unapproved", { planApprovedAt: null }],
  ["paused", { status: "paused" }],
] as const) {
  test(`${name} order fails closed before reserving or generating`, async () => {
    const h = harness(claim(patch));
    await processNextPictureJob({ store: h.store, provider: neverProvider, storageRoot: tmpdir(), workerId: "test" });
    assert.deepEqual(h.events, ["claim", "failed"]);
    assert.equal(h.failures[0].ambiguous, false);
  });
}

test("exhausted budget and max attempts stop before paid calls", async () => {
  const h = harness(); h.store.reserveSpend = async () => { h.events.push("budget-denied"); return false; };
  await processNextPictureJob({ store: h.store, provider: neverProvider, storageRoot: tmpdir(), workerId: "test" });
  assert.deepEqual(h.events, ["claim", "budget-denied", "failed"]);
  const item = claim(); item.job.attempt = 3;
  const retry = harness(item);
  await processNextPictureJob({ store: retry.store, provider: neverProvider, storageRoot: tmpdir(), workerId: "test" });
  assert.deepEqual(retry.events, ["claim", "failed"]);
});

test("payment revalidation at provider-start prevents rendering after reservation", async () => {
  const h = harness(); h.store.recordProviderStarted = async () => { h.events.push("payment-recheck-denied"); return false; };
  await processNextPictureJob({ store: h.store, provider: neverProvider, storageRoot: tmpdir(), workerId: "test" });
  assert.deepEqual(h.events, ["claim", "reserve:100", "payment-recheck-denied", "failed"]);
  assert.equal(h.failures[0].ambiguous, false);
});

test("timeout after provider-start is ambiguous and never automatically retried", async () => {
  const h = harness(); let calls = 0;
  const provider: ImageProvider = { async generate() { calls++; throw new PictureProviderError("Provider response timed out"); } };
  await processNextPictureJob({ store: h.store, provider, storageRoot: tmpdir(), workerId: "test" });
  assert.equal(calls, 1);
  assert.deepEqual(h.events, ["claim", "reserve:100", "started", "failed"]);
  assert.equal(h.failures[0].ambiguous, true);
  assert.equal(h.completed, null);
});

test("lease failure interrupts the provider and leaves a reviewable ambiguous attempt", async () => {
  const h = harness();
  h.store.heartbeatJob = async () => false;
  const provider: ImageProvider = {
    async generate(_prompt, _references, signal) {
      await new Promise<void>((_resolve, reject) => signal?.addEventListener("abort", () => reject(new PictureProviderError("Lease interrupted")), { once: true }));
      throw new Error("Unreachable");
    },
  };
  const keepAlive = setTimeout(() => undefined, 1000);
  try { await processNextPictureJob({ store: h.store, provider, storageRoot: tmpdir(), workerId: "test", heartbeatMs: 5 }); }
  finally { clearTimeout(keepAlive); }
  assert.equal(h.failures[0].ambiguous, true);
  assert.equal(h.completed, null);
});

test("successful render writes private contained variants and records measured cost", async () => {
  const root = await mkdtemp(join(tmpdir(), "picture-worker-"));
  const h = harness(); const png = await fixturePng();
  const provider: ImageProvider = { async generate() { h.events.push("provider"); return { png, requestId: "req_fixture", model: IMAGE_GENERATION_MODEL, usage: null, actualCostCents: 8 }; } };
  try {
    await processNextPictureJob({ store: h.store, provider, storageRoot: root, workerId: "test" });
    assert.deepEqual(h.events, ["claim", "reserve:100", "started", "provider", "complete"]);
    assert.equal(h.completed?.actualCostCents, 8);
    assert.equal(h.completed?.files.length, 2);
    for (const file of h.completed!.files) {
      const image = await readFile(join(root, "22222222-2222-4222-8222-222222222222", file.path)); const meta = await sharp(image).metadata();
      assert.equal(meta.width, 1080); assert.equal(meta.height, file.variant === "square" ? 1080 : 1350);
      // A tall source has bars at the sides; the subject is contained rather than cropped.
      const pixel = await sharp(image).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
      assert.deepEqual([...pixel.subarray(0, 3)], [16, 16, 23]);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("missing provider usage keeps the complete conservative reservation", async () => {
  const root = await mkdtemp(join(tmpdir(), "picture-worker-")); const h = harness(); const png = await fixturePng();
  const provider: ImageProvider = { async generate() { return { png, requestId: null, model: IMAGE_GENERATION_MODEL, usage: null, actualCostCents: null }; } };
  try {
    await processNextPictureJob({ store: h.store, provider, storageRoot: root, workerId: "test" });
    assert.equal(h.completed?.actualCostCents, undefined);
    assert.match(h.events[1], /reserve:100/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("provider schema uses current image JSON requests and bounded references", async () => {
  const png = await fixturePng(); const requests: { url: string; body: Record<string, unknown> }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ data: [{ b64_json: png.toString("base64") }], usage: { input_tokens: 100, output_tokens: 1000, input_tokens_details: { text_tokens: 100, image_tokens: 0 } } }), { status: 200, headers: { "x-request-id": "req_schema" } });
  };
  const provider = createOpenAIImageProvider("test-only-not-a-key", fetcher);
  const first = await provider.generate("A scene", []);
  assert.equal(first.actualCostCents, 4);
  const refs = await prepareReferences([png]); await provider.generate("Keep this face", refs);
  assert.match(requests[0].url, /\/images\/generations$/); assert.equal(requests[0].body.model, IMAGE_GENERATION_MODEL);
  assert.match(requests[1].url, /\/images\/edits$/); assert.equal(requests[1].body.model, IMAGE_EDIT_MODEL);
  assert.equal(requests[1].body.n, 1); assert.equal(requests[1].body.size, "1024x1280");
  assert.equal(requests[1].body.response_format, undefined); assert.equal(requests[1].body.input_fidelity, undefined);
  assert.match(String((requests[1].body.images as { image_url: string }[])[0].image_url), /^data:image\/jpeg;base64,/);
  await assert.rejects(() => prepareReferences(Array(9).fill(png)), /At most eight/);
});

test("unknown and inconsistent usage never understates measured input cost", () => {
  assert.equal(imageUsageCostCents(null), null);
  assert.equal(imageUsageCostCents({ input_tokens: 1000, output_tokens: -1 }), null);
  assert.equal(imageUsageCostCents({ input_tokens: 10000, output_tokens: 1000, input_tokens_details: { text_tokens: 100, image_tokens: 100 } }), 11);
});

test("worker startup fails closed for disabled automation, missing credentials, remote databases and public storage", () => {
  const configured: NodeJS.ProcessEnv = { NODE_ENV: "test", PICTURE_STUDIO_ENABLED: "true", PICTURE_AUTOMATION_ENABLED: "true", OPENAI_API_KEY: "test-only-not-a-key", PICTURE_DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test", PICTURE_STORAGE_DIR: "/var/lib/leadflow-picture-studio" };
  assert.equal(validatePictureWorkerEnvironment(configured).storageRoot, "/var/lib/leadflow-picture-studio");
  assert.throws(() => validatePictureWorkerEnvironment({ ...configured, PICTURE_AUTOMATION_ENABLED: "false" }), /disabled/);
  assert.throws(() => validatePictureWorkerEnvironment({ ...configured, OPENAI_API_KEY: "" }), /key/);
  assert.throws(() => validatePictureWorkerEnvironment({ ...configured, PICTURE_DATABASE_URL: "" }), /local picture database/);
  assert.throws(() => validatePictureWorkerEnvironment({ ...configured, PICTURE_DATABASE_URL: "postgresql://test:test@example.com:5432/test" }), /local Postgres/);
  assert.throws(() => validatePictureWorkerEnvironment({ ...configured, PICTURE_STORAGE_DIR: "/srv/site/public/pictures" }), /private directory/);
  assert.throws(() => validatePictureWorkerEnvironment({ ...configured, PICTURE_DAILY_BUDGET_CENTS: "3000" }), /safety ceilings/);
  assert.throws(() => validatePictureWorkerEnvironment({ ...configured, PICTURE_MAX_IMAGE_COST_CENTS: "NaN" }), /safety ceilings/);
});
