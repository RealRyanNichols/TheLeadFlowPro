import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isUnmappedWebsiteLaunchPaymentLinkCandidate,
  isWebsiteLaunchDeposit,
  safeStripeKind,
  stripePaymentLinkId,
  WEBSITE_LAUNCH_PAYMENT_LINK_ID,
  websiteLaunchCustomer,
} from "../lib/stripeCheckout.ts";

describe("Website Launch Stripe classification", () => {
  it("recognizes the exact live $500 Payment Link without app checkout metadata", () => {
    assert.equal(
      isWebsiteLaunchDeposit({
        amount_total: 50000,
        payment_link: WEBSITE_LAUNCH_PAYMENT_LINK_ID,
      }),
      true,
    );
  });

  it("recognizes the live Payment Link metadata copied onto new sessions", () => {
    assert.equal(
      isWebsiteLaunchDeposit({
        amount_total: 50000,
        payment_link: "plink_rotated",
        metadata: {
          slug: "website-launch-deposit",
          phase: "deposit",
          app: "leadflowpro-offers",
        },
      }),
      true,
    );
  });

  it("recognizes Website Launch sessions created by the app checkout route", () => {
    assert.equal(
      isWebsiteLaunchDeposit({
        amount_total: 50000,
        metadata: { kind: "package_deposit", package: "launch" },
      }),
      true,
    );
  });

  it("requires the approved $500 amount even when metadata or the link matches", () => {
    assert.equal(
      isWebsiteLaunchDeposit({
        amount_total: 100000,
        payment_link: WEBSITE_LAUNCH_PAYMENT_LINK_ID,
        metadata: { kind: "package_deposit", package: "launch" },
      }),
      false,
    );
  });

  it("fails closed on a different, unmapped $500 Payment Link", () => {
    const session = { amount_total: 50000, payment_link: "plink_unknown" };
    assert.equal(isWebsiteLaunchDeposit(session), false);
    assert.equal(isUnmappedWebsiteLaunchPaymentLinkCandidate(session), true);
  });

  it("accepts expanded Payment Link objects and an intentional ID override", () => {
    const session = { amount_total: 50000, payment_link: { id: "plink_next" } };
    assert.equal(stripePaymentLinkId(session), "plink_next");
    assert.equal(isWebsiteLaunchDeposit(session, "plink_next"), true);
    assert.equal(isUnmappedWebsiteLaunchPaymentLinkCandidate(session, "plink_next"), false);
  });
});

describe("Stripe checkout normalization", () => {
  it("never defaults an unclassified purchase to the retired training offer", () => {
    assert.equal(safeStripeKind({ metadata: null }), "unknown");
    assert.equal(safeStripeKind({ metadata: { kind: "DROP TABLE" } }), "unknown");
    assert.equal(safeStripeKind({ metadata: { kind: "event" } }), "event");
  });

  it("normalizes the Stripe customer without inventing communication consent", () => {
    assert.deepEqual(
      websiteLaunchCustomer({
        customer_details: {
          email: "  OWNER@Example.com ",
          name: "  Jamie Owner ",
          phone: " 903-555-0100 ",
        },
      }),
      {
        email: "owner@example.com",
        fullName: "Jamie Owner",
        phone: "903-555-0100",
      },
    );
  });

  it("uses a readable email fallback when Stripe does not collect a name", () => {
    assert.equal(
      websiteLaunchCustomer({ customer_email: "alex.rivera@example.com" }).fullName,
      "Alex Rivera",
    );
  });
});
