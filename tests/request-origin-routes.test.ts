import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { parseSpecialProspect } from "../lib/septemberSpecial.ts";

const nativeRequire = createRequire(import.meta.url);
const origin = "https://www.theleadflowpro.com";

function harness() {
  const checkouts: Record<string, unknown>[] = [];
  const invitations: Record<string, any>[] = [];
  const modules = new Map<string, { exports: any }>();
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "fixture-user" } } }) },
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: async () => ({ data: table === "profiles"
          ? { role: "sales", full_name: "Fixture Sales" }
          : { id: "11111111-1111-4111-8111-111111111111", leads: { id: "fixture-lead", email: "fixture@example.test", full_name: "Fixture Client" } } }),
        update: () => ({ eq: async () => ({ error: null }) }),
        insert: async () => ({ error: null }),
      };
      return chain;
    },
  };
  function load(file: string): any {
    const full = path.resolve(file);
    if (modules.has(full)) return modules.get(full)!.exports;
    const module = { exports: {} };
    modules.set(full, module);
    const code = ts.transpileModule(readFileSync(full, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const require = (name: string): any => {
      if (name === "@/lib/stripe") return { getStripe: () => ({ checkout: { sessions: {
        create: async (data: Record<string, unknown>) => {
          checkouts.push(data);
          return { url: "https://checkout.stripe.com/c/pay/cs_test_mock" };
        },
      } } }) };
      if (name === "@/lib/supabase/server") return { createClient: async () => db };
      if (name === "@/lib/septemberSpecial") return { parseSpecialProspect };
      if (name === "@/lib/septemberSpecialServer") return {
        SpecialCheckoutError: class extends Error {},
        startSpecialCheckout: async () => { throw new Error("Invalid fixture must not start checkout"); },
      };
      if (name === "@supabase/supabase-js") return { createClient: () => ({ auth: {
        signInWithOtp: async (data: Record<string, any>) => { invitations.push(data); return { error: null }; },
      } }) };
      if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
      if (name.startsWith(".")) return load(path.resolve(path.dirname(full), `${name}.ts`));
      return nativeRequire(name);
    };
    vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
      URL, URLSearchParams, Request, Response, Buffer, console,
      process: { env: { NODE_ENV: "production" } },
    })(require, module, module.exports);
    return module.exports;
  }
  function request(route: string, body: unknown, requestOrigin = origin) {
    return new Request(`http://127.0.0.1:3109/api/${route}`, {
      method: "POST",
      headers: {
        host: "www.theleadflowpro.com", "x-forwarded-host": "www.theleadflowpro.com",
        "x-forwarded-proto": "https", origin: requestOrigin, "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
  return { load, request, checkouts, invitations };
}

test("course checkout sends public return URLs to Stripe behind the loopback proxy", async () => {
  for (const route of ["academy/checkout", "chatgpt-course/checkout", "operator-academy/content-engine/checkout"]) {
    const h = harness();
    const response = await h.load(`app/api/${route}/route.ts`).POST(h.request(route, { email: "fixture@example.test" }));
    assert.equal(response.status, 200, route);
    assert.equal(h.checkouts.length, 1);
    assert.equal(new URL(String(h.checkouts[0].success_url)).origin, origin);
    assert.equal(new URL(String(h.checkouts[0].cancel_url)).origin, origin);
  }
});

test("sales portal invitation keeps its public sign-in destination behind the proxy", async () => {
  const h = harness();
  const route = "sales/portal-invite";
  const response = await h.load(`app/api/${route}/route.ts`).POST(h.request(route, {
    project_id: "11111111-1111-4111-8111-111111111111",
  }));
  assert.equal(response.status, 200);
  assert.equal(h.invitations.length, 1);
  const redirect = new URL(h.invitations[0].options.emailRedirectTo);
  assert.equal(redirect.origin, origin);
  assert.equal(redirect.searchParams.get("next"), "/dashboard/build-room");
});

test("September offer validates same-origin proxy requests and rejects a foreign origin", async () => {
  const h = harness();
  const route = "september-special/checkout";
  const post = h.load(`app/api/${route}/route.ts`).POST;
  // An empty fixture must reach validation, never Stripe or reservation storage.
  assert.equal((await post(h.request(route, {}))).status, 400);
  assert.equal((await post(h.request(route, {}, "https://foreign.example"))).status, 403);
});
