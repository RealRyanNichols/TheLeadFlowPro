import assert from "node:assert/strict";
import test from "node:test";
import { campaignTags } from "../lib/site/campaignTags.ts";

const stored = { utm_source: "facebook", utm_medium: "organic_social", utm_campaign: "specialty_launch" };

test("the form's own address wins, and is never mixed with stored tags", () => {
  const url = new URLSearchParams("service=crypto-checkout&utm_source=google&utm_campaign=shops_q4");
  assert.deepEqual(campaignTags(url, stored, "agency_intake"), {
    utm_source: "google",
    utm_medium: "agency_intake",
    utm_campaign: "shops_q4",
  });
});

test("a visitor who arrived from a tagged link keeps those tags on the intake", () => {
  const url = new URLSearchParams("service=crypto-checkout");
  assert.deepEqual(campaignTags(url, stored, "agency_intake"), stored);
});

test("no tags anywhere falls back to the form's own medium", () => {
  assert.deepEqual(campaignTags(new URLSearchParams(""), {}, "agency_intake"), {
    utm_source: null,
    utm_medium: "agency_intake",
    utm_campaign: null,
  });
});

test("junk in storage is ignored and long values are trimmed", () => {
  const empty = { utm_source: null, utm_medium: "agency_intake", utm_campaign: null };
  for (const junk of [null, undefined, "facebook", 42, ["facebook"], { utm_source: 7, utm_campaign: "   " }]) {
    assert.deepEqual(campaignTags(new URLSearchParams(""), junk, "agency_intake"), empty, JSON.stringify(junk));
  }
  const long = campaignTags(new URLSearchParams(`utm_source=${"x".repeat(300)}`), {}, "agency_intake");
  assert.equal(long.utm_source?.length, 100);
  // A blank tag in the address does not count as tagged, so stored tags still apply.
  assert.deepEqual(campaignTags(new URLSearchParams("utm_source=%20"), stored, "agency_intake"), stored);
});
