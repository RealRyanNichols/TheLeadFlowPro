import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import * as workspace from "../lib/ideaLabWorkspace.ts";
import * as origin from "../lib/ideaLabHttp.ts";
import * as exporter from "../lib/ideaLabExport.ts";
import { IDEA_WORKSTREAMS } from "../lib/ideaLab.ts";
import { defaultIdeaOutcomeExperiment } from "../lib/ideaLabOutcome.ts";

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
    assert.equal(api.calls.owner, undefined);
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
  assert.equal((await api.PUT(put({ text: "x".repeat(200_001) }))).status, 413);
  assert.equal(api.calls.owner, undefined);
  assert.equal(api.calls.save, undefined);
});
test("legacy brief writes preserve saved pilots from the authenticated owner's row", async () => {
  const pilot = defaultIdeaOutcomeExperiment("saved-pilot");
  pilot.evidence.pilot = "Saved pilot cohort reference";
  const stored = { ...workspace.emptyIdeaWorkspace(), experiments: [pilot] };
  const incoming = workspace.emptyIdeaWorkspace();
  incoming.briefs = [workspace.defaultIdeaBrief(IDEA_WORKSTREAMS[0].id)];
  incoming.briefs[0].outcome = "Updated brief from an older client";
  const api = handlers({ stored: { document: stored, revision: 1 } });
  const response = await api.PUT(
    put({ workspace: incoming, revision: 1, owner: "other-owner" }),
  );
  assert.equal(response.status, 200);
  assert.equal(api.calls.owner, "authenticated-owner");
  assert.deepEqual(api.calls.save, {
    p_owner: "authenticated-owner",
    p_document: { ...incoming, experiments: [pilot] },
    p_revision: 1,
  });
});
test("explicit empty pilots remain an intentional deletion without a compatibility read", async () => {
  const api = handlers({
    stored: {
      document: {
        ...workspace.emptyIdeaWorkspace(),
        experiments: [defaultIdeaOutcomeExperiment("saved-pilot")],
      },
      revision: 1,
    },
    readError: { code: "offline" },
  });
  const document = { ...workspace.emptyIdeaWorkspace(), experiments: [] };
  assert.equal(
    (await api.PUT(put({ workspace: document, revision: 1 }))).status,
    200,
  );
  assert.equal(api.calls.owner, undefined);
  assert.deepEqual(api.calls.save?.p_document, document);
});
test("legacy writes fail closed when stored pilots cannot be read", async () => {
  const api = handlers({ readError: { code: "offline" } });
  const response = await api.PUT(
    put({ workspace: workspace.emptyIdeaWorkspace(), revision: 1 }),
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match((await response.json()).error, /not been saved/);
  assert.equal(api.calls.owner, "authenticated-owner");
  assert.equal(api.calls.save, undefined);
});
test("preserved pilots cannot push a legacy write past the workspace storage cap", async () => {
  const incoming = workspace.emptyIdeaWorkspace();
  incoming.briefs = IDEA_WORKSTREAMS.slice(0, 7).map(({ id }) => ({
    ...workspace.defaultIdeaBrief(id),
    buyer: "x".repeat(6000),
    outcome: "x".repeat(6000),
    scope: "x".repeat(6000),
    acceptance: "x".repeat(6000),
  }));
  const experiments = ["saved-pilot-one", "saved-pilot-two"].map((id) => ({
    ...defaultIdeaOutcomeExperiment(id),
    workflowNote: "x".repeat(6000),
    sourceReference: "x".repeat(2000),
    evidence: { baseline: "x".repeat(2000), pilot: "x".repeat(2000) },
  }));
  assert.doesNotThrow(() => workspace.validateIdeaWorkspace(incoming));
  const api = handlers({
    stored: {
      document: { ...workspace.emptyIdeaWorkspace(), experiments },
      revision: 1,
    },
  });
  const response = await api.PUT(put({ workspace: incoming, revision: 1 }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /storage limit.*Download/);
  assert.equal(api.calls.owner, "authenticated-owner");
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
