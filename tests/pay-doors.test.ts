import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { AGENCY_PAYMENT, agencyPayHref } from "../lib/agencyPayment.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import {
  CLOSER_OFFER_IDS,
  FREE_BUILD_ADD_ON_IDS,
  MAP_FIRST_OFFER_IDS,
  acceptanceLine,
  closerOffers,
  isCloserOfferId,
  payDoorFor,
  payLinkMessage,
  type PayDoor,
} from "../lib/payDoors.ts";
import { AGENCY_SERVICES } from "../lib/site/agency.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { EXTERNAL_LINKS } from "../lib/site/external-links.ts";
import { OFFERS, TBD_PRICE_LABEL, offer } from "../lib/site/offers.ts";
import { PRICES, usd } from "../lib/site/prices.ts";
import { routeExists } from "../scripts/check-links.ts";

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
const door = (id: string): PayDoor => {
  const d = payDoorFor(id);
  assert.ok(d, `no door for ${id}`);
  return d;
};
const ALL = () => closerOffers();

/** Every "$" figure in a text must be a registry label, registry terms, or a PRICES figure. */
function assertKnownFigures(text: string, offerIds: string[]) {
  const sources = offerIds.flatMap((id) => [offer(id).priceLabel, offer(id).terms]);
  const prices = new Set(Object.values(PRICES).map((n) => usd(n)));
  for (const m of text.matchAll(/\$[\d,]+(?:\.\d+)?/g)) {
    const fig = m[0];
    assert.ok(prices.has(fig) || sources.some((s) => s.includes(fig)), `unexpected figure ${fig} in: ${text}`);
  }
}

test("closer offers: every id exists in the registry, none is retired, and the list is in registry order", () => {
  assert.equal(CLOSER_OFFER_IDS.length, 16);
  assert.equal(new Set(CLOSER_OFFER_IDS).size, CLOSER_OFFER_IDS.length);
  for (const id of CLOSER_OFFER_IDS) {
    const o = OFFERS.find((x) => x.id === id);
    assert.ok(o, `${id} missing from OFFERS`);
    assert.notEqual(o.status, "retired", id);
    assert.ok(payDoorFor(id), id);
  }
  const registryOrder = OFFERS.filter((o) => (CLOSER_OFFER_IDS as readonly string[]).includes(o.id)).map((o) => o.id);
  assert.deepEqual(ALL().map((d) => d.offerId), registryOrder);
  for (const d of ALL()) {
    const o = offer(d.offerId);
    assert.equal(d.offerName, o.name);
    assert.equal(d.priceLabel, o.priceLabel);
    assert.equal(d.terms, o.terms);
    assert.equal(d.status, o.status);
  }
});

test("isCloserOfferId and payDoorFor refuse unknown, non-closer, and non-string ids", () => {
  for (const bad of ["", "nope", "pro_kits", "plugin", "hosting_managed", "workshop_chatgpt_longview", "WEBSITE_LAUNCH", null, undefined, 3, {}]) {
    assert.equal(isCloserOfferId(bad), false, String(bad));
    if (typeof bad === "string") assert.equal(payDoorFor(bad), null, bad);
  }
  for (const id of CLOSER_OFFER_IDS) assert.equal(isCloserOfferId(id), true, id);
});

test("a retired offer has no door and drops out of closerOffers", () => {
  const o = OFFERS.find((x) => x.id === "lead_followup_campaign")!;
  const before = o.status;
  try {
    o.status = "retired";
    assert.equal(payDoorFor("lead_followup_campaign"), null);
    assert.ok(!ALL().some((d) => d.offerId === "lead_followup_campaign"));
  } finally {
    o.status = before;
  }
  assert.ok(payDoorFor("lead_followup_campaign"));
});

