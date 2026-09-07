import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commerceCatalog } from "../lib/commerce";
import { COMMERCE_PATHS, commercePlanText } from "../lib/commercePlanner";
import { getTool } from "../lib/tools";
import { PRO_TOOLS } from "../lib/tools/pro";
import { leadWelcomePayload } from "../lib/leadNotify";
import { GET } from "../app/api/commerce/catalog/route";

describe("public commerce connector", () => {
  it("exports only the eight available products at their checkout prices", () => {
    const catalog = commerceCatalog();
    assert.equal(catalog.products.length, 8);
    assert.equal(catalog.version, 1);
    for (const product of catalog.products) {
      const source = PRO_TOOLS.find((tool) => tool.slug === product.id)!;
      assert.equal(product.priceCents, source.pro.priceUsd * 100);
      assert.ok(Number.isSafeInteger(product.priceCents));
      assert.equal(product.currency, "USD");
      assert.equal(
        product.url,
        `https://www.theleadflowpro.com/tools/pro/${source.slug}`,
      );
      assert.deepEqual(product.includes, source.pro.kit);
      assert.deepEqual(
        Object.keys(product).sort(),
        [
          "id",
          "name",
          "description",
          "priceCents",
          "currency",
          "url",
          "image",
          "delivery",
          "includes",
        ].sort(),
      );
    }
  });
  it("serves a cacheable public read endpoint without cookies", async () => {
    const response = GET();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /s-maxage=900/);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.deepEqual(await response.json(), commerceCatalog());
  });
  it("all planner links resolve to existing useful tools or the kit directory", () => {
    for (const plan of Object.values(COMMERCE_PATHS)) {
      assert.equal(plan.steps.length, 3);
      for (const [, href] of plan.tools) {
        if (href !== "/tools/pro")
          assert.ok(getTool(href.slice("/tools/".length)), href);
      }
    }
  });
  it("download reflects the selected business and existing setup without quoting outcomes", () => {
    const text = commercePlanText("digital", ["Website", "Payment account"]);
    assert.match(text, /I sell: Downloads & training/);
    assert.match(text, /Already in place: Website, Payment account/);
    assert.match(text, /3\. Make access easy/);
    assert.match(text, /not a quote or an installed integration/);
    assert.match(commercePlanText("products", []), /Starting fresh/);
  });
  it("commerce confirmation promises review and never claims a purchase or account connection", () => {
    const payload = leadWelcomePayload({
      full_name: "Commerce QA",
      email: "qa@example.invalid",
      interest: "custom_platform",
      funnel: "commerce_planner",
    });
    assert.match(payload.subject, /commerce build request/);
    assert.match(
      payload.text,
      /did not buy a service, connect an account, or authorize a charge/,
    );
    assert.match(payload.text, /agree the scope, cost/);
  });
});
