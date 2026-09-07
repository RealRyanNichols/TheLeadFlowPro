import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as nurture from "../lib/nurture";
import * as guard from "../lib/metaCampaignGuard";

const require = createRequire(import.meta.url);
const website = {
  id: "website",
  created_at: "2026-09-05T00:00:00Z",
  source: "website",
  interest: "free_website_program",
  marketing_email_consent: true,
  diagnostic: { source: "free_build_funnel" },
  deleted_at: null,
  email_unsubscribed_at: null,
  is_test: false,
  status: "new",
};
type Lead = Omit<typeof website, "diagnostic" | "marketing_email_consent"> & {
  diagnostic: unknown;
  marketing_email_consent: unknown;
};
const formLead = (formId: string, id = formId): Lead => ({
  ...website,
  id,
  source: "meta_lead_ad",
  interest: "services",
  diagnostic: { form_id: formId },
});

// Execute the actual route through its recipient selection. The mock history
// read deliberately fails before any claim or email can happen. Query filters
// operate on fixture rows, so unsubscribe/status/test/age checks are exercised.
async function recipients(rows: Lead[], now = "2026-09-07T00:00:00Z") {
  let selected: string[] = [];
  const db = {
    from(table: string) {
      assert.ok(["leads", "lead_emails"].includes(table));
      let data = [...rows];
      const query = {
        select: () => query,
        is(column: string, value: unknown) {
          data = data.filter((row) => row[column as keyof Lead] === value);
          return query;
        },
        not(column: string, _operator: string, value: unknown) {
          data = data.filter((row) => row[column as keyof Lead] !== value);
          return query;
        },
        eq(column: string, value: unknown) {
          return query.is(column, value);
        },
        in(column: string, values: unknown[]) {
          if (table === "lead_emails") {
            assert.equal(column, "lead_id");
            selected = [...values] as string[];
          } else
            data = data.filter((row) =>
              values.includes(row[column as keyof Lead]),
            );
          return query;
        },
        gte(column: string, value: string | number) {
          if (table === "leads")
            data = data.filter(
              (row) => String(row[column as keyof Lead]) >= String(value),
            );
          return query;
        },
        lte: () => query,
        order: () => query,
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve(
            table === "leads"
              ? { data, error: null }
              : {
                  data: null,
                  error: { message: "Fixture stops before email delivery" },
                },
          ).then(resolve);
        },
      };
      return query;
    },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/api/cron/nurture/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const loadedModule = {
    exports: {} as { GET: (request: Request) => Promise<Response> },
  };
  const fixedNow = Date.parse(now);
  class Clock extends Date {
    static now() {
      return fixedNow;
    }
  }
  const run = vm.runInNewContext(
    `(function(require,module,exports){${code}\n})`,
    {
      Date: Clock,
      console: { error() {} },
      process: {
        env: {
          CRON_SECRET: "fixture-cron",
          SUPABASE_SERVICE_ROLE_KEY: "fixture-db",
          RESEND_API_KEY: "fixture-email",
        },
      },
    },
  );
  run(
    (name: string) => {
      if (name === "@supabase/supabase-js") return { createClient: () => db };
      if (name === "@/lib/config")
        return {
          SUPABASE_URL: `https://${guard.LEADFLOW_META.supabaseProjectRef}.supabase.co`,
        };
      if (name === "@/lib/nurture")
        return {
          ...nurture,
          workshopSequenceClosed: () =>
            nurture.workshopSequenceClosed(fixedNow),
        };
      if (name === "@/lib/metaCampaignGuard") return guard;
      if (name === "@/lib/unsubscribe")
        return { unsubscribeSecret: () => "fixture-unsubscribe" };
      if (name === "@/lib/nurtureDelivery")
        return {
          sendNurtureEmail: () => assert.fail("No test may send email"),
        };
      return require(name);
    },
    loadedModule,
    loadedModule.exports,
  );
  const result = await loadedModule.exports.GET(
    new Request("https://www.theleadflowpro.com/api/cron/nurture", {
      headers: { authorization: "Bearer fixture-cron" },
    }),
  );
  assert.equal(result.status, selected.length ? 500 : 200);
  return selected;
}

test("actual nurture route admits only consented website and registered sequence lanes", async () => {
  const forms = [
    guard.LEADFLOW_META.formId,
    "1602617814609528",
    "1001553739566746",
    "1072145798524733",
    "1749164796410610",
  ];
  const valid = [website, ...forms.map((id) => formLead(id))];
  const invalid: Lead[] = [
    formLead("foreign-form"),
    { ...website, id: "wrong-website-interest", interest: "other_offer" },
    { ...website, id: "missing-attribution", diagnostic: null },
    ...[false, null, undefined, "true", 1].flatMap((consent, index) => [
      {
        ...website,
        id: `website-consent-${index}`,
        marketing_email_consent: consent,
      },
      {
        ...formLead("1001553739566746", `meta-consent-${index}`),
        marketing_email_consent: consent,
      },
      {
        ...formLead("1749164796410610", `workshop-consent-${index}`),
        marketing_email_consent: consent,
      },
    ]),
  ];
  assert.deepEqual(
    await recipients([...valid, ...invalid]),
    valid.map((row) => row.id),
  );
});

test("actual nurture route excludes unsubscribed, deleted, test, closed, old and diagnostic leads", async () => {
  const rejected = [
    {
      ...website,
      id: "unsubscribed",
      email_unsubscribed_at: "2026-09-06T00:00:00Z",
    },
    { ...website, id: "deleted", deleted_at: "2026-09-06T00:00:00Z" },
    { ...website, id: "test", is_test: true },
    { ...website, id: "won", status: "won" },
    { ...website, id: "old", created_at: "2026-01-01T00:00:00Z" },
    {
      ...formLead("1001553739566746", "diagnostic"),
      diagnostic: {
        form_id: "1001553739566746",
        campaign: nurture.BUSINESS_DIAGNOSTIC_SOURCE,
      },
    },
  ] as Lead[];
  assert.deepEqual(await recipients(rejected), []);
});

test("actual nurture route stops workshop enrollment at its exact start while keeping free-build eligible", async () => {
  const rows = [website, formLead("1749164796410610", "workshop")];
  assert.deepEqual(await recipients(rows, "2026-09-17T23:29:59.999Z"), [
    "website",
    "workshop",
  ]);
  assert.deepEqual(await recipients(rows, "2026-09-17T23:30:00.000Z"), [
    "website",
  ]);
});
