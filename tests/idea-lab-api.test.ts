import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import * as workspace from "../lib/ideaLabWorkspace.ts";
import * as origin from "../lib/ideaLabHttp.ts";
import * as exporter from "../lib/ideaLabExport.ts";

const requireReal = createRequire(import.meta.url);
class AuthError extends Error {
  status: number;
  constructor(status: number) {
    super("Access denied");
    this.status = status;
  }
}
type Fixture = {
  denied?: number;
  stored?: unknown;
  readError?: object;
  saveError?: { code: string };
};
function handlers(fixture: Fixture = {}, exportRoute = false) {
  const calls: { owner?: string; save?: Record<string, unknown> } = {};
  const query = {
    select() {
      return query;
    },
    eq(_column: string, owner: string) {
      calls.owner = owner;
      return query;
    },
    async maybeSingle() {
      return { data: fixture.stored ?? null, error: fixture.readError ?? null };
    },
  };
  const auth = {
    OperatorAuthError: AuthError,
    async requireOperatorAdmin() {
      if (fixture.denied) throw new AuthError(fixture.denied);
      return {
        user: { id: "authenticated-owner" },
        supabase: {
          from(table: string) {
            assert.equal(table, "idea_lab_states");
            return query;
          },
          async rpc(name: string, params: Record<string, unknown>) {
            assert.equal(name, "save_idea_lab_state");
            calls.save = params;
            return { data: 2, error: fixture.saveError ?? null };
          },
        },
      };
    },
  };
  const modules: Record<string, unknown> = {
    "next/server": requireReal("next/server"),
    "@/lib/operatoros/auth": auth,
    "@/lib/ideaLabWorkspace": workspace,
    "@/lib/ideaLabHttp": origin,
    "@/lib/ideaLabExport": exporter,
  };
  const path = exportRoute
    ? "../app/api/admin/idea-lab/export/route.ts"
    : "../app/api/admin/idea-lab/route.ts";
  const code = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const mod = {
    exports: {} as {
      GET: () => Promise<Response>;
      PUT: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    },
  };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    },
    mod,
    mod.exports,
  );
  return { ...mod.exports, calls };
}
function put(body: unknown, requestOrigin = "https://www.theleadflowpro.com") {
  return new Request("http://localhost:3109/api/admin/idea-lab", {
    method: "PUT",
    headers: {
      host: "www.theleadflowpro.com",
      origin: requestOrigin,
      "x-forwarded-proto": "https",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
test("workspace and export handlers preserve anonymous and ordinary-user denial", async () => {
  for (const denied of [401, 403]) {
    const api = handlers({ denied });
    assert.equal((await api.GET()).status, denied);
    assert.equal((await api.PUT(put({}))).status, denied);
    assert.equal(api.calls.save, undefined);
    const exportApi = handlers({ denied }, true);
    assert.equal((await exportApi.POST(put({}))).status, denied);
  }
});
test("workspace reads are private and constrained to the signed-in owner", async () => {
  const api = handlers();
  const response = await api.GET();
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(api.calls.owner, "authenticated-owner");
  assert.deepEqual(await response.json(), {
    workspace: workspace.emptyIdeaWorkspace(),
    revision: 0,
  });
});
test("storage failures are visible and never produce a successful empty workspace", async () => {
  const response = await handlers({ readError: { code: "offline" } }).GET();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).workspace, undefined);
});
test("cross-site and malformed writes never reach the database", async () => {
  const api = handlers();
  assert.equal((await api.PUT(put({}, "https://outside.example"))).status, 403);
  assert.equal(
    (
      await api.PUT(
        put({ workspace: workspace.emptyIdeaWorkspace(), revision: -1 }),
      )
    ).status,
    400,
  );
  assert.equal(api.calls.save, undefined);
});
test("valid writes derive the owner from auth and preserve compare-and-swap conflicts", async () => {
  const document = workspace.emptyIdeaWorkspace();
  const api = handlers();
  const response = await api.PUT(
    put({ workspace: document, revision: 1, owner: "other-owner" }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(api.calls.save, {
    p_owner: "authenticated-owner",
    p_document: document,
    p_revision: 1,
  });
  assert.deepEqual(await response.json(), { revision: 2 });
  const stale = await handlers({ saveError: { code: "40001" } }).PUT(
    put({ workspace: document, revision: 1 }),
  );
  assert.equal(stale.status, 409);
  assert.match((await stale.json()).error, /another tab/);
});
