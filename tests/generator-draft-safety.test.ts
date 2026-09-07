import { test } from "node:test";
import assert from "node:assert/strict";
import { getTool, type Values } from "../lib/tools/index.ts";

function run(slug: string, supplied: Values) {
  const tool = getTool(slug);
  assert.ok(tool, `Missing published tool: ${slug}`);
  const values = Object.fromEntries(
    tool.fields.map((field) => [field.id, field.def]),
  ) as Values;
  return tool.run({ ...values, ...supplied });
}

test("review drafts welcome honest feedback without satisfaction gating", () => {
  const result = run("review-request-script", {
    business: "Example Repair",
    first: "Alex",
    link: "example.com/review",
    job: "the chair repair",
  });
  const text = result.output?.text || "";
  assert.match(text, /honest review/);
  assert.match(text, /https:\/\/example\.com\/review/);
  assert.match(text, /regardless of your rating/);
  assert.doesNotMatch(
    text,
    /if (we did right|you were happy)|reply to this email instead|while they still like you/i,
  );
  assert.match(text, /does not depend on leaving or changing a review/);
});

test("metadata drafts do not invent credentials or free pricing", () => {
  const result = run("meta-title-description-writer", {
    service: "Furniture Repair",
    city: "Example City",
    business: "Cedar Repair",
    hook: "Written scope before work",
    phone: "",
  });
  assert.equal(result.headline?.value, "46 / 60");
  assert.match(result.output?.text || "", /Written scope before work/);
  assert.doesNotMatch(
    result.output?.text || "",
    /licensed|insured|free estimate|guaranteed/i,
  );
});

test("Google post drafts do not invent completed work, offers, or credentials", () => {
  const result = run("google-post-writer", {
    business: "Example Repair",
    city: "Example City",
    service: "chair repair",
    offer: "",
    season: "fall",
    phone: "",
  });
  const text = result.output?.text || "";
  assert.equal((text.match(/POST \d/g) || []).length, 4);
  assert.doesNotMatch(
    text,
    /licensed|insured|another one finished|free estimates|no trip charge|no fine print/i,
  );
  assert.doesNotMatch(result.note || "", /expire.*week/i);
});

test("Google post text excludes a supplied number and preserves actual offer terms", () => {
  const result = run("google-post-writer", {
    business: "Example Repair",
    city: "Example City",
    service: "chair repair",
    offer: "Assessments by appointment through October 31",
    season: "fall",
    phone: "+1 202 555 0142",
  });
  assert.match(
    result.output?.text || "",
    /Assessments by appointment through October 31/,
  );
  assert.match(result.output?.text || "", /current terms and availability/);
  assert.doesNotMatch(result.output?.text || "", /555|0142/);
  assert.match(result.note || "", /Phone input is deliberately excluded/);
});

test("calendar output discloses floating time without claiming a title fixes it", () => {
  const result = run("add-to-calendar-link", {
    title: "Example event - Central Time",
    date: "2026-10-15",
    start: "18:00",
    end: "19:30",
    location: "Example room",
    details: "Practice only",
  });
  assert.match(
    result.output?.text || "",
    /DTSTART:20261015T180000\nDTEND:20261015T193000/,
  );
  assert.match(result.note || "", /floating local times/);
  assert.match(result.note || "", /Writing a zone in the title does not fix/);
});

test("job draft preserves supplied terms without inventing workplace history", () => {
  const result = run("job-post-writer", {
    business: "Example Repair",
    role: "Workshop Assistant",
    city: "Example City",
    payLow: 20,
    payHigh: 24,
    payType: "hour",
    duties: "Label incoming items",
    musts: "Read work orders",
    perks: "Paid training",
    contact: "Apply at example.com/jobs",
  });
  const text = result.output?.text || "";
  assert.match(text, /\$20 to \$24 an hour/);
  assert.match(text, /Paid training/);
  assert.doesNotMatch(
    text,
    /we pay on time|we are not a big outfit|I read every one|good people are gone in three days/i,
  );
});
