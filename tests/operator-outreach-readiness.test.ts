import assert from "node:assert/strict";
import test from "node:test";
import {
  contactVerificationBlockers,
  outreachReadiness,
  type OutreachProspectReadiness,
  type OutreachWorkspaceReadiness,
} from "../lib/operatoros/outreach-readiness";

const prospect: OutreachProspectReadiness = {
  status: "ready",
  contact_name: "Jane Owner",
  contact_title: "Owner",
  contact_email: "jane@example.com",
  contact_phone: "903-555-0100",
  contact_route: "https://www.facebook.com/example",
  contact_source: "https://example.com/contact",
  contact_verified_at: "2026-08-31T20:00:00.000Z",
  compliance_review_required: false,
};

const settings: OutreachWorkspaceReadiness = {
  sender_name: "Ryan Nichols",
  sender_email: "hello@theleadflowpro.com",
  sender_phone: "903-555-0199",
  allowed_channels: ["email", "dm", "phone", "text"],
};

test("contact verification rejects a name-only record", () => {
  const blockers = contactVerificationBlockers({
    ...prospect,
    contact_title: null,
    contact_email: null,
    contact_phone: null,
    contact_route: null,
    contact_source: null,
    contact_verified_at: null,
  });

  assert.deepEqual(blockers, [
    "Add the decision-maker role.",
    "Add the public or permissioned source.",
    "Add at least one usable contact route.",
  ]);
});

test("contact verification rejects a generic route label", () => {
  const blockers = contactVerificationBlockers({
    ...prospect,
    contact_email: null,
    contact_phone: null,
    contact_route: "Owner by email after verification",
    contact_verified_at: null,
  });
  assert.ok(blockers.includes("Add at least one usable contact route."));
});

test("a website contact form is not mislabeled as a direct-message route", () => {
  const result = outreachReadiness(
    { ...prospect, contact_email: null, contact_phone: null, contact_route: "https://example.com/contact" },
    settings,
    "dm",
  );
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("Add the exact direct-message profile or page route."));
});

test("verified email is ready when the sender and channel are configured", () => {
  assert.deepEqual(outreachReadiness(prospect, settings, "email"), { ready: true, blockers: [] });
});

test("a sourced and verified direct-message route can be ready without an email", () => {
  const result = outreachReadiness({ ...prospect, contact_email: null }, settings, "dm");
  assert.deepEqual(result, { ready: true, blockers: [] });
});

test("missing source blocks approval", () => {
  const result = outreachReadiness({ ...prospect, contact_source: null }, settings, "email");
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("Add the public or permissioned source."));
});

test("a disabled channel blocks approval", () => {
  const result = outreachReadiness(prospect, { ...settings, allowed_channels: ["email"] }, "dm");
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("This channel is not enabled in OperatorOS settings."));
});

test("phone and text require the LeadFlow sending phone", () => {
  const result = outreachReadiness(prospect, { ...settings, sender_phone: null }, "text");
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("Configure the LeadFlow sending phone before phone or text approval."));
});

test("regulated records remain on compliance hold", () => {
  const result = outreachReadiness({ ...prospect, compliance_review_required: true }, settings, "email");
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("Separate compliance review is required before outreach approval."));
});

test("closed prospects cannot return to the approval queue", () => {
  const result = outreachReadiness({ ...prospect, status: "do_not_contact" }, settings, "email");
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("This prospect is closed and cannot be approved for outreach."));
});

test("internal work remains exempt from external contact readiness", () => {
  const result = outreachReadiness(
    {
      ...prospect,
      contact_name: null,
      contact_title: null,
      contact_email: null,
      contact_phone: null,
      contact_route: null,
      contact_source: null,
      contact_verified_at: null,
    },
    { ...settings, allowed_channels: [] },
    "internal",
  );
  assert.deepEqual(result, { ready: true, blockers: [] });
});
