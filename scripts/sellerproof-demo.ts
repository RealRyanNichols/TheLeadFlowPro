// Assemble the fictional SellerProof sample and an empty intake, print the
// sections, and write the sample packet to build/sellerproof/ (gitignored).
//
//   npm run sellerproof:demo

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assemblePacket, samplePacket } from "../lib/sellerproof/generator.ts";
import { emptyPacket, renderPacket } from "../lib/sellerproof/packet.ts";

const out = join(process.cwd(), "build", "sellerproof");
mkdirSync(out, { recursive: true });

for (const [label, packet] of [
  ["FICTIONAL SAMPLE", samplePacket()],
  ["EMPTY INTAKE (every gap labelled, nothing invented)", emptyPacket("12345678-1234-4234-8234-123456789099")],
] as const) {
  const a = assemblePacket(packet);
  console.log(`${label}\nCompleteness ${a.completeness.score}%: ${a.completeness.areas.map((x) => `${x.label} ${x.present ? "yes" : "no"}`).join(", ")}\n`);
  for (const s of a.sections) console.log(`== ${s.title}${s.gaps ? ` (${s.gaps} gap${s.gaps === 1 ? "" : "s"})` : ""}\n${s.body}\n`);
  console.log(`${a.disclaimer}\n${"=".repeat(72)}\n`);
}
const file = join(out, "sample-packet.html");
writeFileSync(file, renderPacket(samplePacket()));
console.log(`Written: ${file}`);
