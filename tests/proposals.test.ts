import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildProposal, offerIdForInterest, proposalText, type ProposalIntake } from "../lib/proposals/build.ts";
import { SAMPLE_NOW, sampleAgencyIntake, sampleBuildIntake } from "../lib/proposals/fixtures.ts";
import { escapeHtml, renderProposalHtml } from "../lib/proposals/render.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { acceptanceLine, payDoorFor, startsWithAcceptanceLine } from "../lib/payDoors.ts";
import { FREE_BUILD_HOSTING_LINE } from "../lib/freeBuild.ts";
import { AGENCY_SERVICES } from "../lib/site/agency.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { EXTERNAL_LINKS } from "../lib/site/external-links.ts";
import { OFFERS, TBD_PRICE_LABEL, offer } from "../lib/site/offers.ts";
import { PRICES, usd } from "../lib/site/prices.ts";

const BANNED = ["guarantee", "guaranteed", "#1", "best in", "roas", "ranked", "x return", "% increase"];

/** The free website build and its add-ons, retired 2026-09-22. */
const RETIRED_FREE_BUILD_IDS = ["free_website_program", "free_build_followup", "free_build_content", "free_build_launch"];

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
  // The published Stripe deposit link itself is printed, with the deposit from the registry.
  const depositLine = launch.acceptance.find((a) => a.includes(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit));
  assert.ok(depositLine, launch.acceptance.join("\n"));
  assert.ok(depositLine.includes(`Pay the ${usd(PRICES.websiteLaunchDeposit)} deposit for the Website Launch`), depositLine);
  assert.equal(depositLine, acceptanceLine(payDoorFor("website_launch")!));
  assert.ok(launch.text.includes(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit));
  const os = buildProposal(sampleBuildIntake(), SAMPLE_NOW);
  assert.ok(!os.acceptance.some((a) => a.includes(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit)), "no deposit link on an offer without one");
  // A larger build starts with the System Map: its public page and price, once, and no invoice promise.
  const mapUrl = payDoorFor("system_map")!.url!;
  assert.equal(os.acceptance.filter((a) => a.includes(mapUrl)).length, 1, os.acceptance.join("\n"));
  assert.ok(os.acceptance.some((a) => a.startsWith("Company OS starts with the System Map") && a.includes(offer("system_map").priceLabel)));
  assert.ok(!os.acceptance.some((a) => /invoice/i.test(a)));
  const agency = buildProposal(sampleAgencyIntake(), SAMPLE_NOW);
  for (const id of ["agency_meta_ads", "agency_google_ads"]) assert.ok(agency.acceptance.includes(acceptanceLine(payDoorFor(id)!)), id);
  // Each agency line names its own service, so two pay pages never read as the same amount twice.
  const agencyLines = ["agency_meta_ads", "agency_google_ads"].map((id) => {
    const name = payDoorFor(id)!.offerName;
    const found = agency.acceptance.find((a) => a.includes(`written scope for ${name} at `));
    assert.ok(found, `${id}: ${agency.acceptance.join("\n")}`);
    assert.deepEqual(copyProblems(found), [], found);
    return found.replace(/https:\/\/\S+/g, "<url>");
  });
  assert.notEqual(agencyLines[0], agencyLines[1], "the two agency lines differ in more than the link");
  assert.ok(!agency.acceptance.some((a) => /^Pay the amount in your written scope at /.test(a)), agency.acceptance.join("\n"));
  assert.equal(os.date, "2026-09-14");
  assert.equal(os.validUntil, "2026-10-14");
  assert.equal(os.preparedBy.email, BUSINESS.email.hello);
  assert.equal(os.preparedBy.legal, BUSINESS.dbaLine);
});

