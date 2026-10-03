import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MANAGED_COMMERCIAL_TERMS } from "../lib/site/managedPlans.ts";
import { usd } from "../lib/site/prices.ts";
import { leadWelcomePayload, welcomeSuppressed } from "../lib/leadNotify.ts";

const base = {
  full_name: "Dale Pruitt",
  email: "dale@example.com",
  interest: "learn",
};

describe("funnel-specific lead welcomes", () => {
  it("sends academy free-access leads to the two free courses, not to a sales call", () => {
    const payload = leadWelcomePayload({
      ...base,
      funnel: "operator_academy_free_access",
    });
    assert.match(payload.subject, /free courses/i);
    assert.match(payload.text, /\/training\/offer-engine/);
    assert.match(payload.text, /\/training\/lead-capture-system/);
    assert.doesNotMatch(payload.text, /what to fix first/i);
    assert.doesNotMatch(payload.text, /text first/i);
  });

  it("points the ChatGPT free lesson lead at the lesson", () => {
    const payload = leadWelcomePayload({
      ...base,
      funnel: "chatgpt_operator_free_access",
    });
    assert.match(payload.text, /\/chatgpt\/free/);
  });

  it("names the order for each paid funnel and never promises an automated text", () => {
    for (const funnel of [
      "tool_studio",
      "lead_follow_up_funnel",
      "time_back_funnel",
      "package_page",
    ]) {
      const payload = leadWelcomePayload({
        ...base,
        interest: "done_for_you",
        funnel,
      });
      assert.ok(payload.subject.length > 10, funnel);
      assert.doesNotMatch(
        payload.text,
        /system texts|automatic(ally)? text|auto-?reply/i,
        funnel,
      );
      assert.match(payload.text, /903\) 500-8898/, funnel);
      assert.doesNotMatch(payload.text, /—/, funnel);
    }
  });

  it("sends old free-build leads the generic welcome, never the retired offer", () => {
    // The free website build was retired on 2026-09-22. A lead that still
    // carries its interest or funnel gets the general welcome.
    for (const lead of [
      {
        ...base,
        interest: "free_website_program",
        funnel: "free_build_funnel",
      },
      { ...base, interest: "free_website_program", funnel: null },
      { ...base, interest: "website_launch", funnel: "free_build_funnel" },
    ]) {
      const payload = leadWelcomePayload(lead);
      assert.match(payload.subject, /what to fix first/i);
      assert.doesNotMatch(payload.text, /free-build|build fee|free website/i);
    }
    const generic = leadWelcomePayload({
      ...base,
      interest: "launch_system",
      funnel: null,
    });
    assert.match(generic.subject, /what to fix first/i);
    assert.match(generic.text, /within one business day by email/);
    assert.doesNotMatch(generic.text, /I may also call or text/);
  });

  it("generic and written-scope welcomes promise phone follow-up only with a number and permission", () => {
    for (const funnel of [
      null,
      "tool_studio",
      "package_page",
      "agency_intake",
      "product_project",
    ]) {
      for (const contact of [
        { phone: null, sms_consent: false },
        { phone: "9035550101", sms_consent: false },
        { phone: null, sms_consent: true },
      ]) {
        const payload = leadWelcomePayload({ ...base, funnel, ...contact });
        assert.match(
          payload.text,
          /within one business day by email/,
          String(funnel),
        );
        assert.doesNotMatch(
          payload.text,
          /With your permission, I may also call or text/,
          String(funnel),
        );
      }
      if (funnel !== "agency_intake") {
        const optedIn = leadWelcomePayload({
          ...base,
          funnel,
          phone: "9035550101",
          sms_consent: true,
        });
        assert.match(
          optedIn.text,
          /With your permission, I may also call or text from \(903\) 500-8898/,
        );
      }
    }
  });

  it("keeps product project requests separate from campaign enrollment and acquired-job pricing", () => {
    const payload = leadWelcomePayload({ ...base, interest: "done_for_you", funnel: "product_project" });
    assert.match(payload.subject, /product project request/);
    assert.match(payload.text, /build and launch deliverables/);
    assert.match(payload.text, /operating costs, support, and project price/);
    assert.match(payload.text, /not enrollment in an acquisition campaign or authorization for a charge/);
    assert.match(payload.text, /Product sales do not carry farm job or property deal targets/);
    assert.doesNotMatch(payload.text, /\$7,500|15 (?:signed|paid|acquired)|minimum upfront|automatic proposal/i);
  });

  it("confirms the upfront campaign scope without enrolling an inquiry in recurring billing", () => {
    const payload = leadWelcomePayload({ ...base, funnel: "agency_intake" });
    assert.ok(
      payload.text.includes(
        `${usd(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd)} upfront`,
      ),
    );
    assert.ok(
      payload.text.includes(
        `first ${MANAGED_COMMERCIAL_TERMS.initialCampaignDays} days start at`,
      ),
    );
    assert.match(payload.text, /included advertising allocation/);
    assert.match(
      payload.text,
      /acquisition target and counting rules in writing/,
    );
    assert.match(payload.text, /At day 90 we review results and capacity/);
    assert.match(
      payload.text,
      /higher investment requires a new written scope and price/,
    );
    assert.match(payload.text, /no automatic extension or charge/i);
    assert.match(
      payload.text,
      /additional acquisition targets are scoped and funded upfront/i,
    );
    assert.match(payload.text, /not charged automatically when a job closes/);
    assert.doesNotMatch(
      payload.text,
      /ongoing monthly prices|first month|\$5,000|\$15,000/,
    );
  });

  it("suppresses the welcome for an existing customer changing their monthly menu", () => {
    assert.equal(
      welcomeSuppressed({ funnel: "tool_studio_monthly_change" }),
      true,
    );
    assert.equal(welcomeSuppressed({ funnel: "tool_studio" }), false);
    assert.equal(welcomeSuppressed({ funnel: null }), false);
  });
});
