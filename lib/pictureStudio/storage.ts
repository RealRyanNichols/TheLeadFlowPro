import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PictureError, type PictureAsset, type PictureFile } from "./types";

const ROOT = (root?: string) => path.resolve(root || process.env.PICTURE_STORAGE_DIR || "/var/lib/leadflow-picture-studio");
const validOrder = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
export function privateFilePath(orderId: string, key: string, root?: string): string {
  if (!validOrder(orderId) || !/^[a-z0-9][a-z0-9._-]{0,120}$/i.test(key)) throw new PictureError("Invalid private file.");
  const result = path.resolve(ROOT(root), orderId, key);
  if (!result.startsWith(`${ROOT(root)}${path.sep}`)) throw new PictureError("Invalid private file.");
  return result;
}
async function atomicWrite(orderId: string, key: string, contents: Buffer, root?: string): Promise<void> {
  const destination = privateFilePath(orderId, key, root);
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const temp = `${destination}.${randomUUID()}.tmp`;
  try { await writeFile(temp, contents, { mode: 0o600, flag: "wx" }); await rename(temp, destination); }
  finally { await unlink(temp).catch(() => undefined); }
}
export async function saveReferenceAsset(orderId: string, file: File): Promise<PictureAsset> {
  if (!file || file.size < 1 || file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new PictureError("Upload a JPEG, PNG, or WebP photo up to 10 MB.");
  const raw = Buffer.from(await file.arrayBuffer());
  try {
    const input = sharp(raw, { limitInputPixels: 25_000_000, animated: false, failOn: "warning" });
    const metadata = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1 || !metadata.width || !metadata.height) throw new PictureError("Use a single JPEG, PNG, or WebP image.");
    // Decode, rotate and re-encode: strips EXIF/GPS and rejects disguised files.
    const { data, info } = await input.rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
    const id = randomUUID(), key = `reference-${id}.jpg`;
    await atomicWrite(orderId, key, data);
    return { id, path: key, filename: `reference-${id.slice(0, 8)}.jpg`, mime: "image/jpeg", size: data.length, width: info.width, height: info.height };
  } catch (error) { if (error instanceof PictureError) throw error; throw new PictureError("The photo could not be decoded. Use a valid JPEG, PNG, or WebP."); }
}
export async function readPrivateFile(orderId: string, key: string, root?: string): Promise<Buffer> {
  return readFile(privateFilePath(orderId, key, root));
}
export async function removePrivateFile(orderId: string, key: string): Promise<void> {
  await unlink(privateFilePath(orderId, key)).catch(() => undefined);
}
export async function writePrivateOutput(orderId: string, input: { id?: string; key?: string; filename: string; data: Buffer; mime?: string; sceneIndex: number; variant: "square" | "portrait" }, root?: string): Promise<PictureFile> {
  if (input.data.length < 1 || input.data.length > 30 * 1024 * 1024) throw new PictureError("Invalid generated image size.");
  const id = input.id || randomUUID(), key = input.key || `scene-${input.sceneIndex}-${input.variant}-${id}.png`;
  await atomicWrite(orderId, key, input.data, root);
  return { id, path: key, filename: input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100), mime: input.mime || "image/png", size: input.data.length, sceneIndex: input.sceneIndex, variant: input.variant };
}
export async function storageReady(): Promise<boolean> {
  // Preflight only: provisioning must create and protect this folder explicitly.
  try { const result = await stat(ROOT()); await access(ROOT(), constants.R_OK | constants.W_OK | constants.X_OK); return result.isDirectory() && (result.mode & 0o007) === 0; } catch { return false; }
}
