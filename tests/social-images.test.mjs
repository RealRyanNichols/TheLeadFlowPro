import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { ANGLES, BASE_URL, SLOTS, TRADES, compareFingerprints, fingerprintImage, importBatch, validateLibrary, verifyLive } from "../scripts/social-images.mjs";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

async function fixtureImage(seed) {
  let state = seed;
  const random = () => { state = Math.imul(1664525, state) + 1013904223 | 0; return (state >>> 0) / 2 ** 32; };
  const shapes = [];
  for (let i = 0; i < 16; i++) {
    const fill = `rgb(${Math.floor(random() * 240)},${Math.floor(random() * 240)},${Math.floor(random() * 240)})`;
    const x = Math.floor(random() * 1000); const y = Math.floor(random() * 470);
    if (i % 2) shapes.push(`<rect x="${x}" y="${y}" width="${50 + random() * 230}" height="${40 + random() * 180}" fill="${fill}"/>`);
    else shapes.push(`<circle cx="${x + 80}" cy="${y + 60}" r="${25 + random() * 100}" fill="${fill}"/>`);
  }
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#e8e4dc"/>${shapes.join("")}</svg>`)).png().toBuffer();
}

async function makeDay(source, date, { trade = "roofing", seed = 1234 } = {}) {
  const directory = path.join(source, date);
  await fs.mkdir(directory, { recursive: true });
  const manifest = { date, generated_at: "2026-09-06T19:00:00Z", images: [] };
  const qa = { reviewer: "Automated test fixture", reviewed_at: "2026-09-06T20:00:00Z", images: [] };
  for (let i = 0; i < 5; i++) {
    const file = `${String(i + 1).padStart(2, "0")}.png`;
    const bytes = await fixtureImage(seed + i * 31415);
    await fs.writeFile(path.join(directory, file), bytes);
    manifest.images.push({ file, url: `${BASE_URL}/social/${date}/${file}`, width: 1200, height: 630, slot: SLOTS[i], angle: ANGLES[i], trade: i === 2 ? trade : "small business", headline: i === 3 ? "Five missed calls cost real opportunities" : "Make every customer conversation count", support: i === 3 ? "Illustrative example. Follow up with a clear next step." : "A clear next step helps people choose", alt_text: `Test fixture ${i}`, suggested_caption: `${i === 3 ? "This is an illustrative example." : "Every conversation deserves a next step."}\n\nGive people a clear way to reach you.\n\nStart at TheLeadFlowPro.com`, cta: "TheLeadFlowPro.com", composition: `fixture-layout-${i}`, dominant_color: ["#112233", "#eeeecc", "#228833", "#ccaa44", "#004455"][i], ...(i === 3 ? { proof_kind: "illustrative" } : {}) });
    qa.images.push({ file, sha256: digest(bytes), passed: true, notes: "Synthetic test fixture only; assertions exercise the publication contract.", text_correct: true, text_clear_of_subject: true, no_faces_or_hands: true, no_extra_text_or_logos: true, composition_distinct: true });
  }
  await json(path.join(directory, "manifest.json"), manifest);
  await json(path.join(directory, "qa.json"), qa);
  return { directory, manifest, qa };
}

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "leadflow-social-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, "incoming");
  await fs.mkdir(source);
  return { root, source, library: path.join(root, "public", "social") };
}

test("detects pixel-identical PNGs after reencoding, and independently detects recolored composition", async () => {
  const original = await fixtureImage(42786);
  const reencoded = await sharp(original).png({ compressionLevel: 0 }).toBuffer();
  assert.notEqual(digest(original), digest(reencoded));
  const a = await fingerprintImage(original);
  const b = await fingerprintImage(reencoded);
  assert.equal(compareFingerprints(a, b).exact, true);

  const recolored = await sharp(original).modulate({ brightness: 0.9, saturation: 0.1 }).png().toBuffer();
  const c = await fingerprintImage(recolored);
  const result = compareFingerprints(a, c);
  assert.equal(result.exact, false);
  assert.equal(result.duplicate, true, JSON.stringify(result));
  assert.equal(compareFingerprints(a, await fingerprintImage(await fixtureImage(82761))).duplicate, false);
});

test("imports a complete reviewed day and preserves it when a later batch contains an incomplete day", async (t) => {
  const { root, source, library } = await workspace(t);
  const first = await makeDay(source, "2026-09-07");
  const result = await importBatch(first.directory, root);
  assert.deepEqual(result.imported_dates, ["2026-09-07"]);
  const beforeIndex = await fs.readFile(path.join(library, "index.json"), "utf8");
  const beforeImage = await fs.readFile(path.join(library, "2026-09-07", "01.png"));
  await fs.rm(first.directory, { recursive: true });
  await makeDay(source, "2026-09-08", { seed: 918273, trade: "HVAC" });
  const bad = await makeDay(source, "2026-09-09", { seed: 271828, trade: "plumbing" });
  await fs.rm(path.join(bad.directory, "05.png"));
  await assert.rejects(importBatch(source, root), /exactly 01.png through 05.png/u);
  assert.equal(await fs.readFile(path.join(library, "index.json"), "utf8"), beforeIndex);
  assert.deepEqual(await fs.readFile(path.join(library, "2026-09-07", "01.png")), beforeImage);
  assert.deepEqual((await fs.readdir(library)).sort(), ["2026-09-07", "index.json"]);
  assert.equal((await validateLibrary(library)).image_count, 5);
});

