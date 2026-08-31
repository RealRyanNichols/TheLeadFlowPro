import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { OPERATOR_ACADEMY_COURSES, EXPANSION_COURSES } from "../lib/operatorAcademyCatalog.ts";
import { CHATGPT_OPERATOR_LESSONS } from "../lib/chatgptOperatorCourse.ts";
import { CONTENT_ENGINE_LESSONS } from "../lib/contentEngineCourse.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expansion = new Map(EXPANSION_COURSES.map((course) => [course.slug, course]));
const courses = OPERATOR_ACADEMY_COURSES.map((course) => {
  let lessons = expansion.get(course.slug)?.lessons ?? [];
  if (course.slug === "chatgpt-operator") {
    lessons = CHATGPT_OPERATOR_LESSONS.map((item) => ({
      ...item,
      outcome: `Complete the ${item.title.toLowerCase()} workflow and save evidence of the result.`,
      method: ["Define the intended result", "Run the working prompt", "Review and revise the output"],
      prompt: "Use the exact working prompt inside this lesson, replace every bracketed field with approved facts, and ask ChatGPT to identify missing information before drafting.",
      assignment: item.deliverable ? `Build and submit the ${item.deliverableTitle}.` : `Complete the ${item.title.toLowerCase()} practice and save the before-and-after result.`,
      reviewCriteria: "The output follows the brief, uses approved facts, and has been checked before use.",
      download: "ChatGPT Operator workbook page",
      visual: "ChatGPT operator workflow",
    }));
  }
  if (course.slug === "content-engine") {
    lessons = CONTENT_ENGINE_LESSONS.map((item) => ({
      ...item,
      outcome: `Complete the ${item.title.toLowerCase()} content-system step and save the working asset.`,
      method: ["Give the content one job", "Create the camera-ready asset", "Connect it to an owned next action"],
      prompt: "Use the lesson script and worksheet to turn one approved business idea into a camera-ready asset with one audience, one useful promise, and one measurable next action.",
      assignment: `Complete and save the ${item.title.toLowerCase()} assignment from the lesson.`,
      reviewCriteria: "The content is useful on its own, source-backed, in the operator's voice, and connected to one owned next action.",
      download: "Content Engine workbook page",
      visual: "Content source to owned destination",
    }));
  }
  return { ...course, lessons };
});
const directory = path.join(root, "tmp");
mkdirSync(directory, { recursive: true });
writeFileSync(path.join(directory, "academy-workbook-data.json"), JSON.stringify(courses, null, 2));
console.log(`Exported ${courses.length} courses for workbook generation.`);
