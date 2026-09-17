import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PREPARATION_NOTICE, assemblePacket, attachmentManifest, formatFingerprint, intakeCompleteness, readinessSummary, samplePacket } from "../lib/sellerproof/generator.ts";
import { emptyPacket, parsePacket, renderPacket, type Packet } from "../lib/sellerproof/packet.ts";
import { offer } from "../lib/site/offers.ts";

const ID = "12345678-1234-4234-8234-123456789012";
const SHA = "a".repeat(64);

test("an empty intake renders every gap as a labelled marker and invents nothing", () => {
  const a = assemblePacket(emptyPacket(ID));
  const response = a.sections.find((s) => s.id === "response")!;
  for (const marker of ["[business name missing]", "[dispute reference missing]", "[reference missing]", "[amount missing]", "[description missing]"]) assert.ok(response.body.includes(marker), marker);
  assert.ok(response.gaps >= 5);
  assert.equal(a.sections.find((s) => s.id === "timeline")!.body, "[No timeline entered.]");
  assert.equal(a.sections.find((s) => s.id === "evidence")!.body, "[No evidence entered.]");
  assert.ok(a.missing.length >= 6);
  assert.equal(a.completeness.score, 0);
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(response.body), "no date is invented");
  assert.ok(a.disclaimer.includes("Not legal advice") && a.disclaimer.includes(PREPARATION_NOTICE));
  assert.equal(readinessSummary(emptyPacket(ID)).ready, false);
});

test("the fictional sample is complete except where it says so, and its completeness is honest", () => {
  const p = samplePacket();
  assert.ok(p.business.includes("fictional"));
  const c = intakeCompleteness(p);
  assert.deepEqual(c.areas.map((x) => [x.key, x.present]), [["order", true], ["communications", false], ["delivery_or_use", true], ["policy", false]]);
  assert.equal(c.score, 50);
  const a = assemblePacket(p);
  assert.ok(a.missing.some((m) => m.startsWith("Customer messages:")));
  assert.ok(a.missing.some((m) => m.startsWith("Terms or policy:")));
  assert.ok(readinessSummary(p).ready);
});

test("attachments are metadata only: the manifest names the exact file, the packet prints the fingerprint, and the bytes never appear", () => {
  const p = samplePacket();
  const manifest = attachmentManifest(p);
  assert.equal(manifest[0].attached?.sha256.length, 64);
  assert.equal(manifest[0].todo, null);
  assert.ok(manifest[1].todo?.includes("Fingerprint the file"));
  assert.equal(formatFingerprint({ name: "r.pdf", size: 48_211, type: "application/pdf", sha256: SHA }), `r.pdf (47 KB, SHA-256 aaaaaaaaaaaa…aaaaaaaa)`);
  const html = renderPacket(p);
  assert.ok(html.includes("Fingerprint SHA-256 0000000000000000000000000000000000000000000000000000000000000000 (48211 bytes)"));
  assert.doesNotMatch(html, /src=|href=|data:/);
  const untitled: Packet = { ...emptyPacket(ID), evidence: [{ type: "Receipt", title: "", fileName: "x.pdf", date: "", note: "" }] };
  assert.ok(attachmentManifest(untitled)[0].todo?.includes("Describe the source"));
});

test("parsing accepts a valid fingerprint, fills the file name from it, and rejects a forged one", () => {
  const raw = { ...samplePacket(), evidence: [{ type: "Receipt", title: "R", fileName: "", date: "", note: "n", attached: { name: "receipt.pdf", size: 10, type: "application/pdf", sha256: SHA.toUpperCase() } }] };
  const p = parsePacket(raw);
  assert.equal(p.evidence[0].attached?.sha256, SHA);
  assert.equal(p.evidence[0].fileName, "receipt.pdf");
  assert.throws(() => parsePacket({ ...raw, evidence: [{ ...raw.evidence[0], attached: { ...raw.evidence[0].attached, sha256: "zz" } }] }), /Invalid file fingerprint/);
  assert.throws(() => parsePacket({ ...raw, evidence: [{ ...raw.evidence[0], attached: { ...raw.evidence[0].attached, size: -1 } }] }), /Invalid file size/);
  assert.throws(() => parsePacket({ ...raw, evidence: [{ ...raw.evidence[0], attached: "not-an-object" }] }), /Invalid file fingerprint/);
  const without = parsePacket({ ...raw, evidence: [{ type: "Receipt", title: "R", fileName: "a.pdf", date: "", note: "n" }] });
  assert.equal(without.evidence[0].attached, undefined);
});

test("the product is document preparation at the published price, with the fingerprint step client-side only", () => {
  const o = offer("sellerproof_packet");
  assert.equal(o.status, "live");
  assert.ok(o.terms.includes("You review and submit it yourself"));
  const fp = readFileSync(join(process.cwd(), "lib/sellerproof/fingerprint.ts"), "utf8");
  assert.ok(fp.includes("crypto.subtle.digest") && !fp.includes("fetch("));
  const builder = readFileSync(join(process.cwd(), "app/sellerproof/build/Builder.tsx"), "utf8");
  assert.ok(builder.includes("fingerprintFile(file)") && builder.includes('type="file"'));
  const sample = readFileSync(join(process.cwd(), "app/sellerproof/sample/route.ts"), "utf8");
  assert.ok(sample.includes("samplePacket()"));
});