test("a renamed layout and new bytes cannot bypass the previous fourteen-day duplicate gate", async (t) => {
  const { root, source, library } = await workspace(t);
  const first = await makeDay(source, "2026-09-07");
  await importBatch(first.directory, root);
  const next = await makeDay(source, "2026-09-08", { seed: 918273, trade: "HVAC" });
  const bytes = await sharp(await fs.readFile(path.join(first.directory, "01.png"))).modulate({ brightness: 0.94, saturation: 0.2 }).png().toBuffer();
  await fs.writeFile(path.join(next.directory, "05.png"), bytes);
  next.qa.images[4].sha256 = digest(bytes);
  next.manifest.images[4].composition = "completely-different-declared-layout";
  await json(path.join(next.directory, "qa.json"), next.qa);
  await json(path.join(next.directory, "manifest.json"), next.manifest);
  await assert.rejects(importBatch(next.directory, root), /near-identical composition/u);
  assert.equal((await validateLibrary(library)).days.length, 1);
});

test("rejects within-day duplicates, changed files after visual QA, run-on captions, and unlabeled proof", async (t) => {
  const { root, source } = await workspace(t);
  const day = await makeDay(source, "2026-09-07");
  const original05 = await fs.readFile(path.join(day.directory, "05.png"));
  const duplicate = await fs.readFile(path.join(day.directory, "01.png"));
  await fs.writeFile(path.join(day.directory, "05.png"), duplicate);
  await assert.rejects(importBatch(day.directory, root), /does not match final file SHA256/u);
  day.qa.images[4].sha256 = digest(duplicate);
  await json(path.join(day.directory, "qa.json"), day.qa);
  await assert.rejects(importBatch(day.directory, root), /exact decoded image\/hash/u);
  await fs.writeFile(path.join(day.directory, "05.png"), original05);
  day.qa.images[4].sha256 = digest(original05);
  await json(path.join(day.directory, "qa.json"), day.qa);
  const originalCaption = day.manifest.images[0].suggested_caption;
  day.manifest.images[0].suggested_caption = originalCaption.replaceAll("\n\n", " ");
  await json(path.join(day.directory, "manifest.json"), day.manifest);
  await assert.rejects(importBatch(day.directory, root), /real blank lines/u);
  day.manifest.images[0].suggested_caption = originalCaption;
  day.manifest.images[3].support = "Follow up with a clear next step";
  await json(path.join(day.directory, "manifest.json"), day.manifest);
  await assert.rejects(importBatch(day.directory, root), /illustrative proof must be labeled/u);
});

test("rejects a repeated trade inside fourteen dates and catches unindexed directories", async (t) => {
  const { root, source, library } = await workspace(t);
  const first = await makeDay(source, "2026-09-07");
  await importBatch(first.directory, root);
  const repeat = await makeDay(source, "2026-09-20", { seed: 92834, trade: "roofing" });
  await assert.rejects(importBatch(repeat.directory, root), /fourteen-day rotation/u);
  await fs.mkdir(path.join(library, "2026-09-21"));
  await assert.rejects(validateLibrary(library), /exactly 01.png through 05.png/u);
  await fs.rm(path.join(library, "2026-09-21"), { recursive: true });
  const indexPath = path.join(library, "index.json");
  const index = JSON.parse(await fs.readFile(indexPath, "utf8"));
  index.dates = [];
  await json(indexPath, index);
  await assert.rejects(validateLibrary(library), /index is stale/u);
});

test("live verification requires status, MIME, dimensions, exact image hashes and matching JSON", async (t) => {
  const { root, source, library } = await workspace(t);
  const day = await makeDay(source, "2026-09-07");
  await importBatch(day.directory, root);
  let wrongMime = false;
  let wrongImage = false;
  const server = createServer(async (request, response) => {
    try {
      const relative = request.url.replace(/^\/social\//u, "");
      const image = relative.endsWith(".png");
      response.writeHead(200, { "Content-Type": image ? (wrongMime ? "text/html" : "image/png") : "application/json" });
      const bytes = await fs.readFile(path.join(library, relative));
      response.end(wrongImage && image ? await sharp(bytes).png({ compressionLevel: 0 }).toBuffer() : bytes);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const report = path.join(root, "live-report.json");
  const result = await verifyLive(root, { baseUrl, report });
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 7);
  assert.equal(result.images, 5);
  wrongMime = true;
  await assert.rejects(verifyLive(root, { baseUrl, report }), /MIME text\/html/u);
  assert.equal(JSON.parse(await fs.readFile(report, "utf8")).ok, false);
  wrongMime = false; wrongImage = true;
  await assert.rejects(verifyLive(root, { baseUrl, report }), /live image SHA256 differs/u);
});

test("invalid image dimensions never pass even with correct manifest metadata", async () => {
  const tooSmall = await sharp({ create: { width: 600, height: 315, channels: 3, background: "#112233" } }).png().toBuffer();
  await assert.rejects(fingerprintImage(tooSmall), /1200x630 PNG/u);
  assert.equal(TRADES.length, 14);
});
