// The rules that decide who has paid for what.
//
// This is the part of the pro kits that money depends on, so it is tested the
// way the Stripe classification is: the happy path, then every way somebody
// could try to unlock a kit they did not buy.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  hasProAccess,
  isProKind,
  licenseKey,
  mergeProAccess,
  normalizeEmail,
  normalizeLicenseKey,
  proKindFromSession,
  proKindSlug,
  signProAccess,
  verifyLicenseKey,
  verifyProAccess,
  type ProAccess,
} from "../lib/proAccess.ts";
import { PRO_BUNDLE } from "../lib/tools/pro/index.ts";

const SECRET = "test-secret-one";
const OTHER = "test-secret-two";
const CATALOG = [
  { slug: "missed-call-text-back-kit", priceUsd: 19 },
  { slug: "qr-sign-kit", priceUsd: 10 },
  { slug: "job-estimate-kit", priceUsd: 29 },
];

describe("access kinds", () => {
  test("recognizes kit and bundle kinds and rejects anything else", () => {
    assert.equal(isProKind("pro_tool:qr-sign-kit"), true);
    assert.equal(isProKind("pro_bundle"), true);
    assert.equal(isProKind("learn_it"), false);
    assert.equal(isProKind("package_deposit"), false);
  });

  test("reads the slug back out of a kit kind and refuses a malformed one", () => {
    assert.equal(proKindSlug("pro_tool:qr-sign-kit"), "qr-sign-kit");
    assert.equal(proKindSlug("pro_bundle"), null);
    assert.equal(proKindSlug("pro_tool:../../etc/passwd"), null);
    assert.equal(proKindSlug("pro_tool:Not A Slug"), null);
  });

  test("one kit unlocks only itself", () => {
    const kinds = ["pro_tool:qr-sign-kit"];
    assert.equal(hasProAccess(kinds, "qr-sign-kit"), true);
    assert.equal(hasProAccess(kinds, "job-estimate-kit"), false);
  });

  test("the bundle unlocks every kit, including one added later", () => {
    const kinds = [PRO_BUNDLE.kind];
    assert.equal(hasProAccess(kinds, "qr-sign-kit"), true);
    assert.equal(hasProAccess(kinds, "a-kit-that-does-not-exist-yet"), true);
  });

  test("no purchase unlocks nothing", () => {
    assert.equal(hasProAccess([], "qr-sign-kit"), false);
  });
});

describe("the access token", () => {
  const payload: ProAccess = {
    v: 1,
    e: "buyer@example.com",
    k: ["pro_tool:qr-sign-kit"],
    t: 1_780_000_000,
  };

  test("a token this deploy signed verifies and comes back intact", () => {
    const token = signProAccess(payload, SECRET);
    const out = verifyProAccess(token, [SECRET]);
    assert.deepEqual(out?.k, ["pro_tool:qr-sign-kit"]);
    assert.equal(out?.e, "buyer@example.com");
  });

  test("a token signed with an older secret still verifies after a rotation", () => {
    const token = signProAccess(payload, OTHER);
    assert.ok(verifyProAccess(token, [SECRET, OTHER]), "a rotation must not lock existing buyers out");
    assert.equal(verifyProAccess(token, [SECRET]), null);
  });

  test("editing the payload to add a kit invalidates the signature", () => {
    const token = signProAccess(payload, SECRET);
    const [body, sig] = token.split(".");
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    decoded.k.push(PRO_BUNDLE.kind);
    const forged = `${Buffer.from(JSON.stringify(decoded), "utf8").toString("base64url")}.${sig}`;
    assert.equal(verifyProAccess(forged, [SECRET]), null);
  });

  test("garbage, empty and oversized tokens are refused rather than throwing", () => {
    assert.equal(verifyProAccess("", [SECRET]), null);
    assert.equal(verifyProAccess(undefined, [SECRET]), null);
    assert.equal(verifyProAccess("no-dot-here", [SECRET]), null);
    assert.equal(verifyProAccess("a.b", [SECRET]), null);
    assert.equal(verifyProAccess(`${"x".repeat(5000)}.y`, [SECRET]), null);
  });

  test("a token carrying a kind that is not a pro kind drops it", () => {
    const token = signProAccess({ ...payload, k: ["pro_tool:qr-sign-kit", "learn_it"] }, SECRET);
    assert.deepEqual(verifyProAccess(token, [SECRET])?.k, ["pro_tool:qr-sign-kit"]);
  });

  test("no secret configured means nothing verifies", () => {
    const token = signProAccess(payload, SECRET);
    assert.equal(verifyProAccess(token, []), null);
  });
});

describe("merging a second purchase", () => {
  test("buying a second kit on the same device keeps the first", () => {
    const first = mergeProAccess(null, "buyer@example.com", ["pro_tool:qr-sign-kit"], 1);
    const second = mergeProAccess(first, "buyer@example.com", ["pro_tool:job-estimate-kit"], 2);
    assert.deepEqual(second.k.sort(), ["pro_tool:job-estimate-kit", "pro_tool:qr-sign-kit"]);
  });

  test("the same kit twice is not recorded twice", () => {
    const first = mergeProAccess(null, "buyer@example.com", ["pro_tool:qr-sign-kit"], 1);
    const again = mergeProAccess(first, "buyer@example.com", ["pro_tool:qr-sign-kit"], 2);
    assert.deepEqual(again.k, ["pro_tool:qr-sign-kit"]);
  });

  test("a kind that is not a pro kind never gets merged in", () => {
    const merged = mergeProAccess(null, "buyer@example.com", ["learn_it", "pro_bundle"], 1);
    assert.deepEqual(merged.k, ["pro_bundle"]);
  });
});

