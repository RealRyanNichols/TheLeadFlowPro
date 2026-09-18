import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENCY_BILLING,
  AGENCY_PAYMENT,
  agencyFixedPriceUsd,
  agencyPayHref,
  agencyPaymentFromMetadata,
  payableAgencyServices,
  resolveAgencyCharge,
} from "../lib/agencyPayment.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import { AGENCY_SERVICES, agencyService } from "../lib/site/agency.ts";
import { hidesSiteChrome } from "../lib/site/navigation.ts";
import { offer } from "../lib/site/offers.ts";

const good = {
  service: "meta-ads",
  billing: "one_time",
  amount_usd: 1250,
  reference: "Fixture Fence Co, scope of Sept 20",
  email: "owner@example.com",
};

test("five agency services are payable on /agency/pay; websites keeps its own door", () => {
  assert.deepEqual(
    payableAgencyServices().map((s) => s.slug),
    ["meta-ads", "google-ads", "automation", "video", "content"],
  );
  assert.equal(agencyFixedPriceUsd(agencyService("websites")!), null);
  assert.equal(agencyPayHref("websites"), AGENCY_PAYMENT.payPath);
  assert.equal(agencyPayHref("meta-ads"), "/agency/pay?service=meta-ads");
  assert.equal(agencyPayHref(null), AGENCY_PAYMENT.payPath);
  const refused = resolveAgencyCharge({ ...good, service: "websites" });
  assert.equal(refused.ok, false);
});

test("a TBD service charges the whole-dollar scope amount inside the deposit window and never a guessed price", () => {
  for (const s of payableAgencyServices()) {
    assert.equal(offer(s.offerId).status, "tbd_ryan", s.slug);
    assert.equal(agencyFixedPriceUsd(s), null, s.slug);
  }
  const ok = resolveAgencyCharge(good);
  assert.ok(ok.ok);
  if (!ok.ok) return;
  assert.equal(ok.charge.amountUsd, 1250);
  assert.equal(ok.charge.amountCents, 125000);
  assert.equal(ok.charge.fixedPrice, false);
  assert.equal(ok.charge.billing, "one_time");
  assert.equal(ok.charge.service.slug, "meta-ads");
  assert.equal(ok.charge.email, "owner@example.com");
  assert.match(ok.charge.name, /^Meta ads management, one-time \| The LeadFlow Pro$/);
  assert.deepEqual(ok.charge.metadata, {
    kind: "agency_payment",
    service: "meta-ads",
    service_name: "Meta ads management",
    billing: "one_time",
    scope_usd: "1250",
    fixed_price: "no",
    reference: "Fixture Fence Co, scope of Sept 20",
  });
  for (const value of Object.values(ok.charge.metadata)) assert.equal(typeof value, "string");

  // Cents, strings, and out-of-window numbers are refused, not clamped into a charge.
  assert.equal(resolveAgencyCharge({ ...good, amount_usd: "abc" }).ok, false);
  assert.equal(resolveAgencyCharge({ ...good, amount_usd: AGENCY_PAYMENT.minUsd - 1 }).ok, false);
  assert.equal(resolveAgencyCharge({ ...good, amount_usd: AGENCY_PAYMENT.maxUsd + 1 }).ok, false);
  assert.equal(resolveAgencyCharge({ ...good, amount_usd: AGENCY_PAYMENT.minUsd }).ok, true);
  assert.equal(resolveAgencyCharge({ ...good, amount_usd: AGENCY_PAYMENT.maxUsd }).ok, true);
  const rounded = resolveAgencyCharge({ ...good, amount_usd: 1250.4 });
  assert.ok(rounded.ok && rounded.charge.amountUsd === 1250);
});

test("monthly billing is a recurring line with its own name and metadata", () => {
  const monthly = resolveAgencyCharge({ ...good, billing: "monthly", amount_usd: 900 });
  assert.ok(monthly.ok);
  if (!monthly.ok) return;
  assert.equal(monthly.charge.billing, "monthly");
  assert.match(monthly.charge.name, /monthly/);
  assert.equal(monthly.charge.metadata.billing, "monthly");
  assert.equal(AGENCY_BILLING.map((b) => b.id).join(","), "one_time,monthly");
  for (const b of AGENCY_BILLING) assert.deepEqual(copyProblems(b.note), [], b.id);
});

test("the request is refused without a real service, billing choice, reference, or a valid email", () => {
  assert.equal(resolveAgencyCharge({}).ok, false);
  assert.equal(resolveAgencyCharge({ ...good, service: "seo" }).ok, false);
  assert.equal(resolveAgencyCharge({ ...good, billing: "yearly" }).ok, false);
  assert.equal(resolveAgencyCharge({ ...good, reference: "   " }).ok, false);
  assert.equal(resolveAgencyCharge({ ...good, email: "not-an-email" }).ok, false);
  // Email is optional: Stripe collects it at checkout when it is missing.
  assert.equal(resolveAgencyCharge({ ...good, email: undefined }).ok, true);
  // Reference and email are trimmed and capped, never passed through raw.
  const long = resolveAgencyCharge({ ...good, reference: `  ${"x".repeat(300)}  ` });
  assert.ok(long.ok && long.charge.reference.length === 120);
});

test("a paid session's metadata is read back defensively", () => {
  const read = agencyPaymentFromMetadata({ service: "google-ads", billing: "monthly", reference: "Acme", scope_usd: "900" });
  assert.equal(read.service?.slug, "google-ads");
  assert.equal(read.billing, "monthly");
  assert.equal(read.reference, "Acme");
  assert.equal(read.scopeUsd, 900);
  const empty = agencyPaymentFromMetadata(null);
  assert.equal(empty.service, null);
  assert.equal(empty.billing, null);
  assert.equal(empty.reference, "");
  assert.equal(empty.scopeUsd, null);
  const junk = agencyPaymentFromMetadata({ service: 42, billing: "weekly", scope_usd: "-5", reference: ["x"] });
  assert.equal(junk.service, null);
  assert.equal(junk.billing, null);
  assert.equal(junk.scopeUsd, null);
  assert.equal(junk.reference, "");
});

test("the pay page is catalogued, unindexed, and chrome-free like the intake", () => {
  const entry = PUBLIC_PAGE_CATALOG.find((p) => p.path === AGENCY_PAYMENT.payPath);
  assert.ok(entry, "/agency/pay is missing from PUBLIC_PAGE_CATALOG");
  assert.equal("index" in entry! && entry.index, false);
  assert.equal(hidesSiteChrome(AGENCY_PAYMENT.payPath), true);
  assert.equal(hidesSiteChrome(AGENCY_PAYMENT.paidPath), false);
  assert.equal(AGENCY_SERVICES.length, 6);
});
