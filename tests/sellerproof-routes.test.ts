import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { emptyPacket, REVIEW_ITEMS } from "../lib/sellerproof/packet";
import { caseHash } from "../lib/sellerproof/access";

const nativeRequire = createRequire(import.meta.url);
const origin = "https://www.theleadflowpro.com";
const p = {
  ...emptyPacket("12345678-1234-4234-8234-123456789012"),
  business: "Example merchant",
  orderId: "ORDER-1",
  disputeId: "DISPUTE-1",
  amount: "149.00",
  deadline: "2026-10-20",
  description: "Digital templates",
  statement: "Private merchant statement never sent to Stripe.",
};
const paid = {
  id: "cs_test_abcdefghijklmnopqrstuv",
  created: Math.floor(Date.now() / 1000),
  mode: "payment",
  status: "complete",
  payment_status: "paid",
  currency: "usd",
  amount_total: 4900,
  livemode: false,
  metadata: {
    kind: "sellerproof_packet",
    packet_id: p.id,
    case_hash: caseHash(p),
  },
  payment_intent: {
    latest_charge: { refunded: false, amount_refunded: 0, disputed: false },
  },
};

function harness(
  options: {
    stripe?: unknown;
    key?: string;
    cookie?: string;
    failStripe?: boolean;
  } = {},
) {
  const requests: {
    url: string;
    body: string;
    headers: Record<string, string>;
  }[] = [];
  let cookie = options.cookie;
  const modules = new Map<
    string,
    { exports: Record<string, (...args: any[]) => any> }
  >();
  function load(file: string): Record<string, (...args: any[]) => any> {
    const full = path.resolve(file);
    const cached = modules.get(full);
    if (cached) return cached.exports;
    const loadedModule = {
      exports: {} as Record<string, (...args: any[]) => any>,
    };
    modules.set(full, loadedModule);
    const code = ts.transpileModule(readFileSync(full, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const localRequire = (name: string) => {
      if (name === "next/headers")
        return {
          cookies: async () => ({
            get: () => (cookie ? { value: cookie } : undefined),
          }),
        };
      if (name.startsWith("@/"))
        return load(path.join(process.cwd(), `${name.slice(2)}.ts`));
      if (name.startsWith("."))
        return load(path.resolve(path.dirname(full), `${name}.ts`));
      return nativeRequire(name);
    };
    const run = vm.runInNewContext(
      `(function(require,module,exports){${code}\n})`,
      {
        Buffer,
        URL,
        URLSearchParams,
        Request,
        Response,
        AbortSignal,
        console,
        process: {
          env: {
            NODE_ENV: "production",
            STRIPE_SECRET_KEY: options.key ?? "sk_test_local_mock_only",
            SELLERPROOF_SECRET: "test-signer-not-used-in-production",
            RESEND_API_KEY: "test-email-mock-only",
          },
        },
        fetch: async (url: string, init: RequestInit = {}) => {
          requests.push({
            url,
            body: String(init.body ?? ""),
            headers: init.headers as Record<string, string>,
          });
          if (url.startsWith("https://api.resend.com/"))
            return Response.json({ id: "mock-email-id" });
          if (options.failStripe) throw new Error("simulated upstream outage");
          if (init.method === "POST")
            return Response.json({
              url: "https://checkout.stripe.com/c/pay/cs_test_mock",
            });
          return Response.json(options.stripe ?? paid);
        },
      },
    );
    run(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  function route(name: string) {
    return load(`app/api/sellerproof/${name}/route.ts`).POST;
  }
  function request(body: unknown, requestOrigin = origin) {
    return new Request(`${origin}/api/sellerproof/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: requestOrigin },
      body: JSON.stringify(body),
    });
  }
  return {
    load,
    route,
    request,
    requests,
    setCookie: (value: string) => {
      cookie = value;
    },
  };
}

test("checkout rejects cross-origin calls and resolves price without sending evidence to Stripe", async () => {
  const h = harness();
  const post = h.route("checkout");
  assert.equal(
    (await post(h.request({ packet: p }, "https://foreign.invalid"))).status,
    403,
  );
  assert.equal(h.requests.length, 0);
  const res = await post(h.request({ packet: p, amount: 1, unlocked: true }));
  assert.equal(res.status, 200);
  const params = new URLSearchParams(h.requests[0].body);
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "4900");
  assert.equal(params.get("metadata[kind]"), "sellerproof_packet");
  for (const secret of [p.statement, p.orderId, p.disputeId, p.business])
    assert.ok(!h.requests[0].body.includes(secret));
  assert.match(res.headers.get("Cache-Control") || "", /no-store/);
  assert.equal(
    (await post(h.request({ packet: { ...p, statement: "x".repeat(300000) } })))
      .status,
    400,
  );
  const off = harness({ key: "" });
  assert.equal(
    (await off.route("checkout")(off.request({ packet: p }))).status,
    503,
  );
});
test("paid access sets a signed cookie, export requires review and matching case, refund revokes it", async () => {
  const h = harness();
  const claim = await h.route("access")(h.request({ sessionId: paid.id }));
  assert.equal(claim.status, 200);
  const result = await claim.json();
  assert.equal(result.unlocked, true);
  assert.match(claim.headers.get("set-cookie") || "", /HttpOnly/i);
  assert.match(claim.headers.get("set-cookie") || "", /Secure/i);
  h.setCookie(result.recoveryKey);
  const exportRoute = h.route("export");
  assert.equal(
    (await exportRoute(h.request({ packet: p, confirmations: [] }))).status,
    400,
  );
  assert.equal(
    (
      await exportRoute(
        h.request({
          packet: { ...p, disputeId: "another" },
          confirmations: REVIEW_ITEMS.map(() => true),
        }),
      )
    ).status,
    403,
  );
  const ok = await exportRoute(
    h.request({ packet: p, confirmations: REVIEW_ITEMS.map(() => true) }),
  );
  assert.equal(ok.status, 200);
  assert.match((await ok.json()).html, /Private merchant statement/);
  const refunded = harness({
    stripe: { ...paid, payment_intent: { latest_charge: { refunded: true } } },
    cookie: result.recoveryKey,
  });
  assert.equal(
    (
      await refunded.route("export")(
        refunded.request({
          packet: p,
          confirmations: REVIEW_ITEMS.map(() => true),
        }),
      )
    ).status,
    403,
  );
  const failed = harness({ failStripe: true, cookie: result.recoveryKey });
  assert.equal(
    (
      await failed.route("export")(
        failed.request({
          packet: p,
          confirmations: REVIEW_ITEMS.map(() => true),
        }),
      )
    ).status,
    503,
  );
});
test("unpaid sessions and forged cookies cannot unlock or export", async () => {
  const h = harness({
    stripe: { ...paid, payment_status: "unpaid" },
    cookie: "forged",
  });
  const res = await h.route("access")(h.request({ sessionId: paid.id }));
  assert.equal(res.status, 402);
  assert.equal(res.headers.get("set-cookie"), null);
  const exp = await h.route("export")(
    h.request({
      packet: { ...p, unlocked: true },
      confirmations: REVIEW_ITEMS.map(() => true),
    }),
  );
  assert.equal(exp.status, 403);
});
test("receipt retries have stable content and idempotency keys; no evidence is emailed", async () => {
  const h = harness();
  const send = h.load("lib/sellerproof/receipt.ts").sendSellerProofReceipt;
  await send("buyer@example.invalid", paid.id);
  await send("buyer@example.invalid", paid.id);
  const emails = h.requests.filter((r) => r.url.includes("resend.com"));
  assert.equal(emails.length, 4);
  assert.equal(emails[0].body, emails[2].body);
  assert.equal(
    emails[0].headers["Idempotency-Key"],
    emails[2].headers["Idempotency-Key"],
  );
  assert.ok(!emails[0].body.includes(p.statement));
  assert.match(emails[0].body, /recovery key/);
  assert.match(emails[0].body, /No outcome guarantees/);
});
