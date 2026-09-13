// The consent form's two proofs: the nonce that binds the approval to the
// person and the request, and the browser's own word on where the post
// came from. The header shapes below are what Chromium actually sends; the
// no-referrer one was captured from a real click, because under that policy
// a same-origin form post carries "Origin: null" and the old guard read that
// as an attack and refused every customer's Connect button.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { consentNonce, crossSiteApproval, verifyConsentNonce } from "../lib/hq/consent.ts";

const SITE = "https://www.theleadflowpro.com";
const PROD = { own: SITE, trusted: [SITE, "https://theleadflowpro.com"] };
const h = (headers: Record<string, string>) => new Headers(headers);

describe("approval cross-site guard", () => {
  test("a real Chrome form post under the site's no-referrer policy is ours", () => {
    const chromeNoReferrer = h({ origin: "null", "sec-fetch-site": "same-origin", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document", "sec-fetch-user": "?1" });
    assert.equal(crossSiteApproval(chromeNoReferrer, PROD), false);
  });

  test("the same post with a plain origin, and a fetch() from the page, are ours too", () => {
    assert.equal(crossSiteApproval(h({ origin: SITE, "sec-fetch-site": "same-origin", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" }), PROD), false);
    assert.equal(crossSiteApproval(h({ origin: SITE, "sec-fetch-site": "same-origin", "sec-fetch-mode": "cors", "sec-fetch-dest": "empty" }), PROD), false);
    assert.equal(crossSiteApproval(h({ origin: SITE }), PROD), false, "origin alone, no fetch metadata");
    assert.equal(crossSiteApproval(h({ origin: "https://theleadflowpro.com" }), PROD), false, "the apex is ours");
  });

  test("a post from another site is refused however it is labelled", () => {
    assert.equal(crossSiteApproval(h({ origin: "https://evil.example", "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" }), PROD), true);
    assert.equal(crossSiteApproval(h({ origin: "null", "sec-fetch-site": "cross-site" }), PROD), true, "a sandboxed attacker frame");
    assert.equal(crossSiteApproval(h({ origin: "https://evil.example" }), PROD), true, "an old browser with only Origin");
    assert.equal(crossSiteApproval(h({ origin: "https://www.theleadflowpro.com.evil.example" }), PROD), true, "a look-alike host");
  });

  test("a browser that sends neither header is left to the nonce", () => {
    assert.equal(crossSiteApproval(h({}), PROD), false);
    assert.equal(crossSiteApproval(h({ "sec-fetch-site": "none" }), PROD), false, "a user-typed navigation");
  });

  test("same-site counts as ours only on theleadflowpro.com", () => {
    assert.equal(crossSiteApproval(h({ origin: "https://workshop.theleadflowpro.com", "sec-fetch-site": "same-site" }), PROD), false);
    const preview = { own: "https://the-lead-flow-abc123-realryannichols.vercel.app" };
    assert.equal(crossSiteApproval(h({ "sec-fetch-site": "same-site" }), preview), true, "another vercel.app site is not ours");
  });

  test("a preview deployment and local dev accept their own form", () => {
    const preview = { own: "https://the-lead-flow-abc123-realryannichols.vercel.app" };
    assert.equal(crossSiteApproval(h({ origin: preview.own }), preview), false);
    assert.equal(crossSiteApproval(h({ origin: "null", "sec-fetch-site": "same-origin" }), preview), false);
    assert.equal(crossSiteApproval(h({ origin: SITE }), preview), true, "production posting to a preview is not the preview's own form");
    assert.equal(crossSiteApproval(h({ origin: "http://localhost:3000" }), { own: "http://localhost:3000" }), false);
    assert.equal(crossSiteApproval(h({ origin: "http://localhost:3001" }), { own: "http://localhost:3000" }), false, "any localhost port in dev");
  });
});

describe("consent nonce", () => {
  const secrets = ["test-secret-one"];
  const binding = { userId: "user-1", clientId: "client-1", redirectUri: "https://claude.ai/api/mcp/auth_callback", codeChallenge: "abc", scope: "leads:read leads:write" };
  const now = Date.parse("2026-09-13T02:00:00Z");

  test("round-trips for the same person, client, redirect, challenge, and scope", () => {
    const nonce = consentNonce(binding, now, secrets);
    assert.equal(verifyConsentNonce(nonce, binding, now + 60_000, secrets), true);
  });

  test("fails when any bound value changes or the ten minutes pass", () => {
    const nonce = consentNonce(binding, now, secrets);
    assert.equal(verifyConsentNonce(nonce, { ...binding, scope: "leads:read" }, now, secrets), false, "narrower scope than approved");
    assert.equal(verifyConsentNonce(nonce, { ...binding, redirectUri: "https://evil.example/cb" }, now, secrets), false, "another redirect");
    assert.equal(verifyConsentNonce(nonce, { ...binding, userId: "user-2" }, now, secrets), false, "another person");
    assert.equal(verifyConsentNonce(nonce, binding, now + 11 * 60_000, secrets), false, "expired");
    assert.equal(verifyConsentNonce(nonce, binding, now, ["another-secret"]), false, "signed under a different key");
    assert.equal(verifyConsentNonce("garbage", binding, now, secrets), false);
  });
});
