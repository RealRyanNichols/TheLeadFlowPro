import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { SmsConsentText } from "../components/site/SmsConsentText.tsx";
import { useFormReady } from "../components/site/useFormReady.ts";
import * as intake from "../lib/site/agencyIntake.ts";
import * as campaign from "../lib/site/campaignTags.ts";
import * as business from "../lib/site/business.ts";
import * as plans from "../lib/site/managedPlans.ts";
import * as prices from "../lib/site/prices.ts";

test("server-rendered inquiry cannot fall through to a native GET or accept answers before hydration", () => {
  // Render the actual component and readiness hook. Server rendering does not
  // run effects; only router/CSS imports need neutral test substitutes.
  const require = createRequire(import.meta.url);
  const source = readFileSync("app/agency/start/AgencyIntake.tsx", "utf8");
  const code = ts.transpileModule(source, {
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
    "next/link": {
      __esModule: true,
      default: ({
        children,
        ...props
      }: {
        children: ReactNode;
        href: string;
      }) => createElement("a", props, children),
    },
    "@/components/site/SmsConsentText": { SmsConsentText },
    "@/components/site/useFormReady": { useFormReady },
    "@/lib/site/agencyIntake": intake,
    "@/lib/site/campaignTags": campaign,
    "@/lib/site/business": business,
    "@/lib/site/managedPlans": plans,
    "@/lib/site/prices": prices,
    "./agency-intake.module.css": { __esModule: true, default: {} },
  };
  const compiledModule = {
    exports: {} as {
      default: ComponentType<{
        services: intake.AgencyServiceOption[];
        preselected: string | null;
      }>;
    },
  };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (!(name in modules))
        throw new Error(`Unexpected intake import: ${name}`);
      return modules[name];
    },
    compiledModule,
    compiledModule.exports,
  );
  const html = renderToStaticMarkup(
    createElement(compiledModule.exports.default, {
      services: [{ slug: "meta-ads", label: "Meta ads" }],
      preselected: "meta-ads",
    }),
  );
  const form = html.match(/<form\b[^>]*>/)?.[0] ?? "";
  assert.match(form, /\bmethod="post"/);
  assert.match(form, /\baction="\/api\/leads"/);
  assert.match(form, /\baria-busy="true"/);
  const fieldsets = Array.from(
    html.matchAll(/<fieldset\b[^>]*>/g),
    (match) => match[0],
  );
  assert.equal(fieldsets.length, 8);
  for (const fieldset of fieldsets) assert.match(fieldset, /\bdisabled=""/);
  const submit = html.match(/<button\b[^>]*type="submit"[^>]*>/)?.[0] ?? "";
  assert.match(submit, /\bdisabled=""/);
  const withoutScript =
    html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? "";
  assert.match(withoutScript, /form needs JavaScript/);
  assert.ok(withoutScript.includes(`href="${business.BUSINESS.phone.tel}"`));
  assert.ok(withoutScript.includes(`href="${business.BUSINESS.phone.sms}"`));
});
