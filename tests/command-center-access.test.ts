import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as leadTimeline from "../lib/leadTimeline.ts";
const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  readFileSync("app/admin/command-center/page.tsx", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  },
).outputText;
function harness({
  admin = true,
  failedTable = "",
  rows = {} as Record<string, unknown[]>,
} = {}) {
  const reads: string[] = [];
  const client = (service: boolean) => ({
    from(table: string) {
      reads.push(`${service ? "service" : "user"}:${table}`);
      const chain = new Proxy(
        {},
        {
          get: (_t, key) =>
            key === "then"
              ? (resolve: (value: unknown) => void) =>
                  resolve({
                    data: rows[table] ?? [],
                    error:
                      table === failedTable ? { message: "Unavailable" } : null,
                  })
              : () => chain,
        },
      );
      return chain;
    },
  });
  let verified = false;
  let userClient: unknown = null;
  const out: { default?: () => Promise<unknown> } = {};
  new Function("require", "exports", compiled)((name: string) => {
    if (name === "@/lib/operatoros/auth")
      return {
        requireOperatorAdmin: async () => {
          if (!admin) throw new Error("Admins only");
          verified = true;
          userClient = client(false);
          return { supabase: userClient };
        },
      };
    // The call banner is its own server component (tests/call-queue.test.ts runs it); here it only has to be placed.
    if (name === "../TodaysCallsBanner") return TodaysCallsBannerStub;
    if (name === "@/lib/supabase/service")
      return {
        createServiceClient: () => {
          assert.ok(verified, "service read before auth");
          return client(true);
        },
      };
    // The RN-1 desk panel reads its own server; tests/rn1-desk.test.ts runs it.
    if (
      name === "@/components/WorkspaceLinks" ||
      name === "./LiveRefresh" ||
      name === "./Rn1DeskPanel"
    )
      return () => null;
    if (name === "@/lib/leadTimeline") return leadTimeline;
    return require(name);
  }, out);
  return { run: () => out.default!(), reads, userClient: () => userClient };
}
function TodaysCallsBannerStub() {
  return null;
}
test("command center verifies admin before private reads and uses service-only approval summary", async () => {
  const h = harness();
  await h.run();
  assert.ok(h.reads.includes("service:approval_queue"));
  assert.ok(!h.reads.includes("user:approval_queue"));
  assert.ok(h.reads.includes("user:leads"));
});
test("a non-admin cannot trigger command-center service reads", async () => {
  const h = harness({ admin: false });
  await assert.rejects(h.run(), /Admins only/);
  assert.deepEqual(h.reads, []);
});
test("reporting failure returns recovery destinations rather than a 500 or zero-valued overview", async () => {
  const h = harness({ failedTable: "approval_queue" });
  const view = JSON.stringify(await h.run());
  assert.match(view, /Part of the overview could not be loaded/);
  assert.match(view, /Unavailable totals are not shown as zero/);
  assert.doesNotMatch(view, /Recorded cash/);
});
test("today's calls banner sits at the top of both views and reads with the admin's own client", async () => {
  for (const failedTable of ["", "approval_queue"]) {
    const h = harness({ failedTable });
    const view = (await h.run()) as { props: { children: { type: unknown; props: { supabase?: unknown } }[] } };
    const first = view.props.children[0];
    assert.equal(first.type, TodaysCallsBannerStub, `banner first (${failedTable || "full view"})`);
    assert.ok(h.userClient() !== null);
    assert.equal(first.props.supabase, h.userClient(), "the signed-in client, never the service client");
  }
});
test("the 24-hour feed hides the Call Closer's Outcome, Offer ids and Ref markers", async () => {
  const at = new Date().toISOString();
  const key = "0f6d7c1a-2b3e-4f5a-8b9c-1d2e3f4a5b6c";
  const h = harness({
    rows: {
      leads: [
        {
          id: "lead-1",
          full_name: "Dana Sample",
          business_name: "Sample Pressure Washing (fictional)",
          source: "meta_lead_ad",
          status: "new",
          created_at: "2026-01-02T15:00:00.000Z",
        },
      ],
      lead_activity: [
        {
          id: "act-1",
          lead_id: "lead-1",
          kind: "call",
          detail: `Call: no answer. Try again Wed, Sep 23 at 4:00 PM. Outcome: no_answer. Ref ${key}`,
          created_at: at,
        },
        {
          id: "act-2",
          lead_id: "lead-1",
          kind: "call",
          detail: `Call: wants a proposal for Website Launch. Proposal due Thu, Sep 24. Outcome: wants_proposal. Offer ids: website_launch. Ref ${key.replace(/0/g, "1")}`,
          created_at: at,
        },
      ],
    },
  });
  // Component types (next/link and friends) are not text and can be circular; skip them.
  const view = JSON.stringify(await h.run(), (key, value) => (key === "type" ? undefined : value));
  assert.match(view, /Sample Pressure Washing \(fictional\): Call: no answer\. Try again Wed, Sep 23 at 4:00 PM\./);
  assert.match(view, /Call: wants a proposal for Website Launch\. Proposal due Thu, Sep 24\./);
  assert.doesNotMatch(view, /Outcome: no_answer|Outcome: wants_proposal|Offer ids:|Ref [0-9a-f-]{20}/);
});
