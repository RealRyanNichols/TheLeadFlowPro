// The Longview directory gate. Runs before every build.
//
// Run: npm run validate:directory
//
// A new batch reaches the website only through a pull request that commits
// content/longview-directory/directory.json. The site already drops any record
// that breaks the publish contract, but a silent drop would hide an engine
// bug behind a shorter list. This script turns every drop into a failed
// build, and also refuses a sample (fictional) file, a schema version the site
// does not know, a slug collision, an unreadable removal list, and a removal
// entry that is neither a business id nor a profile slug.

import { fileURLToPath } from "node:url";
import { committedDirectoryFile, readDirectory, suppressionsFile, type DirectoryReport } from "../lib/longviewDirectory/data.ts";

export function directoryProblems(report: DirectoryReport): string[] {
  const problems = [...report.issues];
  if (report.directory.sample) problems.push("the file is marked sample: true (fictional data must never be committed)");
  for (const drop of report.dropped) {
    problems.push(
      drop.reason === "duplicate_slug"
        ? `${drop.id}: slug collision with an earlier business`
        : `${drop.id}: dropped (${drop.reason})`,
    );
  }
  return problems;
}

/** Worth a look but not a failed build: a removal entry that hides nothing in this batch. */
export function directoryWarnings(report: DirectoryReport): string[] {
  return report.unmatchedSuppressions.map(
    (entry) => `suppressions.json: ${JSON.stringify(entry)} matches no business in this batch (check the id or slug)`,
  );
}

export function directorySummary(report: DirectoryReport): string {
  const d = report.directory;
  return [
    `schemaVersion ${d.schemaVersion}, batch ${d.batchId ?? "none"}, indexable ${d.indexable}, sample ${d.sample}`,
    `${report.rawCount} in file, ${d.businesses.length} published, ${report.dropped.length} dropped, ${report.suppressed.length} hidden by suppressions.json`,
    `${d.categories.length} categories: ${d.categories.map((c) => `${c.slug} ${c.count}`).join(", ") || "none"}`,
  ].join("\n  ");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const report = readDirectory(committedDirectoryFile(), suppressionsFile());
  const problems = directoryProblems(report);
  for (const warning of directoryWarnings(report)) console.warn(`validate:directory warning: ${warning}`);
  if (problems.length) {
    console.error(`\nvalidate:directory found ${problems.length} problem${problems.length === 1 ? "" : "s"} in content/longview-directory:\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(`\n  ${directorySummary(report)}\n`);
    console.error("Fix the export on the droplet (or the record) and commit a clean batch. The site never repairs a record.\n");
    process.exit(1);
  }
  console.log(`validate:directory: the committed batch passes the publish contract.\n  ${directorySummary(report)}`);
}
