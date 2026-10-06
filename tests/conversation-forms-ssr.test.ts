import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement, type ComponentType, type ReactNode } from "react";
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
import * as plans from "../lib/site/managedPlans.ts";
import * as diagnostic from "../lib/businessDiagnostic.ts";
import * as toolStudio from "../lib/toolStudio.ts";

function renderConversationForm(
  file: string,
  props: Record<string, unknown> = {},
): string {
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
    "next/image": {
      __esModule: true,
      default: ({
        priority: _priority,
        ...props
      }: {
        priority?: boolean;
        src: string;
        alt: string;
      }) => createElement("img", props),
    },
    "@/components/site/SmsConsentText": { SmsConsentText },
    "@/components/site/useFormReady": { useFormReady },
    "./useFormReady": { useFormReady },
    "@/lib/site/business": business,
    "@/lib/site/campaignTags": campaign,
    "@/lib/site/consultation": consultation,
    "@/lib/site/external-links": externalLinks,
    "@/lib/site/inquiryValidation": validation,
    "@/lib/site/textLinks": textLinks,
    "@/lib/site/managedPlans": plans,
    "@/lib/businessDiagnostic": diagnostic,
    "@/lib/toolStudio": toolStudio,
  };
  const compiledModule = {
    exports: {} as { default: ComponentType<Record<string, unknown>> },
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
    createElement(compiledModule.exports.default, props),
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
    /<\/?(?:form|fieldset|input|textarea|select|button|a)\b[^>]*>/g,
  )) {
    const tag = match[0];
    if (tag.startsWith("</fieldset")) {
      assert.ok(fieldsets.length);
      fieldsets.pop();
    } else if (tag.startsWith("<fieldset"))
      fieldsets.push(/\bdisabled=""/.test(tag));
    else if (/^<(?:input|textarea|select)\b/.test(tag)) {
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

test("custom scope request guards all answers and submit before hydration while preserving selected training-platform intent", () => {
  const html = renderConversationForm("app/add-ons/AddOnsMenu.tsx", {
    initialModule: "courses",
  });
  assertSafeBeforeHydration(html, "/api/leads");
  const selected = Array.from(
    html.matchAll(/<button\b[^>]*aria-pressed="true"[^>]*>[\s\S]*?<\/button>/g),
    (match) => match[0],
  );
  assert.equal(selected.length, 1);
  assert.ok(selected[0].includes("Courses and training delivery"));
  assert.match(selected[0], /\bdisabled=""/);
  assert.match(html, /id="build-request"/);
});

test("Tool Studio keeps customer fields disabled before hydration and its unchanged POST checkout path behind the handler", () => {
  const html = renderConversationForm("app/go/tools/ToolStudioFunnel.tsx");
  // Its independent, anonymous scenario calculator is outside the customer
  // form. Only the form's named answers could fall through to native submit.
  const form = html.match(/<form\b[\s\S]*?<\/form>/)?.[0] ?? "";
  assertSafeBeforeHydration(form, "/api/leads");
});

test("workshop-list signup cannot accept names or email before hydration", () => {
  assertSafeBeforeHydration(
    renderConversationForm("components/site/WorkshopListForm.tsx", {
      eventSlug: "chatgpt-for-business-owners-longview",
      placement: "events_page",
    }),
    "/api/leads",
  );
});

test("diagnostic refuses native GET for a fresh questionnaire and a pending resume without running resume transport", () => {
  for (const resumeToken of ["", "private-resume-example"]) {
    const html = renderConversationForm(
      "app/diagnostic/BusinessDiagnosticForm.tsx",
      {
        initialAnswers: {},
        resumeToken,
        sourceChannel: "website",
        sourceDetail: "test",
        utm: { source: "", medium: "", campaign: "", content: "", term: "" },
      },
    );
    if (resumeToken) {
      assert.doesNotMatch(
        html,
        /<form\b/,
        "resume waits for transport before exposing a questionnaire",
      );
      assert.doesNotMatch(
        html,
        /<(?:input|textarea|select)\b/,
        "loading resume has no editable answer controls",
      );
      assert.match(html, /<noscript>/);
      assert.ok(html.includes(business.BUSINESS.phone.tel));
    } else assertSafeBeforeHydration(html, "/api/business-diagnostic");
    assert.ok(
      !html.includes(resumeToken || "no-empty-check"),
      "private resume token is not rendered into controls",
    );
  }
});
