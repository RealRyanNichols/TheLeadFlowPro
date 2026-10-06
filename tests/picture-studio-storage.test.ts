import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import sharp from "sharp";
import { privateFilePath, readPrivateFile, saveReferenceAsset, writePrivateOutput } from "../lib/pictureStudio/storage.ts";
import { parseBrief, validateProductionBrief } from "../lib/pictureStudio/types.ts";
let root: string;
let previous: string | undefined;
describe("private image inputs", { concurrency: false }, () => {
  before(async () => { previous = process.env.PICTURE_STORAGE_DIR; root = await mkdtemp(path.join(tmpdir(), "picture-storage-")); process.env.PICTURE_STORAGE_DIR = root; });
  after(async () => { if (previous === undefined) delete process.env.PICTURE_STORAGE_DIR; else process.env.PICTURE_STORAGE_DIR = previous; await rm(root, { recursive: true, force: true }); });
  it("decodes and normalizes reference photos while removing metadata", async () => {
    const bytes = await sharp({ create: { width: 100, height: 80, channels: 3, background: "red" } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    assert.ok((await sharp(bytes).metadata()).exif);
    const order = randomUUID(), asset = await saveReferenceAsset(order, new File([new Uint8Array(bytes)], "location.jpg", { type: "image/jpeg" }));
    const result = await readPrivateFile(order, asset.path), metadata = await sharp(result).metadata();
    assert.equal(metadata.exif, undefined); assert.equal(metadata.orientation, undefined); assert.equal(metadata.format, "jpeg");
    assert.ok(asset.path.startsWith("reference-")); assert.equal(asset.filename.includes("location"), false);
  });
  it("rejects SVG even when its declared MIME looks like PNG", async () => {
    const image = new File(["<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><rect width='20' height='20'/></svg>"], "not-a-photo.png", { type: "image/png" });
    await assert.rejects(saveReferenceAsset(randomUUID(), image), /single JPEG|could not be decoded/);
  });
  it("rejects oversized files before decoding", async () => { const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }); await assert.rejects(saveReferenceAsset(randomUUID(), file), /10 MB/); });
  it("rejects traversal keys and writes outputs inside the selected order", async () => {
    const order = randomUUID(); assert.throws(() => privateFilePath(order, "../other-order.png")); assert.throws(() => privateFilePath(order, "/etc/passwd"));
    const output = await writePrivateOutput(order, { filename: "scene.png", data: Buffer.from("private-output"), sceneIndex: 0, variant: "square" }, root);
    assert.equal((await readFile(privateFilePath(order, output.path, root))).toString(), "private-output");
    assert.equal((await readPrivateFile(order, output.path, root)).toString(), "private-output");
  });
  it("requires likeness photos, permission and a confirmed exact music cue", () => {
    const brief = parseBrief({ audience: "personal", title: "My birthday", moment: "Birthday", theme: "Space adventure", emotion: "Proud", story: "A family celebration", usesLikeness: true, assetsRights: true, subjectsConsent: true, musicTitle: "Customer-selected song", musicStartSeconds: 45 });
    assert.throws(() => validateProductionBrief(brief, 0), /reference photo/);
    assert.throws(() => validateProductionBrief(brief, 1), /Confirm your song/);
    assert.doesNotThrow(() => validateProductionBrief({ ...brief, userConfirmedMusic: true }, 1));
    assert.throws(() => parseBrief({ ...brief, musicStartSeconds: -1 }), /seconds/);
  });
});
