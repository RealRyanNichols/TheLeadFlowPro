import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { OPENAI_APPS_VERIFICATION_PATHS, verificationResponse } from "../lib/openaiAppsVerification.ts";
import { PLUGIN_PLATFORMS } from "../lib/pluginDocs.ts";
import { copyProblems } from "../lib/hq/copy.ts";

test("the verification paths are 404 until the token is set, then serve it byte for byte as plain text", async () => {
  assert.equal(verificationResponse({}).status, 404);
  assert.equal(verificationResponse({ OPENAI_APPS_VERIFICATION_TOKEN: "   " }).status, 404);
  const r = verificationResponse({ OPENAI_APPS_VERIFICATION_TOKEN: " abc123DEF \n" });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "abc123DEF", "no whitespace, no trailing newline, no wrapper");
  assert.match(r.headers.get("content-type") ?? "", /^text\/plain/);
  assert.equal(r.headers.get("cache-control"), "no-store");
  for (const path of OPENAI_APPS_VERIFICATION_PATHS) {
    const file = join(process.cwd(), "app", path, "route.ts");
    const source = readFileSync(file, "utf8");
    assert.ok(source.includes("verificationResponse(process.env)"), path);
  }
  const env = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  assert.match(env, /^OPENAI_APPS_VERIFICATION_TOKEN=""$/m);
});

test("the install steps state the plan each assistant needs and name the Developer mode path for ChatGPT", () => {
  const chatgpt = PLUGIN_PLATFORMS.find((p) => p.id === "chatgpt")!;
  assert.match(chatgpt.requires ?? "", /Plus, Pro, Business, Enterprise/);
  assert.ok(chatgpt.steps.some((s) => s.includes("Developer mode")));
  assert.ok(chatgpt.steps.some((s) => s.includes("OAuth")));
  const claude = PLUGIN_PLATFORMS.find((p) => p.id === "claude")!;
  assert.match(claude.requires ?? "", /Pro, Max, Team, or Enterprise/);
  assert.ok(claude.steps.some((s) => s.includes("Add custom connector")));
  for (const p of PLUGIN_PLATFORMS) {
    if (p.auth === "api_key") assert.equal(p.requires, null, p.id);
    const text = [p.who, p.requires ?? "", ...p.steps].join(" ");
    assert.deepEqual(copyProblems(text), [], `${p.id}: ${copyProblems(text).join("; ")}`);
  }
});