test("a lead who asked for the retired free website is proposed the Website Launch: its deposit link, its price, no free promise", () => {
  const p = buildProposal({ ...sampleBuildIntake(), interest: "free_website_program", diagnostic: null, desiredModules: null }, SAMPLE_NOW);
  assert.deepEqual(p.recommended.map((r) => r.offerId), ["website_launch"]);
  assert.deepEqual(p.price.map((x) => x.offerId), ["website_launch"]);
  // The same published pay door the Call Closer hands Ryan, and the kickoff that follows payment.
  assert.ok(p.acceptance.includes(acceptanceLine(payDoorFor("website_launch")!)), p.acceptance.join("\n"));
  assert.ok(p.acceptance.includes("A kickoff call is scheduled within five business days of payment."), p.acceptance.join("\n"));
  // Nothing of the retired offer survives: no no-payment line, no application step, no optional add-ons.
  assert.ok(!p.acceptance.some((a) => /no payment|application/i.test(a)), p.acceptance.join("\n"));
  assert.ok(!p.notIncluded.some((x) => x.startsWith("Optional, priced separately")), p.notIncluded.join("\n"));
  for (const id of RETIRED_FREE_BUILD_IDS) assert.ok(!p.text.includes(offer(id).name), `${id} is named in the proposal`);
  const known = new Set([...OFFERS.map((o) => o.priceLabel), "$49/mo", "$99/mo", usd(PRICES.websiteLaunchDeposit)]);
  for (const m of p.text.matchAll(/\$[\d,]+(?:\.\d+)?(?:\/mo|\+)?/g)) assert.ok([...known].some((k) => k.includes(m[0])), `unexpected figure ${m[0]}`);
  for (const a of p.acceptance) assert.deepEqual(copyProblems(a), [], a);
});

test("a stale free build id beside a paid offer is dropped: only the paid offer is proposed, priced, and paid", () => {
  for (const paid of ["website_launch", "lead_engine"]) {
    const p = buildProposal({ ...sampleBuildIntake(), diagnostic: null }, SAMPLE_NOW, { selection: ["free_website_program", "free_build_followup", paid] });
    // A larger build also brings its System Map (the auto-add).
    assert.deepEqual(p.recommended.map((r) => r.offerId), paid === "lead_engine" ? [paid, "system_map"] : [paid]);
    assert.ok(p.price.every((x) => !RETIRED_FREE_BUILD_IDS.includes(x.offerId)), JSON.stringify(p.price));
    const all = p.acceptance.join("\n");
    assert.ok(!p.acceptance.some((a) => /no payment/i.test(a)), all);
    // The paid offer gets its own pay line, naming it.
    assert.ok(p.acceptance.some((a) => a.includes(payDoorFor(paid)!.offerName) && a.includes("https://")), all);
    for (const id of RETIRED_FREE_BUILD_IDS) assert.ok(!p.text.includes(offer(id).name), `${paid}: ${id} is named in the proposal`);
    for (const a of p.acceptance) assert.deepEqual(copyProblems(a), [], a);
  }
});

test("selection from the call: replaces the interest mapping, prices the choice, and clears the no-services flag", () => {
  const consultation: ProposalIntake = {
    ...sampleAgencyIntake(),
    leadId: "sample-consultation",
    interest: "done_for_you",
    diagnostic: { source: "free_consultation", placement: "home_hero", meeting: "call", contact: "text", minutes: 30 },
  };
  const unchosen = buildProposal(consultation, SAMPLE_NOW);
  assert.ok(unchosen.missing.some((m) => m.includes("lists no services")), "without a selection the flag still fires");
  assert.equal(unchosen.price.length, 0);

  for (const intake of [consultation, sampleAgencyIntake()]) {
    const p = buildProposal(intake, SAMPLE_NOW, { selection: ["website_launch"] });
    assert.deepEqual(p.recommended, [{ offerId: "website_launch", name: "Website Launch", why: "Chosen with you on the call." }]);
    assert.deepEqual(p.price, [{ label: offer("website_launch").priceLabel, terms: offer("website_launch").terms, status: "live", offerId: "website_launch" }]);
    assert.ok(p.text.includes(`- Website Launch: ${offer("website_launch").priceLabel}.`), p.text);
    assert.ok(!p.missing.some((m) => m.includes("lists no services")), intake.leadId);
    assert.ok(p.acceptance.some((a) => a.includes(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit)));
  }

  // Deduped, closer offers only, at most three; junk and non-closer ids are dropped.
  const mixed = buildProposal(sampleBuildIntake(), SAMPLE_NOW, {
    selection: ["system_map", "system_map", "pro_kits", "not_an_offer", "lead_followup_campaign", "website_launch", "agency_video"],
  });
  assert.deepEqual(mixed.recommended.map((r) => r.offerId), ["system_map", "lead_followup_campaign", "website_launch"]);
  assert.ok(mixed.recommended.every((r) => r.why === "Chosen with you on the call."));

  // The System Map auto-add for larger builds still applies to a selection.
  const build = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["lead_engine"] });
  assert.deepEqual(build.recommended.map((r) => r.offerId), ["lead_engine", "system_map"]);

  // An agency offer chosen on a call brings its service scope and stays unpriced until Ryan sets it.
  const agency = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["agency_meta_ads"] });
  const meta = AGENCY_SERVICES.find((s) => s.offerId === "agency_meta_ads")!;
  assert.deepEqual(agency.deliverables.find((x) => x.source === meta.name)?.items, meta.included);
  assert.equal(agency.price[0].label, TBD_PRICE_LABEL);
  assert.ok(agency.missing.some((m) => m.includes("no confirmed price")));

  // An empty or all-invalid selection falls back to the interest mapping.
  for (const selection of [[], ["pro_kits", "nope"]]) {
    assert.deepEqual(buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection }).recommended.map((r) => r.offerId), ["company_os", "system_map"]);
  }

  // No invented scope and no stray figures with a selection either.
  for (const p of [mixed, build, agency]) {
    const allowed = new Set<string>([...OFFERS.map((o) => o.terms), ...AGENCY_SERVICES.flatMap((s) => s.included), ...p.modules.map((m) => m.label)]);
    for (const d of p.deliverables) for (const item of d.items) assert.ok(allowed.has(item), item);
    for (const a of p.acceptance) assert.deepEqual(copyProblems(a), [], a);
  }
});

