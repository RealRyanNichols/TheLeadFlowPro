import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { leadWelcomePayload, welcomeSuppressed } from "../lib/leadNotify.ts";

const base = { full_name: "Dale Pruitt", email: "dale@example.com", interest: "learn" };

describe("funnel-specific lead welcomes", () => {
  it("sends academy free-access leads to the two free courses, not to a sales call", () => {
    const payload = leadWelcomePayload({ ...base, funnel: "operator_academy_free_access" });
    assert.match(payload.subject, /free courses/i);
    assert.match(payload.text, /\/training\/offer-engine/);
    assert.match(payload.text, /\/training\/lead-capture-system/);
    assert.doesNotMatch(payload.text, /what to fix first/i);
    assert.doesNotMatch(payload.text, /text first/i);
  });

  it("points the ChatGPT free lesson lead at the lesson", () => {
    const payload = leadWelcomePayload({ ...base, funnel: "chatgpt_operator_free_access" });
    assert.match(payload.text, /\/chatgpt\/free/);
  });

  it("names the order for each paid funnel and never promises an automated text", () => {
    for (const funnel of ["tool_studio", "lead_follow_up_funnel", "time_back_funnel", "package_page"]) {
      const payload = leadWelcomePayload({ ...base, interest: "done_for_you", funnel });
      assert.ok(payload.subject.length > 10, funnel);
      assert.doesNotMatch(payload.text, /system texts|automatic(ally)? text|auto-?reply/i, funnel);
      assert.match(payload.text, /903\) 500-8898/, funnel);
      assert.doesNotMatch(payload.text, /—/, funnel);
    }
  });

  it("keeps the free build welcome and the generic welcome", () => {
    const free = leadWelcomePayload({ ...base, interest: "free_website_program", funnel: "free_build_funnel" });
    assert.match(free.subject, /free website application/i);
    const generic = leadWelcomePayload({ ...base, interest: "launch_system", funnel: null });
    assert.match(generic.subject, /what to fix first/i);
    assert.match(generic.text, /text or call from \(903\) 500-8898/);
  });

  it("suppresses the welcome for an existing customer changing their monthly menu", () => {
    assert.equal(welcomeSuppressed({ funnel: "tool_studio_monthly_change" }), true);
    assert.equal(welcomeSuppressed({ funnel: "tool_studio" }), false);
    assert.equal(welcomeSuppressed({ funnel: null }), false);
  });
});
