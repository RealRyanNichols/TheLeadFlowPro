import test from "node:test";
import assert from "node:assert/strict";
import {
  inquiryAttempt,
  type InquiryRequestDetails,
} from "../lib/service-areas/inquiry-retry.ts";

const details: InquiryRequestDetails = {
  name: "Test operator",
  email: "operator@example.com",
  business: "Test business",
  industry: "farm-ag",
  services: ["hay", "earthwork"],
  market: "Tyler, TX",
  scope: "local",
  states: [],
  miles: 35,
  publicConsent: false,
  contactConsent: true,
};

test("an identical retry after an uncertain save keeps the original request ID", () => {
  const first = inquiryAttempt(details, null, () => "first-request");
  const retry = inquiryAttempt(details, first, () => {
    throw new Error("An unchanged retry must not create a new ID.");
  });
  assert.equal(retry, first);
});

test("formatting and unordered service/state selections preserve a retry ID", () => {
  const stateRequest = {
    ...details,
    scope: "states" as const,
    states: ["TX", "LA"],
  };
  const first = inquiryAttempt(stateRequest, null, () => "first-request");
  const retry = inquiryAttempt(
    {
      ...stateRequest,
      name: " Test operator ",
      email: "OPERATOR@EXAMPLE.COM ",
      business: " Test business ",
      market: "tyler, tx ",
      services: ["earthwork", "hay", "hay"],
      states: ["LA", "TX", "TX"],
      miles: 50,
    },
    first,
    () => "unnecessary-new-request",
  );
  assert.equal(retry, first);
});

test("corrections receive a fresh ID so the earlier saved request cannot swallow them", () => {
  const first = inquiryAttempt(details, null, () => "first-request");
  const corrections: Partial<InquiryRequestDetails>[] = [
    { miles: 50 },
    { services: ["hay"] },
    { scope: "national" },
    { scope: "states", states: ["TX"] },
    { publicConsent: true },
    { contactConsent: false },
    { business: "Corrected business" },
    { email: "corrected@example.com" },
    { market: "Longview, TX" },
  ];
  for (const correction of corrections) {
    const changed = inquiryAttempt(
      { ...details, ...correction },
      first,
      () => "changed-request",
    );
    assert.equal(
      changed.requestId,
      "changed-request",
      JSON.stringify(correction),
    );
    assert.notEqual(changed.fingerprint, first.fingerprint);
  }
});

test("changing a requested state set is meaningful even when the main market stays the same", () => {
  const stateRequest = { ...details, scope: "states" as const, states: ["TX"] };
  const first = inquiryAttempt(stateRequest, null, () => "first-request");
  assert.equal(
    inquiryAttempt(
      { ...stateRequest, states: ["TX", "LA"] },
      first,
      () => "changed-request",
    ).requestId,
    "changed-request",
  );
});
