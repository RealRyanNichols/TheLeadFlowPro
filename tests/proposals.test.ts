import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildProposal, offerIdForInterest, proposalText, type ProposalIntake } from "../lib/proposals/build.ts";
import { SAMPLE_NOW, sampleAgencyIntake, sampleBuildIntake } from "../lib/proposals/fixtures.ts";
import { escapeHtml, renderProposalHtml } from "../lib/proposals/render.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { AGENCY_SERVICES } from "../lib/site/agency.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { OFFERS, TBD_PRICE_LABEL, offer } from "../lib/site/offers.ts";

const BANNED = ["guarantee", "guaranteed", "#1", "best in", "roas", "ranked", "x return", "% increase"];

test("build proposal: price and terms come only from the offers registry", () => {
  const p = buildProposal(sampleBuildIntake(), SAMPLE_NOW);
  assert.deepEqual(
    p.recommended.map((r) => r.offerId),
    ["company_os", "system_map"],
  );
  for (const pr of p.price) {
    const o = offer(pr.offerId);
    assert.equal(pr.label, o.priceLabel);
    assert.equal(pr.terms, o.terms);
    assert.equal(pr.status, o.status);
  }
  assert.ok(p.text.includes(offer("company_os").priceLabel));
  assert.ok(p.text.includes(offer("system_map").priceLabel));
  // No dollar figure in the text that is not an offer price or a hosting price from the registry.
  const known = new Set([...OFFERS.map((o) => o.priceLabel), "$49/mo", "$99/mo"]);
  for (const m of p.text.matchAll(/\$[\d,]+(?:\.\d+)?(?:\/mo|\+)?/g)) assert.ok([...known].some((k) => k.includes(m[0])), `unexpected figure ${m[0]}`);
});

test("agency proposal: services drive deliverables, ownership, vendor costs, and TBD prices are flagged, never invented", () => {
  const p = buildProposal(sampleAgencyIntake(), SAMPLE_NOW);
  assert.deepEqual(p.recommended.map((r) => r.offerId), ["agency_meta_ads", "agency_google_ads"]);
  for (const pr of p.price) {
    assert.equal(pr.status, "tbd_ryan");
    assert.equal(pr.label, TBD_PRICE_LABEL);
  }
  assert.equal(p.missing.filter((m) => m.includes("no confirmed price")).length, 2);
  const meta = AGENCY_SERVICES.find((s) => s.slug === "meta-ads")!;
  const metaDeliverables = p.deliverables.find((d) => d.source === meta.name)!;
  assert.deepEqual(metaDeliverables.items, meta.included);
  for (const x of meta.clientOwns) assert.ok(p.clientOwns.includes(x));
  for (const x of meta.clientPaysDirectly) assert.ok(p.vendorCosts.includes(x));
  for (const x of meta.notIncluded) assert.ok(p.notIncluded.includes(x));
  assert.ok(p.problem.facts.some((f) => f.includes("$1,500 to $5,000 a month")));
  assert.ok(!/\$\d/.test(p.price.map((x) => x.label).join(" ")), "no invented agency price");
});

test("no invented scope: every deliverable line exists in the registry or the intake's own module labels", () => {
  for (const intake of [sampleBuildIntake(), sampleAgencyIntake()]) {
    const p = buildProposal(intake, SAMPLE_NOW);
    const allowed = new Set<string>([...OFFERS.map((o) => o.terms), ...AGENCY_SERVICES.flatMap((s) => s.included), ...p.modules.map((m) => m.label)]);
    for (const d of p.deliverables) for (const item of d.items) assert.ok(allowed.has(item), `${intake.leadId}: "${item}"`);
  }
});

test("the client's words are quoted verbatim and the facts use the intake's own labels", () => {
  const intake = sampleBuildIntake();
  const p = buildProposal(intake, SAMPLE_NOW);
  assert.equal(p.problem.quote, intake.goals);
  assert.ok(p.problem.facts.includes("Main goal chosen: Replace scattered tools with one system"));
  assert.ok(p.problem.facts.includes("Industry: Local service business"));
  assert.deepEqual(
    p.modules.map((m) => m.label),
    ["Website and funnels", "CRM and pipeline", "Customer or member portal", "Calls and text messages"],
  );
});

