import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as buyerRoutes from "../lib/site/publicBuyerRoutes.ts";

class Redirect extends Error {
  readonly destination: string;
  constructor(destination: string) {
    super(destination);
    this.destination = destination;
  }
}

test("actual retired buyer entry routes redirect to the current service with campaign attribution", async () => {
  const cases = [
    ["app/go/time-back/page.tsx", "/agency/content"],
    ["app/go/lead-follow-up/page.tsx", "/agency/automation"],
    ["app/book/page.tsx", "/#free-consultation"],
    ["app/problem-intake/page.tsx", "/diagnostic"],
  ];
  for (const [file, target] of cases) {
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const exports = {} as {
      default: (props: {
        searchParams: Promise<buyerRoutes.BuyerQuery>;
      }) => Promise<void>;
    };
    new Function("require", "exports", code)((name: string) => {
      if (name === "next/navigation")
        return {
          permanentRedirect: (destination: string) => {
            throw new Redirect(destination);
          },
        };
      if (name === "@/lib/site/publicBuyerRoutes") return buyerRoutes;
      throw new Error(`Unexpected route import: ${name}`);
    }, exports);
    await assert.rejects(
      exports.default({ searchParams: Promise.resolve({}) }),
      (error) => error instanceof Redirect && error.destination === target,
    );
    await assert.rejects(
      exports.default({
        searchParams: Promise.resolve({
          utm_source: "facebook",
          utm_campaign: "old offer",
          ref: ["first", "second"],
          full_name: "private visitor",
          email: "private@example.test",
          goals: "private answers",
          goal: "old freeform answer",
          lead: "00000000-0000-4000-8000-000000000001",
        }),
      }),
      (error) => {
        assert.ok(error instanceof Redirect, file);
        const url = new URL(error.destination, "https://example.test");
        const expected = new URL(target, "https://example.test");
        assert.equal(url.pathname, expected.pathname);
        assert.equal(url.hash, expected.hash);
        assert.equal(url.searchParams.get("utm_source"), "facebook");
        assert.equal(url.searchParams.get("utm_campaign"), "old offer");
        assert.deepEqual(url.searchParams.getAll("ref"), ["first", "second"]);
        for (const key of ["full_name", "email", "goals", "goal", "lead"])
          assert.equal(url.searchParams.has(key), false);
        return true;
      },
    );
  }
});

test("book aliases retain workshop-list and training-platform context without reopening old managed offers", () => {
  assert.equal(
    buyerRoutes.retiredBuyerDestination("/book", {
      interest: "workshop_founding",
    }),
    "/events?interest=workshop_founding#next-workshop",
  );
  assert.equal(
    buyerRoutes.retiredBuyerDestination("/book", {
      interest: "training_platform",
      utm_source: "course",
    }),
    "/add-ons?module=courses&utm_source=course&interest=training_platform#build-request",
  );
  for (const interest of [
    "website_launch",
    "system_map",
    "lead_engine",
    "company_os",
    "unknown",
  ]) {
    const url = new URL(
      buyerRoutes.retiredBuyerDestination("/book", { interest }),
      "https://example.test",
    );
    assert.equal(url.pathname, "/");
    assert.equal(url.hash, "#free-consultation");
  }
  assert.equal(
    new URL(
      buyerRoutes.retiredBuyerDestination("/book", {
        interest: ["training_platform", "website_launch"],
      }),
      "https://example.test",
    ).pathname,
    "/",
  );
});

test("buyer handoffs retain deliberate scope and place attribution before the destination anchor", () => {
  const destination = buyerRoutes.buyerHref(
    "/agency/start?plan=structured#scope",
    {
      plan: "foundation",
      utm_source: ["a", "b"],
      unknown: "discard",
      utm_content: "x".repeat(2000),
      empty: undefined,
    },
  );
  const url = new URL(destination, "https://example.test");
  assert.equal(url.searchParams.get("plan"), "structured");
  assert.deepEqual(url.searchParams.getAll("utm_source"), ["a", "b"]);
  assert.equal(url.searchParams.get("utm_content")?.length, 1000);
  assert.equal(url.searchParams.has("unknown"), false);
  assert.equal(url.hash, "#scope");
});
