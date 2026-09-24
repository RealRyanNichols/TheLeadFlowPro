import assert from "node:assert/strict";
import test from "node:test";
import { syncResendContacts, type ResendContactLead } from "../lib/resendContacts";

const lead = (overrides: Partial<ResendContactLead> = {}): ResendContactLead => ({
  full_name: "Pat Owner",
  email: "Pat@Example.com",
  marketing_email_consent: true,
  email_unsubscribed_at: null,
  ...overrides,
});

test("contact sync creates missing contacts and stores missing consent as unsubscribed", async () => {
  const bodies: unknown[] = [];
  const fetcher: typeof fetch = async (_url, init) => {
    if (!init?.method) {
      return Response.json({ object: "list", has_more: false, data: [] });
    }
    bodies.push(JSON.parse(String(init.body)));
    return Response.json({ object: "contact", id: crypto.randomUUID() });
  };

  const result = await syncResendContacts({
    apiKey: "fixture",
    fetcher,
    segmentId: "meta-segment",
    leads: [
      lead(),
      lead({ email: "no-consent@example.com", marketing_email_consent: false }),
      lead({ email: "optout@example.com", email_unsubscribed_at: "2026-09-22T00:00:00Z" }),
      lead({ email: "123@no-email.facebook.lead" }),
    ],
  });

  assert.equal(result.eligible, 3);
  assert.equal(result.created, 3);
  assert.equal(result.added_to_segment, 3);
  assert.deepEqual(bodies, [
    {
      email: "pat@example.com",
      first_name: "Pat",
      last_name: "Owner",
      unsubscribed: false,
      segments: [{ id: "meta-segment" }],
    },
    {
      email: "no-consent@example.com",
      first_name: "Pat",
      last_name: "Owner",
      unsubscribed: true,
      segments: [{ id: "meta-segment" }],
    },
    {
      email: "optout@example.com",
      first_name: "Pat",
      last_name: "Owner",
      unsubscribed: true,
      segments: [{ id: "meta-segment" }],
    },
  ]);
});

test("contact sync never re-subscribes a provider opt-out", async () => {
  let writes = 0;
  const fetcher: typeof fetch = async (_url, init) => {
    if (!init?.method) {
      return Response.json({
        object: "list",
        has_more: false,
        data: [
          { id: "existing", email: "pat@example.com", unsubscribed: true },
          { id: "needs-opt-out", email: "no-consent@example.com", unsubscribed: false },
        ],
      });
    }
    writes++;
    assert.equal(init.method, "PATCH");
    assert.deepEqual(JSON.parse(String(init.body)), { unsubscribed: true });
    return Response.json({ object: "contact", id: "needs-opt-out" });
  };

  const result = await syncResendContacts({
    apiKey: "fixture",
    fetcher,
    leads: [
      lead(),
      lead({ email: "no-consent@example.com", marketing_email_consent: null }),
    ],
  });

  assert.equal(writes, 1);
  assert.equal(result.preserved_provider_opt_out, 1);
  assert.equal(result.marked_unsubscribed, 1);
});

test("contact sync adds existing contacts to the requested segment", async () => {
  const writes: string[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    if (!init?.method) {
      if (String(url).includes("/segments/")) {
        return Response.json({ object: "list", has_more: false, data: [] });
      }
      return Response.json({
        object: "list",
        has_more: false,
        data: [{ id: "existing", email: "pat@example.com", unsubscribed: false }],
      });
    }
    writes.push(String(url));
    return Response.json({ id: "meta-segment" });
  };

  const result = await syncResendContacts({
    apiKey: "fixture",
    fetcher,
    segmentId: "meta-segment",
    leads: [lead()],
  });

  assert.equal(result.created, 0);
  assert.equal(result.already_present, 1);
  assert.equal(result.added_to_segment, 1);
  assert.deepEqual(writes, [
    "https://api.resend.com/contacts/pat%40example.com/segments/meta-segment",
  ]);
});

test("contact sync paginates, de-duplicates by normalized email, and keeps the stricter CRM state", async () => {
  const requested: string[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    requested.push(String(url));
    if (!init?.method) {
      if (!String(url).includes("after=")) {
        return Response.json({
          object: "list",
          has_more: true,
          data: [{ id: "page-one", email: "someone@example.com", unsubscribed: false }],
        });
      }
      return Response.json({ object: "list", has_more: false, data: [] });
    }
    return Response.json({ object: "contact", id: "new" });
  };

  const result = await syncResendContacts({
    apiKey: "fixture",
    fetcher,
    leads: [
      lead({ email: "DUPE@example.com" }),
      lead({ email: "dupe@example.com", marketing_email_consent: false }),
    ],
  });

  assert.equal(requested.filter((url) => url.includes("/contacts?")).length, 2);
  assert.equal(result.eligible, 1);
  assert.equal(result.created, 1);
});