test("missing fields are flagged before sending", () => {
  const intake: ProposalIntake = { ...sampleBuildIntake(), goals: "", businessName: null, diagnostic: null, desiredModules: ["crm_pipeline"], interest: "unsure" };
  const p = buildProposal(intake, SAMPLE_NOW);
  assert.ok(p.missing.some((m) => m.includes("no goals text")));
  assert.ok(p.missing.some((m) => m.includes("No business name")));
  assert.deepEqual(p.recommended.map((r) => r.offerId), ["system_map"], "an unsure interest gets the System Map, not a guess at a build");
  assert.deepEqual(p.modules, [{ id: "crm_pipeline", label: "Crm pipeline" }]);
  const empty = buildProposal({ ...sampleAgencyIntake(), diagnostic: { source: "agency_intake", services: [] } }, SAMPLE_NOW);
  assert.ok(empty.missing.some((m) => m.includes("lists no services")));
  assert.equal(empty.price.length, 0);
});

test("interest mapping never resolves to a price outside the registry", () => {
  for (const i of ["launch_system", "website_launch", "blueprint", "system_map", "lead_engine", "training_platform", "company_os", "industry_os", "custom_platform", "free_website_program", "unsure", null, "garbage"]) {
    const id = offerIdForInterest(i);
    if (id) assert.ok(OFFERS.some((o) => o.id === id), String(i));
  }
  assert.equal(offerIdForInterest("done_for_you"), null);
});

test("acceptance: the deposit link appears only when the offer has one; dates are Central and valid 30 days", () => {
  const launch = buildProposal({ ...sampleBuildIntake(), interest: "launch_system", diagnostic: null, desiredModules: null }, SAMPLE_NOW);
  assert.deepEqual(launch.recommended.map((r) => r.offerId), ["website_launch"]);
  assert.ok(launch.acceptance.some((a) => a.includes("Pay the deposit on the Website Launch link")));
  const os = buildProposal(sampleBuildIntake(), SAMPLE_NOW);
  assert.ok(os.acceptance.some((a) => a.includes("An invoice for the first payment")));
  assert.equal(os.date, "2026-09-14");
  assert.equal(os.validUntil, "2026-10-14");
  assert.equal(os.preparedBy.email, BUSINESS.email.hello);
  assert.equal(os.preparedBy.legal, BUSINESS.dbaLine);
});

test("copy rules: no banned claims or dashes in generated lines", () => {
  for (const intake of [sampleBuildIntake(), sampleAgencyIntake()]) {
    const p = buildProposal(intake, SAMPLE_NOW);
    const generated = [...p.recommended.map((r) => r.why), ...p.clientOwns, ...p.vendorCosts, ...p.acceptance, ...p.missing].join(" ");
    for (const b of BANNED) assert.ok(!generated.toLowerCase().includes(b), b);
    for (const a of p.acceptance) assert.deepEqual(copyProblems(a), [], a);
    assert.ok(p.text === proposalText(p));
  }
});

test("render: user text is escaped, the sample banner shows only for samples, and print hides the fix list", () => {
  const hostile = { ...sampleBuildIntake(), goals: `<script>alert(1)</script> "quotes" & ampersands`, fullName: "<b>Name</b>" };
  const html = renderProposalHtml(buildProposal(hostile, SAMPLE_NOW), { sample: true });
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(html.includes("&lt;b&gt;Name&lt;/b&gt;"));
  assert.ok(html.includes("Sample proposal built from a fictional intake"));
  assert.ok(html.includes('name="robots" content="noindex'));
  assert.ok(html.includes("@media print"));
  const real = renderProposalHtml(buildProposal(sampleBuildIntake(), SAMPLE_NOW));
  assert.ok(!real.includes("Sample proposal"));
  assert.equal(escapeHtml(`<a href="x">'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&lt;/a&gt;");
});

test("never auto-sends: the proposal modules import no channel, email, or SMS code", () => {
  for (const f of ["lib/proposals/build.ts", "lib/proposals/render.ts", "app/admin/proposals/[leadId]/page.tsx"]) {
    const src = readFileSync(join(process.cwd(), f), "utf8");
    assert.ok(!/resend|sendEmail|sendSms|channels|leadNotify|api\.resend|fetch\(/i.test(src), f);
  }
});