test("offers chosen on the call that leave out the intake's package do not promise the intake's modules", () => {
  const intake = sampleBuildIntake();
  const full = buildProposal(intake, SAMPLE_NOW);
  const labels = full.modules.map((m) => m.label);
  assert.ok(labels.length > 0, "the sample intake selected modules");

  const launch = buildProposal(intake, SAMPLE_NOW, { selection: ["website_launch"] });
  assert.deepEqual(launch.modules, []);
  assert.ok(!launch.deliverables.some((d) => d.source === "Modules selected in the intake"), JSON.stringify(launch.deliverables));
  assert.ok(!/\nMODULES\n/.test(launch.text));
  // What the lead asked about is still quoted, as context, and named as scoped separately.
  assert.ok(launch.problem.facts.includes(`Modules asked about in the intake: ${labels.join(", ")}`), launch.problem.facts.join("\n"));
  assert.ok(launch.notIncluded.includes("The modules listed in the intake. Each is scoped separately."));
  const deliverableText = launch.deliverables.flatMap((d) => d.items).join("\n");
  for (const label of labels) assert.ok(!deliverableText.includes(label), label);

  // The package the intake recommended, chosen on the call, still carries its modules.
  const os = buildProposal(intake, SAMPLE_NOW, { selection: ["company_os"] });
  assert.deepEqual(os.modules.map((m) => m.label), labels);
  assert.ok(os.deliverables.some((d) => d.source === "Modules selected in the intake"));
  for (const line of [...launch.problem.facts, ...launch.notIncluded]) assert.deepEqual(copyProblems(line), [], line);
});

test("the Follow-Up Campaign's acceptance matches how it is delivered: a short intake, no kickoff call", () => {
  const fu = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["lead_followup_campaign"] });
  assert.ok(!fu.acceptance.some((a) => /kickoff call/i.test(a)), fu.acceptance.join("\n"));
  assert.ok(!fu.acceptance.some((a) => /work begins when the payment clears/.test(a)), fu.acceptance.join("\n"));
  const pay = fu.acceptance.find((a) => a.includes(payDoorFor("lead_followup_campaign")!.url!));
  assert.ok(pay && pay.includes("short intake"), fu.acceptance.join("\n"));
  assert.ok(fu.acceptance.includes(`The ${offer("lead_followup_campaign").name} is written within 5 business days of your intake landing.`), fu.acceptance.join("\n"));

  const both = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["website_launch", "lead_followup_campaign"] });
  assert.ok(both.acceptance.includes("A kickoff call is scheduled within five business days of payment."), "the build still has its kickoff call");
  assert.ok(both.acceptance.some((a) => a.includes("of your intake landing")), both.acceptance.join("\n"));
  for (const a of [...fu.acceptance, ...both.acceptance]) assert.deepEqual(copyProblems(a), [], a);
});