test("website launch: the hosted Stripe deposit link, with the deposit due now", () => {
  const d = door("website_launch");
  assert.equal(d.kind, "pay_online");
  assert.equal(d.url, EXTERNAL_LINKS.stripeWebsiteLaunchDeposit);
  assert.equal(d.url, offer("website_launch").stripeLink);
  assert.equal(d.dueNowLabel, usd(PRICES.websiteLaunchDeposit));
  assert.equal(d.payableNow, true);
  assert.equal(d.staffHref, null);
  const line = acceptanceLine(d);
  assert.ok(line.includes(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit), line);
  assert.ok(line.includes(`${usd(PRICES.websiteLaunchDeposit)} deposit`), line);
});

test("system map and follow-up campaign: their own public pages, whose forms open checkout", () => {
  const map = door("system_map");
  assert.equal(map.kind, "pay_online");
  assert.equal(map.url, `${BUSINESS.siteUrl}/packages/system-map`);
  assert.equal(map.url, `${BUSINESS.siteUrl}${offer("system_map").href}`);
  assert.equal(map.dueNowLabel, offer("system_map").priceLabel);
  assert.equal(map.payableNow, true);
  // The System Map pack is buyable outright on its page, and the order form posts to checkout.
  const packs = src("app/packages/[slug]/page.tsx");
  assert.equal(/"system-map":\s*\{[\s\S]*?buyable:\s*(true|false)/.exec(packs)?.[1], "true");
  assert.ok(src("app/packages/[slug]/PackageOrderForm.tsx").includes('fetch("/api/checkout"'));

  const fu = door("lead_followup_campaign");
  assert.equal(fu.kind, "pay_online");
  assert.equal(fu.url, `${BUSINESS.siteUrl}/go/lead-follow-up`);
  assert.equal(fu.url, `${BUSINESS.siteUrl}${offer("lead_followup_campaign").href}`);
  assert.equal(fu.dueNowLabel, offer("lead_followup_campaign").priceLabel);
  assert.equal(fu.payableNow, true);
  assert.ok(src("app/go/lead-follow-up/LeadFollowUpFunnel.tsx").includes('fetch("/api/checkout"'));

  for (const d of [map, fu]) {
    const line = acceptanceLine(d);
    assert.ok(line.includes(d.url!) && line.includes(d.dueNowLabel!), line);
  }
});

test("larger builds start with the System Map: its link, its price, credited toward the build", () => {
  const map = door("system_map");
  assert.deepEqual([...MAP_FIRST_OFFER_IDS], ["lead_engine", "training_platform", "company_os", "custom_platform"]);
  for (const id of MAP_FIRST_OFFER_IDS) {
    const d = door(id);
    assert.equal(d.kind, "starts_with", id);
    assert.equal(d.url, map.url, id);
    assert.equal(d.dueNowLabel, map.priceLabel, id);
    assert.equal(d.howTheyPay, "Starts with the System Map, credited toward the build");
    assert.equal(d.payableNow, true, id);
    const line = acceptanceLine(d);
    assert.ok(line.startsWith(`${d.offerName} starts with the System Map`), line);
    assert.ok(line.includes(map.url!) && line.includes(map.priceLabel), line);
  }
  // The System Map's own terms are what make "credited toward the build" true.
  assert.ok(offer("system_map").terms.includes("Credited toward an approved larger build"));
});

test("free website program: no payment; its add-ons wait for the written scope and a separate checkout", () => {
  const free = door("free_website_program");
  assert.equal(free.kind, "no_payment");
  assert.equal(free.url, null);
  assert.equal(free.dueNowLabel, null);
  assert.equal(free.payableNow, false);
  // Names the offer, so it cannot be read as covering a paid build on the same proposal.
  assert.equal(acceptanceLine(free), "No payment is due for the Free Website Program build.");
  assert.ok(acceptanceLine(free).includes(free.offerName));
  assert.deepEqual(copyProblems(acceptanceLine(free)), []);

  // The public form promises a separate secure checkout after approval, and opens none itself.
  const form = src("app/free-build/FreeBuildOrder.tsx");
  assert.ok(form.includes("separate secure checkout"));
  assert.ok(!form.includes("/api/checkout"));

  assert.deepEqual([...FREE_BUILD_ADD_ON_IDS], ["free_build_followup", "free_build_content", "free_build_launch"]);
  for (const id of FREE_BUILD_ADD_ON_IDS) {
    const d = door(id);
    assert.equal(d.kind, "after_scope_checkout", id);
    assert.equal(d.url, null, id);
    assert.equal(d.dueNowLabel, null, id);
    assert.equal(d.staffHref, "/admin/sales/invoices", id);
    assert.equal(d.payableNow, false, id);
    assert.equal(
      acceptanceLine(d),
      `After you approve the written scope, a secure checkout for ${d.offerName} (${d.priceLabel}) is sent to you.`,
    );
  }
});

test("agency offers: the agency pay page for their own service, the amount from the written scope", () => {
  const agencyIds = CLOSER_OFFER_IDS.filter((id) => id.startsWith("agency_"));
  assert.equal(agencyIds.length, 5);
  for (const id of agencyIds) {
    const d = door(id);
    const service = AGENCY_SERVICES.find((s) => s.offerId === id);
    assert.ok(service, id);
    assert.equal(d.kind, "written_scope", id);
    assert.equal(d.url, `${BUSINESS.siteUrl}${agencyPayHref(service.slug)}`, id);
    assert.ok(d.url!.includes(`${AGENCY_PAYMENT.payPath}?service=${service.slug}`), d.url!);
    assert.equal(d.payableNow, offer(id).status === "live", id);
    assert.equal(acceptanceLine(d), `Pay the amount in your written scope for ${d.offerName} at ${d.url}.`);
    assert.deepEqual(copyProblems(acceptanceLine(d)), [], id);
  }
  // Two services on one proposal read as two amounts, one per service, not the same sentence twice.
  const meta = acceptanceLine(door("agency_meta_ads"));
  const google = acceptanceLine(door("agency_google_ads"));
  assert.ok(meta.includes(door("agency_meta_ads").offerName), meta);
  assert.ok(google.includes(door("agency_google_ads").offerName), google);
  const withoutUrl = (line: string) => line.replace(/https:\/\/\S+/g, "<url>");
  assert.notEqual(withoutUrl(meta), withoutUrl(google), "the lines differ in more than the link");
  // A door without a link still names its service.
  assert.equal(acceptanceLine({ ...door("agency_meta_ads"), url: null }), `Pay the amount in your written scope for ${door("agency_meta_ads").offerName}.`);
});

test("a price Ryan has not set never shows an amount and is never payable now", () => {
  const tbd = ALL().filter((d) => d.status === "tbd_ryan");
  assert.ok(tbd.length >= 5, "the agency offers are TBD today");
  for (const d of tbd) {
    assert.equal(d.dueNowLabel, null, d.offerId);
    assert.equal(d.payableNow, false, d.offerId);
    assert.equal(d.priceLabel, TBD_PRICE_LABEL, d.offerId);
    assert.ok(!/\$\d/.test(acceptanceLine(d)), d.offerId);
    const msg = payLinkMessage({ firstName: "Dana", senderFirstName: "Ryan", doors: [d] }) ?? "";
    assert.ok(!/\$\d/.test(msg), msg);
  }
});

test("every link is https, every internal path is a real route, and payable doors all have a link", () => {
  for (const d of ALL()) {
    if (d.url !== null) {
      assert.match(d.url, /^https:\/\/\S+$/, d.offerId);
      if (d.url.startsWith(BUSINESS.siteUrl)) {
        const path = d.url.slice(BUSINESS.siteUrl.length).split("?")[0];
        assert.ok(routeExists(path), `${d.offerId}: ${path} has no route`);
      }
    }
    if (d.payableNow) {
      assert.ok(d.url, `${d.offerId} is payable now but has no link`);
      assert.ok(d.dueNowLabel, `${d.offerId} is payable now but has no amount`);
    }
    if (d.staffHref !== null) {
      assert.ok(d.staffHref.startsWith("/admin/"), d.staffHref);
      // Middleware serves /admin/sales from app/sales.
      const served = d.staffHref.replace(/^\/admin\/sales(?=\/|$)/, "/sales");
      assert.ok(routeExists(served), `${d.offerId}: ${d.staffHref} has no route`);
    }
  }
  assert.equal(routeExists("/agency/pay"), true);
});

test("pay link message: the example shape, links only, and nothing when no door has a link", () => {
  const launch = door("website_launch");
  assert.equal(
    payLinkMessage({ firstName: "Dana", senderFirstName: "Ryan", doors: [launch] }),
    `Hi Dana, it's Ryan with ${BUSINESS.name}. Here is the link for Website Launch (${launch.priceLabel}). It takes the ${usd(PRICES.websiteLaunchDeposit)} deposit to start: ${EXTERNAL_LINKS.stripeWebsiteLaunchDeposit} Reply here with any questions.`,
  );
  assert.equal(payLinkMessage({ firstName: "Dana", senderFirstName: "Ryan", doors: [] }), null);
  assert.equal(
    payLinkMessage({ firstName: "Dana", senderFirstName: "Ryan", doors: [door("free_website_program"), door("free_build_content")] }),
    null,
  );

  // A larger build and the System Map share one link, so they share one line.
  const shared = payLinkMessage({ firstName: "Dana", senderFirstName: "Ryan", doors: [door("company_os"), door("system_map"), door("lead_followup_campaign")] })!;
  assert.equal(shared.split(door("system_map").url!).length - 1, 1, shared);
  assert.ok(shared.includes("Company OS starts with the System Map"), shared);
  assert.ok(shared.includes(door("lead_followup_campaign").url!), shared);

  // Blank names still read as a message, and only the given doors' links appear.
  const blank = payLinkMessage({ firstName: "  ", senderFirstName: "", doors: [door("system_map")] })!;
  assert.ok(blank.startsWith(`Hi there, it's ${BUSINESS.operator.split(" ")[0]} with ${BUSINESS.name}.`), blank);
  assert.ok(!blank.includes(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit));
});

test("figures and copy: every amount is from the registry, no staff path reaches a customer, and the copy rules pass", () => {
  const doors = ALL();
  const texts: { text: string; ids: string[] }[] = [];
  for (const d of doors) {
    texts.push({ text: acceptanceLine(d), ids: [d.offerId] });
    texts.push({ text: d.howTheyPay, ids: [d.offerId] });
    const msg = payLinkMessage({ firstName: "Dana", senderFirstName: "Ryan", doors: [d] });
    if (msg) texts.push({ text: msg, ids: [d.offerId] });
  }
  // Every pair and the chosen three a call can end with.
  for (let i = 0; i < doors.length; i++) {
    for (let j = i + 1; j < doors.length; j++) {
      const msg = payLinkMessage({ firstName: "Dana", senderFirstName: "Ryan", doors: [doors[i], doors[j]] });
      if (msg) texts.push({ text: msg, ids: [doors[i].offerId, doors[j].offerId] });
    }
  }
  const three = ["website_launch", "system_map", "lead_followup_campaign"];
  texts.push({ text: payLinkMessage({ firstName: "Dana", senderFirstName: "Ryan", doors: three.map(door) })!, ids: three });

  for (const { text, ids } of texts) {
    assertKnownFigures(text, ids);
    assert.deepEqual(copyProblems(text), [], text);
    assert.ok(!text.includes("/admin"), text);
    assert.ok(!text.includes(BUSINESS.phone.display) && !text.includes(BUSINESS.email.hello), text);
  }
});

test("pure leaf: the door module imports only the registry and sends nothing", () => {
  const code = src("lib/payDoors.ts");
  const imports = [...code.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ["./agencyPayment", "./site/agency", "./site/business", "./site/external-links", "./site/offers", "./site/prices"]);
  assert.ok(!/fetch|supabase|leadNotify|resend|sendEmail|sendSms|callSheet|callCloser/i.test(code));
  // No typed dollar figure: every amount is read from the registry.
  assert.ok(!/\$\d/.test(code));
});
