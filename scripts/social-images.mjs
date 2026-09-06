#!/usr/bin/env node
/** Validate and publish externally generated, visually reviewed social images. */
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const BASE_URL = "https://www.theleadflowpro.com";
export const TRADES = ["roofing", "HVAC", "plumbing", "electrical", "real estate", "dental", "med spa", "auto detailing", "landscaping", "gyms", "insurance", "chiropractic", "pressure washing", "barbers"];
export const SLOTS = ["morning", "leak", "trade", "proof", "question"];
export const ANGLES = ["opener", "leak", "trade", "proof", "question"];
const FILES = ["01.png", "02.png", "03.png", "04.png", "05.png"];
const REQUIRED = ["file", "url", "width", "height", "slot", "angle", "trade", "headline", "support", "alt_text", "suggested_caption", "cta"];
const DAY_MS = 86_400_000;
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const fail = (message) => { throw new Error(message); };
const ensure = (condition, message) => { if (!condition) fail(message); };
const exists = async (name) => fs.lstat(name).then(() => true, (error) => { if (error.code === "ENOENT") return false; throw error; });
const readJson = async (name) => JSON.parse(await fs.readFile(name, "utf8"));
const writeJson = async (name, data) => fs.writeFile(name, `${JSON.stringify(data, null, 2)}\n`);
const words = (value) => value.trim().split(/\s+/u).length;
const canonical = (value) => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

export function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function validTimestamp(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) && Number.isFinite(Date.parse(value)) && validDate(value.slice(0, 10));
}

function normalized(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  return { sd, pixels: Array.from(values, (value) => (value - mean) / Math.max(sd, 0.001)) };
}

function phash(pixels) {
  const coefficients = [];
  for (let v = 0; v < 8; v++) {
    for (let u = 0; u < 8; u++) {
      if (u === 0 && v === 0) continue;
      let sum = 0;
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) sum += pixels[y * 32 + x] * Math.cos(((2 * x + 1) * u * Math.PI) / 64) * Math.cos(((2 * y + 1) * v * Math.PI) / 64);
      }
      coefficients.push(sum);
    }
  }
  const median = [...coefficients].sort((a, b) => a - b)[31];
  return coefficients.map((value) => Number(value > median));
}

function edges(pixels, width, height) {
  const out = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const dx = pixels[p - width + 1] + 2 * pixels[p + 1] + pixels[p + width + 1] - pixels[p - width - 1] - 2 * pixels[p - 1] - pixels[p + width - 1];
      const dy = pixels[p + width - 1] + 2 * pixels[p + width] + pixels[p + width + 1] - pixels[p - width - 1] - 2 * pixels[p - width] - pixels[p - width + 1];
      out.push(Math.hypot(dx, dy));
    }
  }
  return out;
}

/** Compare actual rendered pixels, separately from color and declared layouts. */
export async function fingerprintImage(input) {
  const buffer = Buffer.isBuffer(input) ? input : await fs.readFile(input);
  ensure(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "Image must have a PNG signature");
  const meta = await sharp(buffer, { failOn: "warning" }).metadata();
  ensure(meta.format === "png" && meta.width === 1200 && meta.height === 630 && (meta.pages ?? 1) === 1, `Expected a single 1200x630 PNG; received ${meta.format} ${meta.width}x${meta.height}`);
  const decoded = await sharp(buffer).removeAlpha().toColourspace("srgb").raw().toBuffer();
  const small = await sharp(buffer).flatten({ background: "#ffffff" }).resize(32, 18, { fit: "fill" }).greyscale().raw().toBuffer();
  const square = await sharp(buffer).flatten({ background: "#ffffff" }).resize(32, 32, { fit: "fill" }).greyscale().raw().toBuffer();
  const norm = normalized(small);
  ensure(norm.sd >= 3, "Image is almost blank; visual review and regeneration required");
  const dhash = [];
  for (let y = 0; y < 18; y++) for (let x = 0; x < 31; x++) dhash.push(Number(small[y * 32 + x + 1] > small[y * 32 + x]));
  return { sha256: sha256(buffer), pixel_sha256: sha256(decoded), width: meta.width, height: meta.height, phash: phash(square), dhash, grayscale: norm.pixels, edges: edges(norm.pixels, 32, 18) };
}

