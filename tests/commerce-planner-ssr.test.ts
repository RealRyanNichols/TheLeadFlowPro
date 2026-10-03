import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { useFormReady } from "../components/site/useFormReady.ts";
import * as business from "../lib/site/business.ts";
import * as planner from "../lib/commercePlanner.ts";

test("commerce project contact fields cannot leak through a native GET before hydration", () => {
  const require = createRequire(import.meta.url);
  const code = ts.transpileModule(readFileSync("app/commerce/CommercePlanner.tsx", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const modules: Record<string, unknown> = {
    react: require("react"),
    "react/jsx-runtime": require("react/jsx-runtime"),
    "lucide-react": require("lucide-react"),
    "next/link": { __esModule: true, default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children) },
    "@/lib/commercePlanner": planner,
    "@/lib/site/business": business,
    "@/components/site/useFormReady": { useFormReady },
    "./commerce.module.css": { __esModule: true, default: {} },
  };
  const compiled = { exports: {} as { default: ComponentType } };
  new Function("require", "module", "exports", code)((name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  }, compiled, compiled.exports);
  const html = renderToStaticMarkup(createElement(compiled.exports.default));
  const form = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";
  assert.match(form, /method="post"/);
  assert.match(form, /action="\/api\/leads"/);
  assert.match(form, /aria-busy="true"/);
  assert.match(form, /<fieldset[^>]*disabled=""[^>]*>[\s\S]*name="full_name"[\s\S]*name="email"[\s\S]*<\/fieldset>/);
  assert.match(form, /<button[^>]*disabled=""[^>]*type="submit"/);
  assert.match(form, /<noscript>[\s\S]*form needs JavaScript/);
  const marketingConsent = form.match(/<input[^>]*name="marketing_email_consent"[^>]*>/)?.[0] ?? "";
  assert.ok(marketingConsent);
  assert.doesNotMatch(marketingConsent, /checked|required/);
  assert.doesNotMatch(form, /campaign_acknowledged|managed_plan_budget/);
});
