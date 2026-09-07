import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { OPERATOR_ACADEMY_COURSES } from "../lib/operatorAcademyCatalog";
import {
  orderTrainingCourses,
  trainingCourseArtwork,
  trainingCourseHref,
} from "../app/training/training-library";

const cards = OPERATOR_ACADEMY_COURSES.map((course) => ({
  slug: course.slug,
  is_free: course.isFree,
  hasAccess: false,
  progress: { lesson: `${course.slug}-saved-lesson`, completed: 3 },
}));

test("signed-out discovery puts the two free courses first without mutating records", () => {
  const original = cards.map((course) => course.slug);
  const ordered = orderTrainingCourses(cards, false);
  assert.deepEqual(
    ordered.slice(0, 2).map((course) => course.slug),
    ["offer-engine", "lead-capture-system"],
  );
  assert.deepEqual(
    ordered.slice(2).map((course) => course.slug),
    original.filter(
      (slug) => !["offer-engine", "lead-capture-system"].includes(slug),
    ),
  );
  assert.deepEqual(
    cards.map((course) => course.slug),
    original,
  );
  for (const course of ordered)
    assert.equal(
      course,
      cards.find((item) => item.slug === course.slug),
    );
});

test("signed-in learners retain every course, its order, access and progress reference", () => {
  const signedIn = cards.map((course, index) => ({
    ...course,
    hasAccess: index % 2 === 0,
  }));
  const ordered = orderTrainingCourses(signedIn, true);
  assert.notEqual(ordered, signedIn);
  assert.deepEqual(
    ordered.map((course) => course.slug),
    signedIn.map((course) => course.slug),
  );
  ordered.forEach((course, index) => {
    assert.equal(course, signedIn[index]);
    assert.equal(course.progress, signedIn[index].progress);
    assert.equal(course.hasAccess, signedIn[index].hasAccess);
  });
  assert.deepEqual(orderTrainingCourses([], false), []);
});

test("all ten courses use their own existing 640 by 360 illustration", () => {
  const paths = new Set<string>();
  for (const course of cards) {
    const artwork = trainingCourseArtwork(course.slug);
    assert.ok(artwork);
    assert.equal(artwork, `/images/academy/cards/${course.slug}.svg`);
    const svg = readFileSync(
      path.join(process.cwd(), "public", artwork),
      "utf8",
    );
    assert.match(svg, /viewBox="0 0 640 360"/);
    paths.add(artwork);
  }
  assert.equal(paths.size, 10);
  assert.equal(trainingCourseArtwork("../../private"), null);
  assert.equal(trainingCourseArtwork("not-a-course"), null);
});

test("unlocked courses keep their existing lesson entry routes", () => {
  for (const course of cards)
    assert.equal(
      trainingCourseHref({ ...course, hasAccess: true }),
      `/training/${course.slug}`,
    );
});

test("free registration and supported paid enrollment retain their distinct destinations", () => {
  for (const slug of ["offer-engine", "lead-capture-system"])
    assert.equal(
      trainingCourseHref({ slug, hasAccess: false }),
      "/academy#free-access",
    );
  assert.equal(
    trainingCourseHref({ slug: "content-engine", hasAccess: false }),
    "/operator-academy/content-engine",
  );
  assert.equal(
    trainingCourseHref({ slug: "chatgpt-operator", hasAccess: false }),
    "/chatgpt",
  );
  for (const course of cards.filter(
    (item) =>
      !item.is_free &&
      !["content-engine", "chatgpt-operator"].includes(item.slug),
  ))
    assert.equal(trainingCourseHref(course), "/academy#pricing");
  assert.equal(
    trainingCourseHref({ slug: "legacy-course", hasAccess: false }),
    "/start?goal=delivery",
  );
});
