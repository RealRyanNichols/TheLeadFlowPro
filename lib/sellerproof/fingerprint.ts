// Browser-side file fingerprint for the SellerProof builder. The file is
// read in the seller's browser to compute a SHA-256; only its name, size,
// type, and hash are kept. The bytes never leave the device through this
// tool, and nothing here runs on the server.

import type { Attachment } from "./packet";

export const MAX_FINGERPRINT_BYTES = 50 * 1024 * 1024;

export async function fingerprintFile(file: File): Promise<Attachment> {
  if (file.size > MAX_FINGERPRINT_BYTES) throw new Error("That file is over 50 MB. Fingerprint a smaller export of it, or name it without a fingerprint.");
  if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("This browser cannot fingerprint files. Name the file instead.");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { name: file.name.slice(0, 240), size: file.size, type: (file.type || "application/octet-stream").slice(0, 100), sha256 };
}
