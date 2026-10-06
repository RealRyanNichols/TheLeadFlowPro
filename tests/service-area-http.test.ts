import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import * as bodyReader from "../lib/service-areas/http.ts";
import * as engine from "../lib/service-areas/engine.ts";
import * as origin from "../lib/ideaLabHttp.ts";
import { ServiceAreaStoreError } from "../lib/service-areas/store.ts";

const requireReal = createRequire(import.meta.url);
const encoder = new TextEncoder();
const site = "https://www.theleadflowpro.com";
const validInquiry = {
  requestId: "11111111-1111-4111-8111-111111111111",
  name: "Synthetic operator",
  business: "Synthetic company",
  email: "operator@example.test",
  industry: "farm-ag",
  services: ["hay"],
  market: "Tyler, TX",
  scope: "local",
  states: [],
  miles: 35,
  contactConsent: true,
  publicConsent: false,
  website: "",
};
class AuthError extends Error {
  status: number;
  constructor(status: number) {
    super("Access denied.");
    this.status = status;
  }
}
function handler(
  admin = false,
  options: { denied?: number; storeStatus?: 409 | 429 | 503 } = {},
) {
  const calls: unknown[] = [];
  const modules: Record<string, unknown> = {
    "next/server": requireReal("next/server"),
    "@/lib/ideaLabHttp": origin,
    "@/lib/service-areas/http": bodyReader,
    "@/lib/service-areas/engine": engine,
    "@/lib/operatoros/auth": {
      OperatorAuthError: AuthError,
      async requireOperatorAdmin() {
        if (options.denied) throw new AuthError(options.denied);
        return { user: { id: "authenticated-fixture-admin" } };
      },
    },
    "@/lib/service-areas/store": {
      ServiceAreaStoreError,
      async submitServiceAreaInquiry(value: unknown) {
        calls.push(value);
        if (options.storeStatus)
          throw new ServiceAreaStoreError(
            "Synthetic store failure.",
            options.storeStatus,
          );
      },
      async saveServiceAreaRegistry(...values: unknown[]) {
        calls.push(values);
        if (options.storeStatus)
          throw new ServiceAreaStoreError(
            "Synthetic store failure.",
            options.storeStatus,
          );
        return 2;
      },
    },
  };
  const route = admin
    ? "../app/api/admin/service-areas/route.ts"
    : "../app/api/service-areas/inquiries/route.ts";
  const code = ts.transpileModule(
    readFileSync(new URL(route, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const mod = {
    exports: {} as Record<string, (request: Request) => Promise<Response>>,
  };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      assert.ok(name in modules, `Unexpected route import: ${name}`);
      return modules[name];
    },
    mod,
    mod.exports,
  );
  return { run: mod.exports[admin ? "PUT" : "POST"], calls };
}
function request(
  body: string | ReadableStream<Uint8Array>,
  admin = false,
  extraHeaders: Record<string, string> = {},
) {
  return new Request(
    `${site}/api/${admin ? "admin/service-areas" : "service-areas/inquiries"}`,
    {
      method: admin ? "PUT" : "POST",
      headers: {
        origin: site,
        "content-type": "application/json",
        ...extraHeaders,
      },
      body,
      duplex: "half",
    } as RequestInit,
  );
}
function trackedStream(chunks: Uint8Array[]) {
  const observed = { reads: 0, cancelled: false };
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[observed.reads++];
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel() {
        observed.cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  return { stream, observed };
}

test("both routes bound streamed bytes and cancel before consuming the remaining body", async () => {
  for (const admin of [false, true]) {
    const limit = admin ? 450000 : 10000;
    for (const declared of [undefined, "1"]) {
      const { stream, observed } = trackedStream([
        new Uint8Array(limit),
        new Uint8Array(1),
        new Uint8Array(limit),
      ]);
      const api = handler(admin);
      const response = await api.run(
        request(stream, admin, declared ? { "content-length": declared } : {}),
      );
      assert.equal(response.status, 413);
      assert.deepEqual(await response.json(), {
        error: admin ? "Registry is too large." : "Request is too large.",
      });
      assert.equal(observed.reads, 2);
      assert.equal(observed.cancelled, true);
      assert.equal(api.calls.length, 0);
    }
  }
});

test("declared oversize bodies are cancelled without reading a chunk", async () => {
  const { stream, observed } = trackedStream([encoder.encode("{}")]);
  const response = await handler().run(
    request(stream, false, { "content-length": "10001" }),
  );
  assert.equal(response.status, 413);
  assert.equal(observed.reads, 0);
  assert.equal(observed.cancelled, true);
});

test("multibyte text is limited by UTF-8 bytes rather than JavaScript character count", async () => {
  for (const admin of [false, true]) {
    const limit = admin ? 450000 : 10000;
    const text = JSON.stringify({ value: "é".repeat(limit / 2) });
    assert.ok(text.length < limit);
    assert.ok(encoder.encode(text).byteLength > limit);
    const api = handler(admin);
    assert.equal((await api.run(request(text, admin))).status, 413);
    assert.equal(api.calls.length, 0);
  }
});

test("the byte boundary accepts exact-sized valid JSON and decodes split UTF-8 characters", async () => {
  const text = JSON.stringify({ value: "x".repeat(9988) });
  assert.equal(encoder.encode(text).byteLength, 10000);
  assert.deepEqual(
    await bodyReader.readServiceAreaJson(request(text), 10000, "Too large."),
    JSON.parse(text),
  );
  const unicode = encoder.encode(JSON.stringify({ value: "🌱é" }));
  const { stream } = trackedStream([
    new Uint8Array(0),
    ...[...unicode].map((byte) => new Uint8Array([byte])),
  ]);
  assert.deepEqual(
    await bodyReader.readServiceAreaJson(request(stream), 10000, "Too large."),
    { value: "🌱é" },
  );
});

test("malformed, non-object, invalid UTF-8, and failed streams remain 400 without persistence", async () => {
  for (const text of ["", "{", "null", "[]", "true"]) {
    const api = handler();
    assert.equal((await api.run(request(text))).status, 400);
    assert.equal(api.calls.length, 0);
  }
  const invalid = trackedStream([new Uint8Array([0xff])]);
  assert.equal((await handler().run(request(invalid.stream))).status, 400);
  const failed = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.error(new Error("Synthetic stream failure."));
    },
  });
  assert.equal((await handler().run(request(failed))).status, 400);
});

