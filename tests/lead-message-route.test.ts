import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as authorModule from "../lib/leadMessageAuthor.ts";
const require = createRequire(import.meta.url);
const code = ts.transpileModule(
  readFileSync("app/api/admin/lead-message/route.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

async function run({
  role = "sales",
  signedIn = true,
  profileName = "Patrick Grabbs",
  email = "lead@example.test",
  smsConsent = false,
  smsUnsubscribed = null as string | null,
} = {}) {
  const emails: Record<string, string>[] = [];
  const texts: string[] = [];
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const db = {
    auth: {
      getUser: async () => ({
        data: {
          user: signedIn
            ? { id: "staff-pat", email: "pat@example.test" }
            : null,
        },
      }),
    },
    from(table: string) {
      let inserted: Record<string, unknown> | undefined;
      const result = () => ({
        data:
          table === "profiles"
            ? { role, full_name: profileName }
            : table === "leads"
              ? {
                  id: "lead-a",
                  full_name: "Jamie Example",
                  email,
                  phone: "202-555-0148",
                  sms_consent: smsConsent,
                  sms_unsubscribed_at: smsUnsubscribed,
                }
              : { id: "message-fixture", ...inserted },
        error: null,
      });
      const query = {
        select: () => query,
        eq: () => query,
        insert(row: Record<string, unknown>) {
          inserted = row;
          inserts.push({ table, row });
          return query;
        },
        single: async () => result(),
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve(result()).then(resolve);
        },
      };
      return query;
    },
  };
  const loaded = {
    exports: {} as { POST: (request: Request) => Promise<Response> },
  };
  const evaluate = vm.runInNewContext(
    `(function(require,module,exports){${code}\n})`,
    {
      process: { env: { RESEND_API_KEY: "fixture-only-never-real" } },
      fetch: async (url: string, init: RequestInit) => {
        assert.equal(url, "https://api.resend.com/emails");
        emails.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ id: "provider-fixture" }), {
          status: 200,
        });
      },
    },
  );
  evaluate(
    (name: string) => {
      if (name === "@/lib/supabase/server")
        return { createClient: async () => db };
      if (name === "@/lib/quo")
        return {
          sendLeadText: async (_phone: string, body: string) => {
            texts.push(body);
            return true;
          },
        };
      if (name === "@/lib/leadMessageAuthor") return authorModule;
      return require(name);
    },
    loaded,
    loaded.exports,
  );
  const response = await loaded.exports.POST(
    new Request("https://www.theleadflowpro.com/api/admin/lead-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: "lead-a",
        body: "Can we review your plan?",
        author: "Ryan Nichols",
        from: "forged@example.test",
      }),
    }),
  );
  return { response, emails, texts, inserts };
}

test("actual lead-message route ignores forged request identity and records the signed-in salesperson", async () => {
  const r = await run();
  assert.equal(r.response.status, 200);
  assert.equal(r.emails.length, 1);
  assert.equal(
    r.emails[0].from,
    "Patrick Grabbs via The LeadFlow Pro <ryan@theleadflowpro.com>",
  );
  assert.match(r.emails[0].text, /Patrick Grabbs/);
  assert.equal(
    r.inserts.find((item) => item.table === "lead_messages")?.row.author,
    "Patrick Grabbs",
  );
  assert.match(
    String(
      r.inserts.find((item) => item.table === "lead_activity")?.row.detail,
    ),
    /Patrick Grabbs sent an email/,
  );
});

test("unauthenticated and nonstaff callers cannot send or insert messages", async () => {
  for (const input of [
    { signedIn: false },
    { role: "client" },
    { role: "student" },
  ]) {
    const r = await run(input);
    assert.equal(r.response.status, input.signedIn === false ? 401 : 403);
    assert.equal(r.emails.length + r.texts.length + r.inserts.length, 0);
  }
});

test("SMS still requires consent and an active subscription; the actual actor is recorded", async () => {
  const text = await run({ smsConsent: true });
  assert.equal(text.texts.length, 1);
  assert.equal(text.emails.length, 0);
  assert.equal(text.inserts[0].row.author, "Patrick Grabbs");
  const revoked = await run({
    smsConsent: true,
    smsUnsubscribed: "2026-09-01T00:00:00Z",
  });
  assert.equal(revoked.texts.length, 0);
  assert.equal(revoked.emails.length, 1);
});

test("Facebook missing-email placeholders are not sent to a provider", async () => {
  const r = await run({ email: "meta-form-id@no-email.facebook.lead" });
  assert.equal(r.response.status, 400);
  assert.equal(r.emails.length + r.texts.length + r.inserts.length, 0);
});
