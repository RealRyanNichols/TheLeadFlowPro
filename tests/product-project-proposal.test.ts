import assert from "node:assert/strict";
import test from "node:test";
import { buildProposal } from "../lib/proposals/build.ts";
import { SAMPLE_NOW, sampleAgencyIntake } from "../lib/proposals/fixtures.ts";
import { renderProposalHtml } from "../lib/proposals/render.ts";

test("product inquiries cannot acquire a legacy package price or payment link", () => {
  for (const marker of [
    { source: "product_project" },
    { source: "agency_intake", inquiry_kind: "product-project" },
    { source: "commerce_planner", inquiry_kind: "product-project" },
  ]) {
    const intake = {
      ...sampleAgencyIntake(),
      goals: "Build a product storefront and order handoff.",
      budgetRange: "recommended",
      desiredModules: ["commerce_hub", "payments_checkout"],
      diagnostic: {
        ...marker,
        services: ["websites"],
        managed_plan_budget: "recommended",
        ad_budget: "ads_5000_plus",
        recommendation: { package: "launch", modules: ["commerce_hub"] },
      },
    };
    for (const selection of [undefined, ["website_launch", "system_map"]]) {
      const proposal = buildProposal(intake, SAMPLE_NOW, { selection });
      assert.deepEqual(proposal.recommended, []);
      assert.deepEqual(proposal.price, []);
      assert.deepEqual(proposal.deliverables, []);
      assert.deepEqual(proposal.modules, []);
      assert.ok(proposal.missing.some((item) => /separate written product-project scope and price/.test(item)));
      assert.ok(proposal.acceptance.every((item) => /written project quote/.test(item)));
      assert.equal(proposal.problem.quote, intake.goals);
      assert.doesNotMatch(proposal.text, /\$[\d,]+|https?:\/\/|kickoff|invoice|Pay the/);
      const html = renderProposalHtml(proposal);
      assert.match(html, /Fix before sending/);
      assert.match(html, /written project quote/);
      assert.doesNotMatch(html, /class="price"|href="https?:\/\//);
    }
  }
});
