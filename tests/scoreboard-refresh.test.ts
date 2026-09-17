import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The scoreboard is refreshed on a schedule, not only by whoever happens to
// visit after the ISR window. These pins keep the three pieces in step: the
// cron entry, the purge route, and the page/fetch cache settings it relies on.

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative: string) => readFile(path.join(root, relative), "utf8");

test("a cron purges the scoreboard pages every 10 minutes", async () => {
  const vercel = JSON.parse(await read("vercel.json")) as { crons: Array<{ path: string; schedule: string }> };
  assert.deepEqual(
    vercel.crons.find((cron) => cron.path === "/api/revalidate-scoreboard"),
    { path: "/api/revalidate-scoreboard", schedule: "*/10 * * * *" },
  );
  const route = await read("app/api/revalidate-scoreboard/route.ts");
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /`Bearer \$\{cronSecret\}`/);
  assert.match(route, /status:\s*401/);
  assert.match(route, /revalidatePath\(/);
  assert.match(route, /"\/scoreboard"/);
  assert.match(route, /`\/scoreboard\/\$\{business\.slug\}`/);
});

test("the pages keep a short ISR backstop and the feeds add no second cache window", async () => {
  for (const page of [
    "app/scoreboard/page.tsx",
    "app/scoreboard/[business]/page.tsx",
    "app/scoreboard/metrics/[metric]/page.tsx",
  ]) {
    assert.match(await read(page), /export const revalidate = 300;/, page);
  }
  for (const lib of ["lib/scoreboardFeeds.ts", "lib/scoreboardCaptureFeeds.ts"]) {
    // Code only; the comments in these files explain exactly the options they must not use.
    const source = (await read(lib)).replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(source, /next:\s*\{\s*revalidate/, `${lib} stacks a fetch cache on the page cache`);
    // In Next 15 a no-store fetch marks the whole route dynamic and turns ISR off.
    assert.doesNotMatch(source, /cache:\s*["']no-store["']/, `${lib} would make the scoreboard routes dynamic`);
    assert.doesNotMatch(source, /revalidate:\s*0/, `${lib} would make the scoreboard routes dynamic`);
  }
});

test("the index page carries an observed stamp from the feeds, not the render", async () => {
  const page = await read("app/scoreboard/page.tsx");
  assert.match(page, /oldestObservation\(results\)/);
  assert.match(page, /feedObservationLabel\(observedAt\)/);
  assert.doesNotMatch(page, /feedObservationLabel\(new Date\(\)/);
});
