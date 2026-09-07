import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeadTimeline,
  leadSourceLabel,
  originalLeadAnswers,
  safeLeadDiagnostic,
  type LeadCallRecord,
  type LeadEmailRecord,
} from "../lib/leadTimeline.ts";

const lead = {
  id: "lead-a",
  full_name: "Sample Lead",
  created_at: "2026-09-01T12:00:00Z",
  source: "meta_lead_ad",
  notes: null,
};
const email = (
  step: number,
  delivery_status: LeadEmailRecord["delivery_status"],
): LeadEmailRecord => ({
  id: `email-${step}`,
  lead_id: lead.id,
  step,
  delivery_status,
  sent_at: "2026-09-02T12:00:00Z",
  first_attempt_at: "2026-09-02T12:00:00Z",
  last_attempt_at: "2026-09-03T12:00:00Z",
});
const call = (
  id: string,
  scope_status: string,
  lead_id = lead.id,
): LeadCallRecord => ({
  id,
  lead_id,
  scope_status,
  direction: "incoming",
  status: "completed",
  outcome: "answered",
  created_at: "2026-09-02T12:00:00Z",
  started_at: "2026-09-02T11:55:00Z",
  duration_seconds: 125,
  summary: "Asked for a website consultation.",
  next_steps: ["Arrange a call"],
  source: "quo",
});

test("private history combines channels newest first and keeps notes authors distinct", () => {
  const items = buildLeadTimeline({
    lead,
    notes: [
      {
        id: "one",
        lead_id: lead.id,
        body: "Follow up Friday",
        author: "Pat",
        created_at: "2026-09-03T12:00:00Z",
      },
      {
        id: "two",
        lead_id: lead.id,
        body: "Review scope",
        author: "Ryan",
        created_at: "2026-09-02T12:00:00Z",
      },
    ],
    messages: [
      {
        id: "msg",
        lead_id: lead.id,
        direction: "in",
        channel: "email",
        body: "Please call tomorrow.",
        author: null,
        delivered: true,
        created_at: "2026-09-04T12:00:00Z",
      },
    ],
    activity: [
      {
        id: "event",
        lead_id: lead.id,
        kind: "stage_change",
        detail: "New to contacted",
        created_at: "2026-09-05T12:00:00Z",
      },
    ],
  });
  assert.deepEqual(
    items.map((i) => i.id),
    ["activity:event", "message:msg", "note:one", "note:two", "intake:lead-a"],
  );
  assert.equal(items[1].author, "Sample Lead");
  assert.equal(items[2].author, "Pat");
  assert.equal(items[3].author, "Ryan");
});

test("step zero is enrollment, while pending and failed emails cannot look sent", () => {
  const items = buildLeadTimeline({
    lead,
    emails: [
      email(0, "sent"),
      email(1, "pending"),
      email(2, "failed"),
      email(3, "sent"),
      email(4, null),
    ],
  });
  const byId = (id: string) => items.find((i) => i.id === `email:email-${id}`)!;
  assert.equal(byId("0").status, "Enrollment record");
  assert.match(byId("0").body, /not a sent email/);
  assert.equal(byId("1").status, "Pending · not confirmed sent");
  assert.equal(byId("1").at, "2026-09-03T12:00:00Z");
  assert.equal(byId("2").status, "Failed · needs attention");
  assert.equal(byId("3").status, "Sent · provider accepted");
  assert.match(byId("3").body, /does not store the message body/);
  assert.equal(byId("4").status, "Delivery state not recorded");
});

test("aggregation excludes records for another lead and personal calls", () => {
  const items = buildLeadTimeline({
    lead,
    notes: [
      {
        id: "other-note",
        lead_id: "lead-b",
        body: "PRIVATE",
        author: "Other",
        created_at: lead.created_at,
      },
    ],
    activity: [
      {
        id: "other-event",
        lead_id: "lead-b",
        kind: "note",
        detail: "PRIVATE",
        created_at: lead.created_at,
      },
    ],
    emails: [{ ...email(1, "sent"), lead_id: "lead-b" }],
    messages: [
      {
        id: "other-message",
        lead_id: "lead-b",
        direction: "in",
        channel: "sms",
        body: "PRIVATE",
        author: null,
        delivered: true,
        created_at: lead.created_at,
      },
    ],
    calls: [
      call("valid", "company"),
      call("private", "personal"),
      call("other", "company", "lead-b"),
    ],
  });
  assert.deepEqual(
    items.map((i) => i.id),
    ["call:valid", "intake:lead-a"],
  );
  assert.match(items[0].body, /Next: Arrange a call/);
  assert.match(items[0].status!, /2m 5s/);
  assert.ok(!JSON.stringify(items).includes("PRIVATE"));
});

test("manually recorded replies name their recorder and never pretend to have sent", () => {
  const [item] = buildLeadTimeline({
    lead,
    messages: [
      {
        id: "record",
        lead_id: lead.id,
        direction: "in",
        channel: "note",
        body: "Received in Outlook",
        author: "Pat",
        delivered: true,
        created_at: "2026-09-02T12:00:00Z",
      },
    ],
  });
  assert.equal(item.author, "Logged by Pat");
  assert.equal(item.status, "Recorded only · nothing sent");
});

test("legacy notes keep unknown author and date rather than inventing an attribution", () => {
  const items = buildLeadTimeline({
    lead: { ...lead, notes: "An earlier note" },
    notes: [
      {
        id: "old",
        lead_id: lead.id,
        body: "Old entry",
        author: null,
        created_at: "bad date",
      },
    ],
  });
  assert.equal(items[0].kind, "intake");
  assert.equal(items.find((i) => i.id.startsWith("legacy:"))?.at, null);
  assert.equal(
    items.find((i) => i.id === "note:old")?.author,
    "Author not recorded",
  );
});

test("diagnostics exclude nested credentials before reaching a client", () => {
  const value = {
    source: "meta_lead_form",
    resume_url: "PRIVATE",
    nested: {
      access_token: "PRIVATE",
      apiKey: "PRIVATE",
      password: "PRIVATE",
      answers: [{ client_secret: "PRIVATE", business: "Plumbing" }],
    },
    fields: { "what_do_you_need?": "More inquiries", consent: false },
  };
  const result = safeLeadDiagnostic(value);
  assert.ok(!JSON.stringify(result).includes("PRIVATE"));
  assert.deepEqual(result, {
    source: "meta_lead_form",
    nested: { answers: [{ business: "Plumbing" }] },
    fields: { "what_do_you_need?": "More inquiries", consent: false },
  });
});

test("original Meta answers preserve verbatim values without raw object or secret dumps", () => {
  assert.deepEqual(
    originalLeadAnswers({
      fields: {
        "what_do_you_need?": "A clear website.",
        services: ["Dental", "Training"],
        amount: 0,
        consent: false,
        session_token: "PRIVATE",
        blob: { secret: "PRIVATE" },
      },
    }),
    [
      { label: "what do you need?", value: "A clear website." },
      { label: "services", value: "Dental, Training" },
      { label: "amount", value: "0" },
      { label: "consent", value: "false" },
    ],
  );
  assert.equal(leadSourceLabel("facebook-lead-ad"), "Facebook lead form");
  assert.equal(leadSourceLabel(null), "Source not recorded");
});