function cosine(a, b) {
  let dot = 0; let aa = 0; let bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

export function compareFingerprints(a, b) {
  const phashDistance = a.phash.reduce((count, value, i) => count + Number(value !== b.phash[i]), 0);
  const dhashDistance = a.dhash.reduce((count, value, i) => count + Number(value !== b.dhash[i]), 0) / a.dhash.length;
  const grayscaleCorrelation = cosine(a.grayscale, b.grayscale);
  const edgeCorrelation = cosine(a.edges, b.edges);
  const exact = a.sha256 === b.sha256 || a.pixel_sha256 === b.pixel_sha256;
  const near = grayscaleCorrelation >= 0.985 || edgeCorrelation >= 0.992 || (phashDistance <= 5 && dhashDistance <= 0.1);
  return { duplicate: exact || near, exact, phashDistance, dhashDistance, grayscaleCorrelation, edgeCorrelation };
}

async function safeEntries(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  ensure(entries.every((entry) => !entry.isSymbolicLink()), `${directory}: symbolic links are forbidden`);
  return entries;
}

async function ensureNoPendingImport(root) {
  const directory = path.join(root, "public");
  if (!(await exists(directory))) return;
  const pending = (await fs.readdir(directory)).filter((name) => /^\.social-(?:publish\.lock|stage-|backup-)/u.test(name));
  ensure(!pending.length, `An active or interrupted social import needs attention before build/verification: ${pending.join(", ")}`);
}

export async function inspectDay(directory) {
  const result = [];
  for (const file of FILES) {
    ensure((await fs.lstat(path.join(directory, file))).isFile(), `${file}: expected an ordinary image file`);
    const fingerprint = await fingerprintImage(path.join(directory, file));
    result.push({ file, sha256: fingerprint.sha256, width: fingerprint.width, height: fingerprint.height });
  }
  return result;
}

export async function validateDay(directory, date = path.basename(directory)) {
  ensure(validDate(date), `Invalid calendar date: ${date}`);
  const entries = await safeEntries(directory);
  const expected = [...FILES, "manifest.json", "qa.json"].sort();
  ensure(entries.every((entry) => entry.isFile()) && canonical(entries.map((entry) => entry.name).sort()) === canonical(expected), `${date}: day must contain exactly 01.png through 05.png, manifest.json, and qa.json`);
  const manifest = await readJson(path.join(directory, "manifest.json"));
  ensure(manifest.date === date, `${date}: manifest date differs from folder`);
  ensure(validTimestamp(manifest.generated_at), `${date}: generated_at must be an ISO timestamp with timezone`);
  ensure(Array.isArray(manifest.images) && manifest.images.length === 5, `${date}: exactly five images are required`);
  const qa = await readJson(path.join(directory, "qa.json"));
  ensure(typeof qa.reviewer === "string" && qa.reviewer.trim() && validTimestamp(qa.reviewed_at), `${date}: QA reviewer and ISO reviewed_at are required`);
  ensure(Array.isArray(qa.images) && qa.images.length === 5 && new Set(qa.images.map((item) => item.file)).size === 5, `${date}: five unique visual QA records are required`);
  const fingerprints = [];
  for (const [i, item] of manifest.images.entries()) {
    const label = `${date}/${FILES[i]}`;
    for (const field of REQUIRED) ensure(Object.hasOwn(item, field), `${label}: missing ${field}`);
    for (const field of REQUIRED.filter((name) => !["width", "height"].includes(name))) ensure(typeof item[field] === "string" && item[field].trim(), `${label}: ${field} must be nonempty text`);
    ensure(item.file === FILES[i], `${label}: files must be ordered 01.png through 05.png`);
    ensure(item.url === `${BASE_URL}/social/${date}/${item.file}`, `${label}: unexpected public URL`);
    ensure(item.width === 1200 && item.height === 630, `${label}: manifest dimensions must be 1200x630`);
    ensure(item.slot === SLOTS[i] && item.angle === ANGLES[i], `${label}: expected slot=${SLOTS[i]} and angle=${ANGLES[i]}`);
    ensure(!/[\r\n]/u.test(item.headline) && words(item.headline) <= 8, `${label}: headline must be one line and at most eight words`);
    ensure(!/[\r\n]/u.test(item.support) && words(item.support) <= 16, `${label}: support must be one short line of at most sixteen words`);
    ensure(item.cta === "TheLeadFlowPro.com", `${label}: cta must be TheLeadFlowPro.com`);
    const caption = item.suggested_caption;
    const paragraphs = caption.split("\n\n");
    ensure(paragraphs.length >= 3 && paragraphs.length <= 6 && paragraphs.every((line) => line.trim() && !/[\r\n]/u.test(line)), `${label}: caption must have three to six paragraphs separated by real blank lines`);
    ensure(!/[-\u2010-\u2015]/u.test(caption), `${label}: caption must not contain dashes`);
    ensure(caption.trim().endsWith(item.cta) || caption.trim().endsWith(`${item.cta}.`), `${label}: caption must end in the CTA`);
    ensure(typeof item.composition === "string" && item.composition.trim(), `${label}: composition is required for deliberate layout variety`);
    ensure(typeof item.dominant_color === "string" && /^#[0-9a-f]{6}$/iu.test(item.dominant_color), `${label}: dominant_color must be a six-digit hex color`);
    if (i === 2) ensure(TRADES.some((trade) => trade.toLowerCase() === item.trade.toLowerCase()), `${label}: trade must be in the fourteen-trade rotation`);
    if (i === 3) {
      ensure(item.proof_kind === "illustrative" || item.proof_kind === "sourced", `${label}: proof_kind must be illustrative or sourced`);
      if (item.proof_kind === "illustrative") {
        ensure(/\b(?:illustrative|example)\b/iu.test(`${item.headline} ${item.support}`) && /\b(?:illustrative|example)\b/iu.test(caption), `${label}: illustrative proof must be labeled on the image and in its caption`);
      } else {
        ensure(typeof item.proof_source === "string" && /^https:\/\//u.test(item.proof_source), `${label}: sourced proof requires an HTTPS proof_source`);
      }
    }
    const fingerprint = await fingerprintImage(path.join(directory, item.file));
    const review = qa.images.find((record) => record.file === item.file);
    ensure(review?.passed === true && review.sha256 === fingerprint.sha256, `${label}: visual QA is missing, failed, or does not match final file SHA256`);
    ensure(typeof review.notes === "string" && review.notes.trim(), `${label}: visual QA needs actual observations in notes`);
    for (const check of ["text_correct", "text_clear_of_subject", "no_faces_or_hands", "no_extra_text_or_logos", "composition_distinct"]) ensure(review[check] === true, `${label}: visual QA must confirm ${check}`);
    fingerprints.push({ date, file: item.file, ...fingerprint });
  }
  ensure(new Set(manifest.images.map((item) => item.composition.trim().toLowerCase())).size === 5, `${date}: all five compositions must differ`);
  ensure(new Set(manifest.images.map((item) => item.dominant_color.toLowerCase())).size >= 3, `${date}: at least three dominant colors are required`);
  return { date, manifest, qa, fingerprints };
}

function makeIndex(days) {
  const recent = [...days].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
  return { schema_version: 1, updated_at: days.length ? days.map((day) => day.manifest.generated_at).sort((a, b) => Date.parse(b) - Date.parse(a))[0] : null, dates: recent.map((day) => day.date), days: recent.map((day) => ({ date: day.date, manifest_url: `${BASE_URL}/social/${day.date}/manifest.json`, image_count: 5 })) };
}

export async function validateLibrary(directory, { checkIndex = true, allowMissing = false } = {}) {
  if (!(await exists(directory))) {
    ensure(allowMissing, `${directory}: library does not exist`);
    return { days: [], index: makeIndex([]), image_count: 0 };
  }
  ensure((await fs.lstat(directory)).isDirectory(), `${directory}: library must be an ordinary directory, not a symbolic link`);
  const entries = await safeEntries(directory);
  for (const entry of entries) ensure((entry.isDirectory() && validDate(entry.name)) || (entry.isFile() && entry.name === "index.json"), `${directory}: unrecognized or unvalidated entry ${entry.name}`);
  const dates = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const days = [];
  for (const date of dates) days.push(await validateDay(path.join(directory, date), date));
  for (let i = 0; i < days.length; i++) {
    const current = days[i];
    for (let j = 0; j <= i; j++) {
      const previous = days[j];
      const distance = (Date.parse(current.date) - Date.parse(previous.date)) / DAY_MS;
      if (distance > 14) continue;
      if (distance > 0 && distance < 14) ensure(current.manifest.images[2].trade.toLowerCase() !== previous.manifest.images[2].trade.toLowerCase(), `${current.date}: trade ${current.manifest.images[2].trade} repeats ${previous.date} within the fourteen-day rotation`);
      for (const [aIndex, a] of current.fingerprints.entries()) {
        for (const [bIndex, b] of previous.fingerprints.entries()) {
          if (i === j && aIndex >= bIndex) continue;
          const match = compareFingerprints(a, b);
          ensure(!match.duplicate, `${a.date}/${a.file} repeats ${b.date}/${b.file}: ${match.exact ? "exact decoded image/hash" : "near-identical composition"} (pHash ${match.phashDistance}/63, dHash ${match.dhashDistance.toFixed(3)}, gray ${match.grayscaleCorrelation.toFixed(4)}, edges ${match.edgeCorrelation.toFixed(4)})`);
        }
      }
    }
  }
  const index = makeIndex(days);
  if (checkIndex) {
    ensure(await exists(path.join(directory, "index.json")), "Rolling index is missing");
    ensure(canonical(await readJson(path.join(directory, "index.json"))) === canonical(index), "Rolling index is stale, incorrect, or points at unvalidated dates");
  }
  return { days, index, image_count: days.length * 5 };
}

/** Validate the complete candidate tree before replacing the current library. */
export async function importBatch(source, root = process.cwd()) {
  source = path.resolve(source); root = path.resolve(root);
  const destination = path.join(root, "public", "social");
  ensure(source !== destination && !source.startsWith(`${destination}${path.sep}`), "Import source must be outside public/social");
  const publicRoot = path.join(root, "public");
  await fs.mkdir(publicRoot, { recursive: true });
  const lock = path.join(publicRoot, ".social-publish.lock");
  await fs.mkdir(lock).catch((error) => { if (error.code === "EEXIST") fail("Another social import is running; inspect .social-publish.lock before retrying"); throw error; });
  const stage = path.join(publicRoot, `.social-stage-${randomUUID()}`);
  const backup = path.join(publicRoot, `.social-backup-${randomUUID()}`);
  let backedUp = false;
  let promoted = false;
  try {
    await validateLibrary(destination, { allowMissing: true });
    const sourceStat = await fs.lstat(source);
    ensure(sourceStat.isDirectory() && !sourceStat.isSymbolicLink(), "Import source must be an ordinary directory");
    let dates;
    if (validDate(path.basename(source))) dates = [{ date: path.basename(source), directory: source }];
    else {
      const entries = await safeEntries(source);
      ensure(entries.length > 0 && entries.every((entry) => entry.isDirectory() && validDate(entry.name)), "Batch source must contain only YYYY-MM-DD directories");
      dates = entries.map((entry) => ({ date: entry.name, directory: path.join(source, entry.name) }));
    }
    if (await exists(destination)) await fs.cp(destination, stage, { recursive: true, errorOnExist: true, force: false });
    else await fs.mkdir(stage);
    for (const item of dates) {
      ensure(!(await exists(path.join(stage, item.date))), `${item.date}: already published; existing dates are immutable`);
      await validateDay(item.directory, item.date);
      await fs.cp(item.directory, path.join(stage, item.date), { recursive: true, errorOnExist: true, force: false });
    }
    const result = await validateLibrary(stage, { checkIndex: false });
    await writeJson(path.join(stage, "index.json"), result.index);
    if (await exists(destination)) { await fs.rename(destination, backup); backedUp = true; }
    try { await fs.rename(stage, destination); promoted = true; }
    catch (error) { if (backedUp) { await fs.rename(backup, destination); backedUp = false; } throw error; }
    return { imported_dates: dates.map((item) => item.date).sort(), dates: result.days.length, image_count: result.image_count, index: `${BASE_URL}/social/index.json` };
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
    if (promoted && backedUp) await fs.rm(backup, { recursive: true, force: true });
    await fs.rm(lock, { recursive: true, force: true });
  }
}

async function fetchBytes(url, mime) {
  const response = await fetch(url, { redirect: "error", headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(30_000) });
  ensure(response.status === 200, `${url}: HTTP ${response.status}, expected 200`);
  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  ensure(contentType === mime, `${url}: MIME ${contentType}, expected ${mime}`);
  return { bytes: Buffer.from(await response.arrayBuffer()), status: response.status, content_type: contentType };
}

export async function verifyLive(root = process.cwd(), { baseUrl = BASE_URL, date, report } = {}) {
  await ensureNoPendingImport(root);
  const base = new URL(baseUrl);
  ensure(base.protocol === "https:" || (base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)), "Live verification requires HTTPS, except a local test server");
  ensure(!base.username && !base.password && base.pathname === "/" && !base.search && !base.hash, "base-url must be an origin without credentials or a path");
  const library = await validateLibrary(path.join(root, "public", "social"));
  if (date) ensure(library.days.some((day) => day.date === date), `Date is not in the local validated library: ${date}`);
  const selected = date ? library.days.filter((day) => day.date === date) : library.days;
  const checks = [{ pathname: "/social/index.json", type: "json", expected: library.index }];
  for (const day of selected) {
    checks.push({ pathname: `/social/${day.date}/manifest.json`, type: "json", expected: day.manifest });
    for (const fingerprint of day.fingerprints) checks.push({ pathname: `/social/${day.date}/${fingerprint.file}`, type: "image", expected: fingerprint });
  }
  const results = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, checks.length) }, async () => {
    while (cursor < checks.length) {
      const check = checks[cursor++];
      const url = `${base.origin}${check.pathname}`;
      try {
        const response = await fetchBytes(url, check.type === "image" ? "image/png" : "application/json");
        if (check.type === "json") ensure(canonical(JSON.parse(response.bytes.toString("utf8"))) === canonical(check.expected), `${url}: live JSON differs from validated local JSON`);
        else {
          ensure(sha256(response.bytes) === check.expected.sha256, `${url}: live image SHA256 differs from the reviewed local file`);
          const metadata = await sharp(response.bytes).metadata();
          ensure(metadata.format === "png" && metadata.width === 1200 && metadata.height === 630, `${url}: incorrect live image format or dimensions`);
        }
        results.push({ url, ok: true, status: response.status, content_type: response.content_type, ...(check.type === "image" ? { width: 1200, height: 630, sha256: check.expected.sha256 } : {}) });
      } catch (error) { results.push({ url, ok: false, error: error.message }); }
    }
  }));
  results.sort((a, b) => a.url.localeCompare(b.url));
  const output = { verified_at: new Date().toISOString(), base_url: base.origin, ok: results.every((result) => result.ok), days: selected.length, images: selected.length * 5, checks: results };
  if (report) { await fs.mkdir(path.dirname(path.resolve(report)), { recursive: true }); await writeJson(report, output); }
  ensure(output.ok, `Live verification failed: ${results.filter((result) => !result.ok).map((result) => result.error).join("; ")}`);
  return output;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    ensure(["--root", "--source", "--base-url", "--date", "--report"].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith("--"), `Unknown or incomplete option: ${args[i]}`);
    ensure(!Object.hasOwn(options, args[i].slice(2)), `Repeated option: ${args[i]}`);
    options[args[i].slice(2)] = args[i + 1];
  }
  const root = path.resolve(options.root ?? process.cwd());
  let output;
  if (command === "inspect") { ensure(options.source, "inspect requires --source YYYY-MM-DD-directory"); output = { images: await inspectDay(options.source) }; }
  else if (command === "import") { ensure(options.source, "import requires --source day-or-batch-directory"); output = await importBatch(options.source, root); }
  else if (command === "validate") { await ensureNoPendingImport(root); const result = await validateLibrary(path.join(root, "public", "social"), { allowMissing: true }); output = { ok: true, dates: result.days.length, images: result.image_count }; }
  else if (command === "verify-live") output = await verifyLive(root, { baseUrl: options["base-url"], date: options.date, report: options.report });
  else fail("Usage: node scripts/social-images.mjs inspect|import|validate|verify-live [--root REPO] [--source DIR] [--date YYYY-MM-DD] [--base-url HTTPS_ORIGIN] [--report FILE]");
  console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`social-images: ${error.message}`); process.exitCode = 1; });
}
