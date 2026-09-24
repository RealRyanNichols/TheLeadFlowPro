import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import {
  ADS_BRAIN,
  adsBrainCanonicalRequest,
  metaLeadCount,
  numericMetric,
  verifyAdsBrainSignature,
} from "../lib/adsBrain";

test("Ads Brain is pinned to the LeadFlow account and cannot mutate campaigns", () => {
  assert.equal(ADS_BRAIN.identity.adAccountId, "1637329904238602");
  assert.equal(ADS_BRAIN.identity.businessPortfolioId, "1154478850201530");
  assert.equal(ADS_BRAIN.identity.pageId, "887023637835514");
  assert.equal(ADS_BRAIN.mode, "observe_only");
  assert.equal(ADS_BRAIN.spendLock, true);
});

test("signed pulls accept only the exact worker, path, verb and fresh timestamp", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const timestamp = "1780000000";
  const message = adsBrainCanonicalRequest("GET", ADS_BRAIN.requestPath, timestamp);
  const signature = sign(null, Buffer.from(message), privateKey).toString("base64");
  const common = {
    method: "GET",
    pathname: ADS_BRAIN.requestPath,
    workerId: ADS_BRAIN.workerId,
    timestamp,
    signature,
    nowMs: Number(timestamp) * 1000,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  assert.deepEqual(verifyAdsBrainSignature(common), { ok: true, workerId: ADS_BRAIN.workerId });
  assert.equal(verifyAdsBrainSignature({ ...common, method: "POST" }).ok, false);
  assert.equal(verifyAdsBrainSignature({ ...common, pathname: "/api/meta-leads" }).ok, false);
  assert.equal(verifyAdsBrainSignature({ ...common, workerId: "foreign-worker" }).ok, false);
  assert.equal(verifyAdsBrainSignature({ ...common, nowMs: Number(timestamp) * 1000 + 301_000 }).ok, false);
});

test("Meta insight normalization keeps only nonnegative metrics and one lead total", () => {
  assert.equal(
    metaLeadCount([
      { action_type: "lead", value: "3" },
      { action_type: "onsite_conversion.lead_grouped", value: "3" },
      { action_type: "link_click", value: "22" },
    ]),
    3,
  );
  assert.equal(numericMetric("12.34"), 12.34);
  assert.equal(numericMetric("not-a-number"), 0);
  assert.equal(numericMetric(-5), 0);
});
