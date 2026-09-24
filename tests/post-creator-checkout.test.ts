// The Post Creator branch of POST /api/checkout, run for real with Stripe
// replaced by an in-memory fake. Nothing here reaches the network.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { POST_CREATOR } from "../lib/postCreator/product.ts";

// The route and every lib module it imports are transpiled and loaded in a
// vm context (the same way tests/post-creator-routes.test.ts loads the
// account routes), with fetch and process.env read from this test.
const nativeRequire = createRequire(import.meta.url);

function loadRoute(): { POST: (req: Request) => Promise<Response> } {
  const modules = new Map<string, { exports: Record<string, any> }>();
  const resolve = (base: string): string => {
    for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) if (existsSync(candidate)) return candidate;
    throw new Error(`cannot resolve ${base}`);
  };
  function load(full: string): Record<string, any> {
    const cached = modules.get(full);
    if (cached) return cached.exports;
    const loaded = { exports: {} as Record<string, any> };
    modules.set(full, loaded);
    const code = ts.transpileModule(readFileSync(full, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const localRequire = (name: string) => {
      if (name === "server-only") return {};
      if (name.startsWith("@/")) return load(resolve(path.join(process.cwd(), name.slice(2))));
      if (name.startsWith(".")) return load(resolve(path.resolve(path.dirname(full), name)));
      return nativeRequire(name);
    };
    vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
      Buffer,
      URL,
      URLSearchParams,
      Request,
      Response,
      Headers,
      AbortSignal,
      TextEncoder,
      TextDecoder,
      setTimeout,
      clearTimeout,
      console,
      process,
      fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
    })(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  return load(path.resolve("app/api/checkout/route.ts")) as { POST: (req: Request) => Promise<Response> };
}

const { POST } = loadRoute();

const OPEN_ENV: Record<string, string> = {
  STRIPE_SECRET_KEY: "sk_test_mock_only",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-mock-only",
  RESEND_API_KEY: "re_mock_only",
  POST_CREATOR_SALES_OPEN: "true",
  POST_CREATOR_AI_ENABLED: "true",
  POST_CREATOR_ANTHROPIC_API_KEY: "sk-ant-mock-only",
  POST_CREATOR_DAILY_SPEND_CAP_USD: "5",
};

const savedEnv: Record<string, string | undefined> = {};
const savedFetch = globalThis.fetch;
let sent: URLSearchParams[] = [];

beforeEach(() => {
  sent = [];
  for (const [k, v] of Object.entries(OPEN_ENV)) {
    savedEnv[k] = process.env[k];
    process.env[k] = v;
  }
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    assert.equal(String(input), "https://api.stripe.com/v1/checkout/sessions");
    sent.push(new URLSearchParams(String(init.body ?? "")));
    return Response.json({ id: "cs_test_mock_session", url: "https://checkout.stripe.com/c/pay/cs_test_mock_session" });
  }) as typeof fetch;
});

afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  globalThis.fetch = savedFetch;
});

const checkout = (kind: string) =>
  POST(new Request("https://www.theleadflowpro.com/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) }));

test("no promotion code applies to a Post Creator checkout, on either plan", async () => {
  for (const kind of [POST_CREATOR.monthlyKind, POST_CREATOR.lifetimeKind]) {
    const res = await checkout(kind);
    assert.equal(res.status, 200, kind);
    const params = sent.at(-1)!;
    assert.equal(params.get("metadata[kind]"), kind);
    assert.equal(params.has("allow_promotion_codes"), false, `${kind} takes no promotion code`);
  }
  // Every other checkout keeps its codes.
  await checkout("system_map");
  assert.equal(sent.at(-1)!.get("allow_promotion_codes"), "true");
});

test("a cancelled Post Creator checkout lands on the pricing section, where the note is", async () => {
  await checkout(POST_CREATOR.lifetimeKind);
  const params = sent.at(-1)!;
  assert.equal(params.get("cancel_url"), `https://www.theleadflowpro.com${POST_CREATOR.path}?cancelled=1#pricing`);
  assert.equal(params.get("success_url"), `https://www.theleadflowpro.com${POST_CREATOR.claimPath}?session_id={CHECKOUT_SESSION_ID}`);
});
