import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WEBSITE_LAUNCH, WEBSITE_LAUNCH_NAV } from "../lib/offers.ts";

const HEADER = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const FOOTER = readFileSync(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8");

describe("the Website Launch nav label", () => {
  it("quotes the total, which is what lib/offers.ts calls the price", () => {
    assert.equal(WEBSITE_LAUNCH_NAV.label, "Website Launch | $1,000");
    assert.equal(WEBSITE_LAUNCH.total, 1000);
    assert.ok(
      WEBSITE_LAUNCH_NAV.label.includes(WEBSITE_LAUNCH.priceLabel),
      "the nav label and the offer price label have drifted apart",
    );
  });

  it("keeps the payment terms out of the label and in the small print", () => {
    assert.ok(!WEBSITE_LAUNCH_NAV.label.includes("500"), "the deposit is not the price");
    assert.ok(WEBSITE_LAUNCH_NAV.depositNote.includes(`$${WEBSITE_LAUNCH.deposit}`));
    assert.ok(WEBSITE_LAUNCH_NAV.depositNote.includes(`$${WEBSITE_LAUNCH.finalPayment}`));
  });

  // The bug this pins: the header read "Website Launch | $500" and the footer
  // read "Website Launch | $1,000", same href, both on every public page.
  // Neither component may spell a price for this offer again.
  for (const [name, source] of [
    ["SiteHeader", HEADER],
    ["SiteFooter", FOOTER],
  ] as const) {
    it(`${name} takes the label from lib/offers.ts instead of hardcoding one`, () => {
      assert.ok(
        source.includes("WEBSITE_LAUNCH_NAV"),
        `${name} should render WEBSITE_LAUNCH_NAV, not its own copy of the price`,
      );
      assert.ok(
        !/Website Launch \| \$/.test(source),
        `${name} still hardcodes a Website Launch price`,
      );
      assert.ok(
        !source.includes('"/packages/launch"'),
        `${name} should link through WEBSITE_LAUNCH_NAV.href`,
      );
    });
  }
});