describe("license keys", () => {
  test("the same buyer and kit always derive the same key", () => {
    const a = licenseKey("Buyer@Example.com", "pro_tool:qr-sign-kit", SECRET);
    const b = licenseKey("buyer@example.com", "pro_tool:qr-sign-kit", SECRET);
    assert.equal(a, b, "the email is normalized before signing");
    assert.match(a, /^LFP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  test("a different kit, buyer or secret gives a different key", () => {
    const base = licenseKey("buyer@example.com", "pro_tool:qr-sign-kit", SECRET);
    assert.notEqual(base, licenseKey("buyer@example.com", "pro_tool:job-estimate-kit", SECRET));
    assert.notEqual(base, licenseKey("someone@example.com", "pro_tool:qr-sign-kit", SECRET));
    assert.notEqual(base, licenseKey("buyer@example.com", "pro_tool:qr-sign-kit", OTHER));
  });

  test("the key verifies for its own buyer and kit and for nobody else", () => {
    const key = licenseKey("buyer@example.com", "pro_tool:qr-sign-kit", SECRET);
    assert.equal(verifyLicenseKey("buyer@example.com", "pro_tool:qr-sign-kit", key, [SECRET]), true);
    assert.equal(verifyLicenseKey("thief@example.com", "pro_tool:qr-sign-kit", key, [SECRET]), false);
    assert.equal(verifyLicenseKey("buyer@example.com", "pro_tool:job-estimate-kit", key, [SECRET]), false);
    assert.equal(verifyLicenseKey("buyer@example.com", "pro_bundle", key, [SECRET]), false);
  });

  test("a key typed back in any reasonable shape still matches", () => {
    const key = licenseKey("buyer@example.com", "pro_tool:qr-sign-kit", SECRET);
    const body = key.replace(/-/g, "").slice(3);
    for (const typed of [key.toLowerCase(), key.replace(/-/g, " "), body, `  ${key}  `]) {
      assert.equal(
        verifyLicenseKey("buyer@example.com", "pro_tool:qr-sign-kit", typed, [SECRET]),
        true,
        `should accept "${typed}"`,
      );
    }
  });

  test("the alphabet has no characters that read two ways on a phone", () => {
    const key = licenseKey("buyer@example.com", "pro_bundle", SECRET);
    assert.equal(/[01OIL]/.test(key.slice(4)), false, "0, 1, O, I and L are excluded on purpose");
  });

  test("nonsense is rejected without throwing", () => {
    assert.equal(normalizeLicenseKey("hello"), "");
    assert.equal(normalizeLicenseKey(""), "");
    assert.equal(normalizeLicenseKey(null), "");
    assert.equal(normalizeLicenseKey(12345), "");
    assert.equal(verifyLicenseKey("buyer@example.com", "pro_bundle", "hello", [SECRET]), false);
  });
});

describe("what a paid Stripe session actually bought", () => {
  test("a kit session at the catalog price maps to that kit", () => {
    const kind = proKindFromSession(
      { amount_total: 1900, metadata: { kind: "pro_tool", pro_slug: "missed-call-text-back-kit" } },
      CATALOG,
    );
    assert.equal(kind, "pro_tool:missed-call-text-back-kit");
  });

  test("the bundle maps to the bundle kind", () => {
    const kind = proKindFromSession({ amount_total: 4900, metadata: { kind: "pro_bundle" } }, CATALOG);
    assert.equal(kind, PRO_BUNDLE.kind);
  });

  test("paying the $10 price cannot claim the $29 kit", () => {
    const kind = proKindFromSession(
      { amount_total: 1000, metadata: { kind: "pro_tool", pro_slug: "job-estimate-kit" } },
      CATALOG,
    );
    assert.equal(kind, null, "the amount is checked against the catalog, not trusted from metadata");
  });

  test("a kit price cannot claim the bundle", () => {
    const kind = proKindFromSession({ amount_total: 1900, metadata: { kind: "pro_bundle" } }, CATALOG);
    assert.equal(kind, null);
  });

  test("a promotion code that lowers the total still resolves through the subtotal", () => {
    const kind = proKindFromSession(
      {
        amount_total: 0,
        amount_subtotal: 1900,
        metadata: { kind: "pro_tool", pro_slug: "missed-call-text-back-kit" },
      },
      CATALOG,
    );
    assert.equal(kind, "pro_tool:missed-call-text-back-kit");
  });

  test("a kit that is not in the catalog is refused", () => {
    const kind = proKindFromSession(
      { amount_total: 1900, metadata: { kind: "pro_tool", pro_slug: "not-a-real-kit" } },
      CATALOG,
    );
    assert.equal(kind, null);
  });

  test("a session that is not a pro purchase is left alone", () => {
    assert.equal(proKindFromSession({ amount_total: 50000, metadata: { kind: "package_deposit" } }, CATALOG), null);
    assert.equal(proKindFromSession({ amount_total: 1900 }, CATALOG), null);
    assert.equal(proKindFromSession({}, CATALOG), null);
  });
});

describe("emails", () => {
  test("are normalized before anything is derived from them", () => {
    assert.equal(normalizeEmail("  Buyer@Example.COM "), "buyer@example.com");
    assert.equal(normalizeEmail(undefined), "");
    assert.equal(normalizeEmail(42), "");
  });
});
