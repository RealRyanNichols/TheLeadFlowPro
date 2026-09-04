// The authored Markdown remains the source of truth, including its production
// notes. This projection only removes presenter instructions from learner pages.
const PRODUCTION_SECTIONS = new Set([
  "recording plan",
  "script metrics",
  "on screen hook",
  "on-screen hook",
  "facebook and instagram caption",
  "recording and editing direction",
  "production status",
  "on-screen visual and picture plan",
]);

const LEARNER_HEADINGS: Record<string, string> = {
  "main teleprompter script": "The lesson",
  "lesson video and teleprompter script": "The lesson",
  "module and purpose": "What this lesson covers",
  "lesson panel": "Key points",
};

export function learnerLessonMarkdown(
  markdown: string | null | undefined,
): string {
  const result: string[] = [];
  let hiddenLevel: number | null = null;
  let fence: { character: string; length: number } | null = null;

  for (const line of (markdown ?? "").split(/\r?\n/)) {
    // A heading inside a prompt/code sample is content, never a section boundary.
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) {
        fence = { character: marker[0], length: marker.length };
      } else if (
        marker[0] === fence.character &&
        marker.length >= fence.length &&
        !fenceMatch[2].trim()
      ) {
        fence = null;
      }
      if (hiddenLevel === null) result.push(line);
      continue;
    }
    if (fence) {
      if (hiddenLevel === null) result.push(line);
      continue;
    }

    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim().toLowerCase();
      if (hiddenLevel !== null && level <= hiddenLevel) hiddenLevel = null;
      if (hiddenLevel !== null) continue;
      // Authored production sections use H2. Do not erase a learner's nested
      // example just because it happens to discuss a recording plan.
      if (level === 2 && PRODUCTION_SECTIONS.has(title)) {
        hiddenLevel = level;
        continue;
      }
      if (level === 2 && LEARNER_HEADINGS[title]) {
        result.push(`## ${LEARNER_HEADINGS[title]}`);
        continue;
      }
    }
    if (hiddenLevel !== null) continue;
    // Retain older lesson prose while removing its production-status labels.
    if (
      /^\s*\*\*(?:Recording status|Target runtime|Teleprompter script):\*\*/i.test(
        line,
      )
    )
      continue;
    result.push(line);
  }

  return result.join("\n").trim();
}
