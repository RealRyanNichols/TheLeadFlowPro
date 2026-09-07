import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
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
function harness({ admin = true, failedTable = "" } = {}) {
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
                    data: [],
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
  const out: { default?: () => Promise<unknown> } = {};
  new Function("require", "exports", compiled)((name: string) => {
    if (name === "@/lib/operatoros/auth")
      return {
        requireOperatorAdmin: async () => {
          if (!admin) throw new Error("Admins only");
          verified = true;
          return { supabase: client(false) };
        },
      };
    if (name === "@/lib/supabase/service")
      return {
        createServiceClient: () => {
          assert.ok(verified, "service read before auth");
          return client(true);
        },
      };
    if (name === "@/components/WorkspaceLinks" || name === "./LiveRefresh")
      return () => null;
    return require(name);
  }, out);
  return { run: () => out.default!(), reads };
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
