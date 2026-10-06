import { stat } from "node:fs/promises";
import { createReadStream, type ReadStream } from "node:fs";
import { Readable } from "node:stream";
import { ZipFile } from "yazl";
import { privateFilePath } from "./storage";
import { PictureError, type PictureOrder } from "./types";

export async function createPictureArchive(order: PictureOrder, root?: string) {
  if (order.paymentStatus !== "paid" || order.status !== "delivered" || !order.ownerReleasedAt) {
    throw new PictureError("Approve your released collection before downloading the complete pack.", 409);
  }
  const scenes = new Set(order.files.map(file => file.sceneIndex));
  if (order.files.length !== order.pictureCount * 2 || scenes.size !== order.pictureCount || order.files.length > 240) {
    throw new PictureError("The complete collection needs team review.", 409);
  }
  const entries = await Promise.all(order.files.map(async file => {
    const path = privateFilePath(order.id, file.path, root);
    const info = await stat(path);
    if (!info.isFile() || info.size !== file.size) throw new PictureError("A picture needs team review before downloading.", 409);
    return { path, size: info.size, name: `${file.variant}/scene-${String(file.sceneIndex + 1).padStart(3, "0")}.png` };
  }));
  if (new Set(entries.map(entry => entry.name)).size !== entries.length) throw new PictureError("The collection contains duplicate exports.", 409);
  const zip = new ZipFile();
  const output = zip.outputStream as Readable;
  zip.on("error", () => output.destroy(new Error("The collection download was interrupted.")));
  let active: ReadStream | undefined;
  output.once("close", () => active?.destroy());
  // Open one source at a time and close it if the client cancels the download.
  for (const entry of entries) zip.addReadStreamLazy(entry.name, { size: entry.size, compress: false, mode: 0o100600 }, cb => {
    const source = createReadStream(entry.path);
    active = source;
    if (output.destroyed) source.destroy(new Error("Download cancelled."));
    cb(null, source);
  });
  const words = order.scenes.map(scene => [
    `PICTURE ${scene.index + 1}: ${scene.title}`, "", scene.caption, "",
    `Music notes: ${scene.musicCueNotes || "Choose and preview your track before posting."}`,
    scene.musicStartSeconds != null && order.brief.userConfirmedMusic
      ? `Customer-confirmed music start: ${scene.musicStartSeconds} seconds.`
      : "Exact music timestamp: preview required.", "",
  ].join("\n")).join("\n");
  zip.addBuffer(Buffer.from(`${order.brief.title}\n\n${words}`, "utf8"), "captions-and-music-notes.txt", { mode: 0o100600 });
  zip.end();
  return output;
}