test("same-origin, admin denial, honeypot, and consent validation still prevent persistence", async () => {
  for (const admin of [false, true]) {
    const api = handler(admin);
    assert.equal(
      (
        await api.run(
          request("{}", admin, { origin: "https://foreign.example" }),
        )
      ).status,
      403,
    );
    assert.equal(api.calls.length, 0);
  }
  for (const denied of [401, 403]) {
    const api = handler(true, { denied });
    assert.equal((await api.run(request("{}", true))).status, denied);
    assert.equal(api.calls.length, 0);
  }
  const api = handler();
  for (const body of [
    { ...validInquiry, website: "automated-value" },
    { ...validInquiry, contactConsent: false },
  ])
    assert.equal((await api.run(request(JSON.stringify(body)))).status, 400);
  assert.equal(api.calls.length, 0);
});

test("valid requests preserve private saved responses, CAS inputs, and store failure statuses", async () => {
  const inquiryApi = handler();
  const saved = await inquiryApi.run(request(JSON.stringify(validInquiry)));
  assert.equal(saved.status, 201);
  assert.equal(saved.headers.get("cache-control"), "no-store");
  const success = await saved.json();
  assert.equal(success.saved, "private_area_request");
  assert.equal(success.crmStatus, "pending_manual_handoff");
  assert.match(success.message, /not reserved/);
  assert.equal(inquiryApi.calls.length, 1);
  const adminApi = handler(true);
  const body = { registry: { version: 1, territories: [] }, revision: 1 };
  const updated = await adminApi.run(request(JSON.stringify(body), true));
  assert.equal(updated.status, 200);
  assert.equal(updated.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await updated.json(), { revision: 2 });
  assert.deepEqual(adminApi.calls, [
    [body.registry, 1, "authenticated-fixture-admin"],
  ]);
  for (const storeStatus of [409, 429, 503] as const) {
    assert.equal(
      (
        await handler(false, { storeStatus }).run(
          request(JSON.stringify(validInquiry)),
        )
      ).status,
      storeStatus,
    );
    assert.equal(
      (
        await handler(true, { storeStatus }).run(
          request(JSON.stringify(body), true),
        )
      ).status,
      storeStatus,
    );
  }
});
