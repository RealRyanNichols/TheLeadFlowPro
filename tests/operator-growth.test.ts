import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GROWTH_ASSUMPTIONS,
  DEFAULT_SEPTEMBER_OFFER_MIX,
  businessDaysInclusive,
  funnelTargets,
} from "../lib/operatoros/growth.ts";

test("September 2026 contains 22 weekday operating days", () => {
  assert.equal(businessDaysInclusive("2026-09-01", "2026-09-30"), 22);
});

test("working $75K offer mix creates $75,949 of setup revenue", () => {
  const total = DEFAULT_SEPTEMBER_OFFER_MIX.reduce(
    (sum, item) => sum + item.setup * item.closes,
    0,
  );
  assert.equal(total, 75949);
  assert.equal(DEFAULT_SEPTEMBER_OFFER_MIX.reduce((sum, item) => sum + item.closes, 0), 17);
});

test("funnel reverses 17 closes into the transparent working quotas", () => {
  assert.deepEqual(funnelTargets(17, DEFAULT_GROWTH_ASSUMPTIONS), {
    contacts: 1367,
    replies: 164,
    qualified: 82,
    proposals: 57,
    closes: 17,
  });
});
