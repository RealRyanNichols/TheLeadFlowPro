import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { SmsConsentText } from "../components/site/SmsConsentText.tsx";
import { useFormReady } from "../components/site/useFormReady.ts";
import * as business from "../lib/site/business.ts";
import * as campaign from "../lib/site/campaignTags.ts";
import * as consultation from "../lib/site/consultation.ts";
import * as externalLinks from "../lib/site/external-links.ts";
import * as validation from "../lib/site/inquiryValidation.ts";
import * as textLinks from "../lib/site/textLinks.ts";

function renderConversationForm(file: string): string {
  // Real React, readiness hook, disclosure, and pure helpers. Effects do not
  // run during SSR; no handlers execute and no transport is mocked or invoked.
  const require = createRequire(import.meta.url);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
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
    "@/components/site/SmsConsentText": { SmsConsentText },
    "@/components/site/useFormReady": { useFormReady },
    "./useFormReady": { useFormReady },
    "@/lib/site/business": business,
    "@/lib/site/campaignTags": campaign,
    "@/lib/site/consultation": consultation,
    "@/lib/site/external-links": externalLinks,
    "@/lib/site/inquiryValidation": validation,
    "@/lib/site/textLinks": textLinks,
  };
  const compiledModule = {
    exports: {} as { default: ComponentType<Record<string, never>> },
  };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (name.endsWith(".module.css"))
        return { __esModule: true, default: {} };
      if (!(name in modules))
        throw new Error(`Unexpected conversation form import: ${name}`);
      return modules[name];
    },
    compiledModule,
    compiledModule.exports,
  );
  return renderToStaticMarkup(
    createElement(compiledModule.exports.default, {}),
  );
}

function assertSafeBeforeHydration(html: string, action: string) {
  const forms = Array.from(
    html.matchAll(/<form\b[^>]*>/g),
    (match) => match[0],
  );
  assert.equal(forms.length, 1);
  assert.match(forms[0], /\bmethod="post"/);
  assert.ok(forms[0].includes(`action="${action}"`));
  assert.ok(
    !forms[0].includes("?"),
    "fallback action cannot serialize answers into a query",
  );

  // Fieldset disabled state is inherited by nested controls. Check actual
  // rendered containment, so a control moved outside the guard fails too.
  const fieldsets: boolean[] = [];
  let inputs = 0;
  let submits = 0;
  const fallbackLinks: string[] = [];
  for (const match of html.matchAll(
    /<\/?(?:fieldset|input|textarea|button|a)\b[^>]*>/g,
  )) {
    const tag = match[0];
    if (tag.startsWith("</fieldset")) {
      assert.ok(fieldsets.length);
      fieldsets.pop();
    } else if (tag.startsWith("<fieldset"))
      fieldsets.push(/\bdisabled=""/.test(tag));
    else if (/^<(?:input|textarea)\b/.test(tag)) {
      inputs++;
      assert.ok(
        fieldsets.some(Boolean) || /\bdisabled=""/.test(tag),
        `SSR field is enabled: ${tag}`,
      );
    } else if (tag.startsWith("<button") && /\btype="submit"/.test(tag)) {
      submits++;
      assert.match(tag, /\bdisabled=""/);
    } else if (tag.startsWith("<a") && fieldsets.length === 0) {
      const href = tag.match(/\bhref="([^"]*)"/)?.[1];
      if (href) fallbackLinks.push(href);
    }
  }
  assert.equal(fieldsets.length, 0);
  assert.ok(inputs >= 3);
  assert.equal(submits, 1);
  const noScript = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? "";
  assert.match(noScript, /JavaScript/);
  assert.ok(
    fallbackLinks.includes(business.BUSINESS.phone.tel),
    "Call fallback is available outside disabled fields",
  );
  assert.ok(
    fallbackLinks.some((href) => href.startsWith(business.BUSINESS.phone.sms)),
    "Text fallback is available outside disabled fields",
  );
}

test("server-rendered contact form posts explicitly and keeps all fields and submit disabled before hydration", () => {
  assertSafeBeforeHydration(
    renderConversationForm("app/contact/ContactForm.tsx"),
    "/api/contact",
  );
});

test("server-rendered consultation form cannot leak answers through native GET and provides no-JavaScript call/text alternatives", () => {
  assertSafeBeforeHydration(
    renderConversationForm("components/site/ConsultationForm.tsx"),
    "/api/leads",
  );
});