test("vendor costs never say none required beside real vendor costs", () => {
  for (const selection of [["website_launch", "lead_followup_campaign"], ["agency_meta_ads", "lead_followup_campaign"]]) {
    const p = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection });
    assert.ok(p.vendorCosts.length > 1, selection.join());
    assert.ok(!p.vendorCosts.some((v) => v.startsWith("None required")), `${selection.join()}: ${p.vendorCosts.join(" | ")}`);
    assert.ok(p.vendorCosts.some((v) => v.startsWith("The Follow-Up Campaign itself needs no software.")), p.vendorCosts.join(" | "));
  }
  const alone = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["lead_followup_campaign"] });
  assert.deepEqual(alone.vendorCosts, ["None required. Every message is written so you can send it from the phone and email you already use."]);
  for (const v of alone.vendorCosts) assert.deepEqual(copyProblems(v), [], v);
});

test("a System Map on its own promises the written map, not code, a domain, hosting, or a hosting bill", () => {
  const hosting = usdPerMonthLabel();
  const buildOwnership = /code|domain|hosting|account the build touches/i;
  const mapOnly = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["system_map"] });
  const unsure = buildProposal({ ...sampleBuildIntake(), interest: "unsure", diagnostic: null, desiredModules: null }, SAMPLE_NOW);
  for (const p of [mapOnly, unsure]) {
    assert.deepEqual(p.recommended.map((r) => r.offerId), ["system_map"]);
    assert.ok(!p.clientOwns.some((x) => buildOwnership.test(x)), p.clientOwns.join(" | "));
    assert.ok(!p.vendorCosts.some((x) => /hosting/i.test(x) || x.includes(hosting)), p.vendorCosts.join(" | "));
    assert.ok(p.clientOwns.includes("The written System Map, yours to keep whether or not you build."));
    assert.deepEqual(p.vendorCosts, ["None required for the System Map."]);
    assert.ok(p.notIncluded.some((x) => x.startsWith("The build itself.")), p.notIncluded.join(" | "));
    assert.ok(p.notIncluded.includes("A promise of a number of leads, a ranking, or a revenue result."));
    for (const line of [...p.clientOwns, ...p.vendorCosts, ...p.notIncluded]) assert.deepEqual(copyProblems(line), [], line);
  }
  // A larger build that starts with the map still owns its code and pays for hosting.
  const os = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["company_os"] });
  assert.ok(os.clientOwns.some((x) => x.startsWith("The code, the domain, the hosting account")));
  assert.ok(os.vendorCosts.some((x) => x.startsWith("Hosting after launch:")));
  assert.ok(!os.notIncluded.some((x) => x.startsWith("The build itself.")), "the build is on the page");
});

function usdPerMonthLabel(): string {
  return `${usd(PRICES.hostingManagedMonthly)}/mo`;
}

test("the retired free build never reaches a proposal: no free offer, no free-build hosting line", () => {
  // Retired 2026-09-22. A lead that asked for it is proposed the Website Launch,
  // and a stale selection that names a free id is dropped, never printed.
  const cases: { label: string; p: ReturnType<typeof buildProposal> }[] = [
    { label: "interest", p: buildProposal({ ...sampleBuildIntake(), interest: "free_website_program", diagnostic: null }, SAMPLE_NOW) },
    { label: "selection", p: buildProposal({ ...sampleBuildIntake(), diagnostic: null }, SAMPLE_NOW, { selection: ["free_website_program"] }) },
    { label: "add-on", p: buildProposal({ ...sampleBuildIntake(), diagnostic: null }, SAMPLE_NOW, { selection: ["free_build_launch"] }) },
    {
      label: "free build and pack",
      p: buildProposal({ ...sampleBuildIntake(), diagnostic: null }, SAMPLE_NOW, { selection: ["free_website_program", "free_build_followup"] }),
    },
  ];
  for (const { label, p } of cases) {
    assert.ok(!p.vendorCosts.includes(FREE_BUILD_HOSTING_LINE), `${label}: ${p.vendorCosts.join(" | ")}`);
    assert.ok(!p.vendorCosts.some((v) => v.startsWith("Hosting for ")), `${label}: ${p.vendorCosts.join(" | ")}`);
    assert.ok(!/free website|\$0 build/i.test(p.text), `${label}: the proposal text never sells the retired offer`);
    for (const v of p.vendorCosts) assert.deepEqual(copyProblems(v), [], v);
  }
  assert.equal(offerIdForInterest("free_website_program"), "website_launch");
  for (const id of RETIRED_FREE_BUILD_IDS) assert.equal(payDoorFor(id), null, `${id} has no pay door`);
  // A paid build is still billed from launch.
  const paid = buildProposal({ ...sampleBuildIntake(), diagnostic: null }, SAMPLE_NOW, { selection: ["website_launch"] });
  assert.ok(paid.vendorCosts.some((v) => v.startsWith("Hosting after launch:")), paid.vendorCosts.join(" | "));
});

