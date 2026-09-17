// Build the two fictional sample proposals, print the text, and write the
// HTML pages to build/proposals/ (gitignored) so they can be opened and
// printed to PDF. Nothing is sent.
//
//   npm run proposal:demo

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildProposal } from "../lib/proposals/build.ts";
import { SAMPLE_NOW, sampleAgencyIntake, sampleBuildIntake } from "../lib/proposals/fixtures.ts";
import { renderProposalHtml } from "../lib/proposals/render.ts";

const out = join(process.cwd(), "build", "proposals");
mkdirSync(out, { recursive: true });
for (const intake of [sampleBuildIntake(), sampleAgencyIntake()]) {
  const p = buildProposal(intake, SAMPLE_NOW);
  const file = join(out, `${intake.leadId}.html`);
  writeFileSync(file, renderProposalHtml(p, { sample: true }));
  console.log(`SAMPLE (fictional): ${intake.leadId}\n`);
  console.log(p.text);
  console.log(`\nMissing before sending: ${p.missing.length ? p.missing.join(" | ") : "nothing"}`);
  console.log(`Written: ${file}\n${"=".repeat(72)}\n`);
}
