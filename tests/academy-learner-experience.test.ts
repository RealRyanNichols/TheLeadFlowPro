import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { learnerLessonMarkdown } from "../lib/academyLessonPresentation";
import {
  EXPANSION_COURSES,
  OPERATOR_ACADEMY_COURSES,
} from "../lib/operatorAcademyCatalog";
import {
  expansionFinalQuestions,
  expansionLessonQuestions,
} from "../lib/operatorAcademyAssessments";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("learner rendering hides production sections and descendants without altering the source", () => {
  const source =
    "# Lesson\n\n## Worked example\nUseful example.\n\n## Recording plan\nPrivate presenter notes.\n### Camera\nMore notes.\n## Downloadable\n[Workbook](/downloads/example.pdf)\n## Lesson check\nKeep this.";
  const original = source;
  const rendered = learnerLessonMarkdown(source);
  assert.match(rendered, /Useful example/);
  assert.match(rendered, /\[Workbook\]\(\/downloads\/example.pdf\)/);
  assert.match(rendered, /## Lesson check\nKeep this/);
  assert.doesNotMatch(
    rendered,
    /Private presenter|More notes|## Recording plan/,
  );
  assert.equal(source, original);
});

test("headings inside fenced prompts remain intact and cannot reveal hidden production notes", () => {
  const prompt =
    "~~~text\n## Recording plan\nKeep this example.\n\n\n## Assignment\n~~~";
  const rendered = learnerLessonMarkdown(
    `## Exact working prompt\n${prompt}\n## Recording plan\n~~~text\n## Downloadable\nStill hidden.\n~~~\n## Pass standard\nVisible.`,
  );
  assert.ok(rendered.includes(prompt));
  assert.doesNotMatch(rendered, /Still hidden/);
  assert.match(rendered, /## Pass standard\nVisible/);
});

test("Content Engine lesson prose is retained while presenter headings and metadata are removed", () => {
  const rendered = learnerLessonMarkdown(
    "## Module and purpose\nA useful outcome.\n## Main Teleprompter script\nThe actual teaching.\n## Script metrics\nTarget pace: 115\n## Lesson panel\nOne person.\n## Assignment\nWrite your offer.\n## Recording and editing direction\nPoint at the camera.\n## Production status\nNot recorded.",
  );
  assert.match(rendered, /## The lesson\nThe actual teaching/);
  assert.match(rendered, /## Key points\nOne person/);
  assert.match(rendered, /## Assignment\nWrite your offer/);
  assert.doesNotMatch(rendered, /Target pace|Point at the camera|Not recorded/);
  assert.equal(learnerLessonMarkdown(null), "");
});

test("all authored academy lessons retain their instruction, examples, prompts and workbook links", () => {
  const directory = path.join(root, "content/academy");
  let count = 0;
  for (const course of readdirSync(directory, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory(),
  )) {
    for (const file of readdirSync(path.join(directory, course.name)).filter(
      (name) => /^\d\d-.*\.md$/.test(name),
    )) {
      const source = readFileSync(
        path.join(directory, course.name, file),
        "utf8",
      );
      const rendered = learnerLessonMarkdown(source);
      const label = `${course.name}/${file}`;
      for (const heading of [
        "## The lesson",
        "## Worked example",
        "## Exact working prompt",
        "## Assignment and evidence",
        "## Downloadable",
      ]) {
        assert.ok(rendered.includes(heading), `${label}: ${heading}`);
      }
      assert.ok(
        rendered.length > source.length * 0.7,
        `${label}: substantive content retained`,
      );
      for (const codeBlock of source.match(/```[\s\S]*?```/g) ?? [])
        assert.ok(rendered.includes(codeBlock), `${label}: prompt unchanged`);
      for (const download of source.match(/\]\(\/downloads\/[^)]+\)/g) ?? [])
        assert.ok(rendered.includes(download), `${label}: download retained`);
      assert.doesNotMatch(rendered, /^## Recording plan\s*$/m, label);
      count += 1;
    }
  }
  assert.equal(count, 76);
});

test("all ten advertised workbooks remain real PDF assets at their existing paths", () => {
  assert.equal(OPERATOR_ACADEMY_COURSES.length, 10);
  for (const course of OPERATOR_ACADEMY_COURSES) {
    const bytes = readFileSync(
      path.join(
        root,
        `public/downloads/operator-academy/${course.slug}-workbook.pdf`,
      ),
    );
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-", course.slug);
    assert.ok(bytes.length > 1000, course.slug);
  }
});

test("all twelve Content Engine lessons retain their teaching and assignment after presentation cleanup", () => {
  const seed = readFileSync(
    path.join(
      root,
      "supabase/migrations/20260830023709_content_engine_course.sql",
    ),
    "utf8",
  );
  const lessons = [
    ...seed.matchAll(
      /\$content_engine_lesson\$([\s\S]*?)\$content_engine_lesson\$/g,
    ),
  ];
  assert.equal(lessons.length, 12);
  for (const [, source] of lessons) {
    const rendered = learnerLessonMarkdown(source);
    const teaching = source
      .split("## Main Teleprompter script\n")[1]
      .split("## Script metrics")[0]
      .trim();
    const assignment = source
      .split("## Assignment\n")[1]
      .split("## Facebook and Instagram caption")[0]
      .trim();
    assert.ok(rendered.includes(teaching));
    assert.ok(rendered.includes(assignment));
    assert.match(rendered, /## The lesson/);
    assert.doesNotMatch(
      rendered,
      /^## (?:Script metrics|Production status|Recording and editing direction)$/m,
    );
  }
});

test("expansion answer order is stable, retains correct meaning, and cannot be passed by all-first answers", () => {
  for (const course of EXPANSION_COURSES) {
    const positions = new Set<number>();
    for (const lesson of course.lessons) {
      const questions = expansionLessonQuestions(course.slug, lesson.slug)!;
      assert.deepEqual(
        questions,
        expansionLessonQuestions(course.slug, lesson.slug),
      );
      const correctMeanings = [
        lesson.outcome,
        lesson.reviewCriteria,
        lesson.assignment,
      ];
      questions.forEach((question, index) => {
        assert.equal(
          question.options[question.answer_index],
          correctMeanings[index],
        );
        assert.equal(new Set(question.options).size, 4);
        positions.add(question.answer_index);
      });
      assert.ok(
        questions.filter((question) => question.answer_index === 0).length /
          questions.length <
          0.8,
      );
    }
    assert.equal(positions.size, 4, course.slug);
    const final = expansionFinalQuestions(course.slug)!;
    assert.equal(final.length, 16);
    assert.ok(
      final.filter((question) => question.answer_index === 0).length /
        final.length <
        0.8,
      course.slug,
    );
    assert.deepEqual(
      final,
      course.lessons.flatMap((lesson) =>
        expansionLessonQuestions(course.slug, lesson.slug)!.slice(0, 2),
      ),
    );
  }
  assert.equal(expansionLessonQuestions("unknown", "unknown"), null);
});
