import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OPERATOR_ACADEMY, OPERATOR_ACADEMY_COURSES } from "../lib/operatorAcademyCatalog.ts";
import { courseJsonLd, courseMetadata, coursePriceCents } from "../lib/courseSeo.ts";

describe("course search markup", () => {
  it("publishes only prices a buyer can actually pay", () => {
    for (const course of OPERATOR_ACADEMY_COURSES) {
      const cents = coursePriceCents(course);
      if (course.isFree) assert.equal(cents, 0, course.slug);
      else if (course.slug === "chatgpt-operator") assert.equal(cents, 29700);
      else if (course.slug === "content-engine") assert.equal(cents, 12700);
      else assert.equal(cents, OPERATOR_ACADEMY.foundingPriceCents, `${course.slug} sells only inside all-access`);
    }
  });

  it("emits a Course with provider, offer, workload and a syllabus per lesson", () => {
    const course = OPERATOR_ACADEMY_COURSES.find((item) => item.slug === "offer-engine")!;
    const ld = courseJsonLd(course) as Record<string, any>;
    assert.equal(ld["@type"], "Course");
    assert.equal(ld.isAccessibleForFree, true);
    assert.equal(ld.provider.name, "The LeadFlow Pro");
    assert.equal(ld.offers[0].price, "0.00");
    assert.match(ld.hasCourseInstance[0].courseWorkload, /^PT\d+M$/);
    assert.equal(ld.syllabusSections.length, 8);
    const meta = courseMetadata("offer-engine");
    assert.match(String(meta.title), /Offer Engine/);
    assert.equal((meta.alternates as any).canonical, "https://www.theleadflowpro.com/training/offer-engine");
  });

  it("noindexes an unknown course slug", () => {
    const meta = courseMetadata("not-a-course");
    assert.deepEqual(meta.robots, { index: false, follow: true });
  });
});