test("two larger builds share one System Map line: one map, one payment", () => {
  const p = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["lead_engine", "company_os"] });
  const mapUrl = payDoorFor("system_map")!.url!;
  const withMap = p.acceptance.filter((a) => a.includes(mapUrl));
  assert.equal(withMap.length, 1, p.acceptance.join("\n"));
  const line = withMap[0];
  assert.ok(line.startsWith(`${offer("lead_engine").name} and ${offer("company_os").name} start with the System Map`), line);
  assert.equal(
    line,
    startsWithAcceptanceLine([payDoorFor("lead_engine")!, payDoorFor("company_os")!]),
  );
  assert.deepEqual(copyProblems(line), [], line);
  // One build keeps its own line, word for word.
  const one = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["lead_engine"] });
  assert.ok(one.acceptance.includes(acceptanceLine(payDoorFor("lead_engine")!)), one.acceptance.join("\n"));
  assert.equal(startsWithAcceptanceLine([payDoorFor("company_os")!]), acceptanceLine(payDoorFor("company_os")!));
  assert.equal(one.acceptance.filter((a) => a.includes(mapUrl)).length, 1);
});

test("the proposal builder never imports the Call Closer (no import cycle)", () => {
  for (const f of ["lib/proposals/build.ts", "lib/payDoors.ts"]) {
    const src = readFileSync(join(process.cwd(), f), "utf8");
    const imports = [...src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);
    assert.ok(imports.length > 0, f);
    assert.ok(!imports.some((i) => /callCloser/.test(i)), `${f}: ${imports.join(", ")}`);
  }
});

test("copy rules: no banned claims or dashes in generated lines", () => {
  const freeBuild = { ...sampleBuildIntake(), interest: "free_website_program", diagnostic: null };
  for (const intake of [sampleBuildIntake(), sampleAgencyIntake(), freeBuild]) {
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

test("a real lead's proposal puts the lead on its agency pay links; a sample proposal never does", () => {
  const LEAD = "7d0c5a4e-1b2f-4c3d-8e9f-a0b1c2d3e4f5";
  const real = buildProposal({ ...sampleAgencyIntake(), leadId: LEAD }, SAMPLE_NOW);
  for (const id of ["agency_meta_ads", "agency_google_ads"]) {
    const line = acceptanceLine(payDoorFor(id, { leadId: LEAD })!);
    assert.ok(real.acceptance.includes(line), `${id}: ${real.acceptance.join("\n")}`);
    assert.ok(line.includes(`lead=${LEAD}`), line);
  }
  const sample = buildProposal(sampleAgencyIntake(), SAMPLE_NOW);
  assert.ok(!sample.acceptance.some((a) => a.includes("lead=")), sample.acceptance.join("\n"));
  // Pay doors on the site's own pages are the same for a real lead.
  const site = buildProposal({ ...sampleBuildIntake(), leadId: LEAD }, SAMPLE_NOW, { selection: ["website_launch"] });
  assert.ok(site.acceptance.some((a) => a.includes(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit)), site.acceptance.join("\n"));
  assert.ok(!site.acceptance.some((a) => a.includes("lead=")), site.acceptance.join("\n"));
});

test("the proposal page wraps long links instead of scrolling sideways on a phone", () => {
  const html = renderProposalHtml(buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["website_launch"] }), { sample: true });
  assert.match(html, /body \{[^}]*overflow-wrap: anywhere;[^}]*\}/);
});
