import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { TLFP_ANNOUNCE, isAnnounceable, launchEmail, pickRecipients } from "../lib/tlfpAnnounce.ts";
import { TLFP_PACKS, earnRule } from "../lib/tlfpCredits.ts";
import { PRICES, usd } from "../lib/site/prices.ts";
import { BUSINESS } from "../lib/site/business.ts";

// The credits launch email goes to real people once. These tests hold the list
// logic (consent, dedupe, unsubscribes) and the copy (numbers from the price
// file, an unsubscribe link, no dashes, no token talk).

test("recipients: leads first, customers added, duplicates and unsubscribes removed", () => {
  const picked = pickRecipients({
    leads: [
      { email: "Amy@Example.net", full_name: "Amy Lee" },
      { email: "amy@example.net", full_name: "Amy again" },
      { email: "bob@example.net", full_name: "Bob" },
      { email: "not-an-email", full_name: "Broken" },
      { email: "hello+leadtest@theleadflowpro.com", full_name: "ZZ TEST delivery check" },
    ],
    customers: [
      { email: "bob@example.net", name: "Bob Paid" },
      { email: "cara@example.net", name: "Cara Pays" },
      { email: "gone@example.net", name: "Gone" },
    ],
    unsubscribed: ["GONE@example.net", ""],
  });
  assert.deepEqual(
    picked.recipients.map((r) => r.email),
    ["amy@example.net", "bob@example.net", "cara@example.net"],
  );
  assert.equal(picked.leadCount, 2);
  assert.equal(picked.customerCount, 2);
  assert.equal(picked.removed, 1);
  assert.equal(picked.recipients[0].firstName, "Amy");
  assert.equal(picked.recipients[2].firstName, "Cara");
});

test("our own test addresses never make the list", () => {
  assert.equal(isAnnounceable("hello+leadtest@theleadflowpro.com"), false);
  assert.equal(isAnnounceable("test@example.com"), false);
  assert.equal(isAnnounceable("owner@realbusiness.com"), true);
});

test("launch email: numbers come from the price file, link carries the UTM, unsubscribe present", () => {
  const email = launchEmail();
  for (const pack of TLFP_PACKS) {
    assert.ok(email.html.includes(`${usd(pack.priceUsd)}</td>`), `html names ${usd(pack.priceUsd)}`);
    assert.ok(email.text.includes(`${usd(pack.priceUsd)} gets you ${pack.credits.toLocaleString("en-US")} credits`), `text names ${pack.credits}`);
  }
  assert.ok(email.text.includes(`the System Map is ${usd(PRICES.systemMap)}`));
  assert.ok(email.text.includes(`Finish a course, ${earnRule("course_completed").credits} credits`));
  assert.ok(email.text.includes(`${earnRule("referral_purchase").percentOfPurchase} percent of their first purchase`));
  const link = `${BUSINESS.siteUrl}/tlfp?${TLFP_ANNOUNCE.utm}`;
  assert.ok(email.html.includes(`href="${link}"`));
  assert.ok(email.text.includes(link));
  assert.ok(email.html.includes("{{{RESEND_UNSUBSCRIBE_URL}}}"));
  assert.ok(email.text.includes("{{{RESEND_UNSUBSCRIBE_URL}}}"));
  assert.ok(email.html.includes(BUSINESS.address.street));
  assert.ok(email.text.includes(BUSINESS.phone.display));
  assert.equal(email.subject, TLFP_ANNOUNCE.subject);
  assert.ok(email.subject.includes(usd(TLFP_PACKS[1].priceUsd)));
});

test("launch email: no dashes of any kind in the copy, and the token is never mentioned", () => {
  const email = launchEmail();
  const copy = email.text + "\n" + email.subject + "\n" + TLFP_ANNOUNCE.preheader;
  assert.equal(copy.includes("—"), false, "no em dash");
  assert.equal(copy.includes("–"), false, "no en dash");
  assert.equal(/\s-\s/.test(copy), false, "no hyphen separators");
  assert.equal(/\b(token|coin|XRP|ledger)\b/i.test(copy), false, "credits only");
});

test("the announce route is admin-only and never runs from the browser with keys", () => {
  const source = readFileSync(join(process.cwd(), "app/api/admin/tlfp/announce/route.ts"), "utf8");
  assert.ok(source.includes('profile?.role !== "admin"'));
  assert.ok(source.includes("process.env.RESEND_API_KEY"));
  assert.ok(source.includes("dry_run"));
  assert.ok(source.includes("Already sent"), "a second send is refused");
});
