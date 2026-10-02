import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  IDEA_KPIS,
  IDEA_SOURCES,
  IDEA_WORKSTREAMS,
  buildIdeaPacket,
  importIdeaLinks,
  modelIdeaEconomics,
} from "../lib/ideaLab.ts";

// Local, deterministic export. Never calls an LLM, scrapes bookmarks, sends,
// deploys, collects payment, or enables a background process.
async function main() {
  const args = process.argv.slice(2);
  const command = args.shift() ?? "summary";
  if (command === "summary") {
    console.log(
      JSON.stringify(
        {
          reviewedPosts: IDEA_SOURCES.length,
          workstreams: IDEA_WORKSTREAMS.length,
          productStatus: "specifications_only",
          execution: "dry_run",
          sources: IDEA_SOURCES.map(({ author, id, title, lanes }) => ({
            author,
            id,
            title,
            lanes,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (command === "import") {
    const file = args[0];
    if (!file)
      throw new Error("Usage: idea-lab.ts import /absolute/path/bookmarks.txt");
    if ((await stat(file)).size > 100_000)
      throw new Error("Import file is too large.");
    const result = importIdeaLinks(await readFile(file, "utf8"));
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command !== "export" || !args[0])
    throw new Error(
      "Usage: idea-lab.ts summary | import <links.txt> | export <new-directory>",
    );
  const output = path.resolve(args[0]);
  // Requiring a new directory avoids overwriting another team's review packet.
  await mkdir(output, { mode: 0o700 });
  const packets = IDEA_WORKSTREAMS.map((item) => buildIdeaPacket(item.id));
  await writeFile(
    path.join(output, "reviewed-ideas.json"),
    JSON.stringify(
      {
        reviewedOn: "2026-09-30",
        sources: IDEA_SOURCES,
        packets,
        kpis: IDEA_KPIS,
        mediaScope:
          "Post text and quoted-post previews were read; linked courses, lectures, apps, and full videos were not audited.",
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  for (const packet of packets) {
    const item = packet.workstream;
    const section = (name: string, entries: readonly string[]) =>
      `\n## ${name}\n\n${entries.map((entry) => `- ${entry}`).join("\n")}\n`;
    const text =
      `# ${item.name}\n\nStatus: specification ready; product not built.\n\nBuyer: ${item.buyer}.\n\nOutcome: ${item.outcome}\n\nOwner: ${item.owner}.\n\nExisting target: \`${item.existingTarget}\`.\n\nCommercial path: ${item.commercialPath}\n` +
      section("Required inputs", item.requiredInputs) +
      section("Deliverables", item.deliverables) +
      section("Acceptance", item.acceptance) +
      section("Next three moves", item.nextMoves) +
      section(
        "Sources and limits",
        packet.sources.map(
          (entry) =>
            `[${entry.author}: ${entry.title}](${entry.url}) — ${entry.caveat}`,
        ),
      ) +
      "\n## Execution\n\nDry run. Budget: $0. Maximum two workers and two attempts per task. External actions remain in the existing approval queue. This packet does not start an agent or background process.\n";
    await writeFile(path.join(output, `${item.id}.md`), text, { mode: 0o600 });
  }
  const scenarios = [0, 0.05, 0.1].map((churn) => ({
    assumptions: {
      dailyPermissionedOpportunities: 1000,
      activeDaysPerMonth: 30,
      conversionRate: 0.001,
      monthlyPriceUsd: 99,
      monthlyChurnRate: churn,
    },
    result: modelIdeaEconomics({
      months: 12,
      startingCustomers: 0,
      newCustomersPerMonth: 30,
      monthlyPriceUsd: 99,
      monthlyChurnRate: churn,
      variableCostPerCustomerUsd: 20,
      supportHoursPerCustomer: 0.5,
      hourlyCostUsd: 30,
      fixedCostUsd: 100,
      acquisitionCostPerCustomerUsd: 50,
    }),
  }));
  await writeFile(
    path.join(output, "scenario-check.json"),
    JSON.stringify(
      {
        label:
          "Illustration of assumptions in the TristenPalori post; not a LeadFlow forecast or approved offer.",
        costAssumptions:
          "Illustrative only: $20 customer cost, 0.5 support hours/customer, $30/hour, $100 fixed cost, $50 acquisition/customer.",
        scenarios,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  const overview =
    `# LeadFlow saved ideas — September 30, 2026\n\nAll 23 supplied post texts were read through the signed-in X browser. This is an evidence-linked implementation specification, not a record of 11 finished products, deployments, sales, or successful autonomous agents.\n\n` +
    "## First build sequence\n\nBusiness AI Concierge → original Tool Studio interaction → private website preview → shared source library and workflow controls. Existing client demand and measured delivery effort must determine commercial priority; no demand ranking is inferred from X engagement.\n\n" +
    "## All supplied sources\n\n" +
    IDEA_SOURCES.map(
      (entry, index) =>
        `### ${index + 1}. ${entry.title}\n\n[${entry.author}](${entry.url}) · Posted ${entry.postedOn} · Text reviewed ${entry.reviewedOn}.\n\nLesson: ${entry.lesson}\n\nLeadFlow application: ${entry.application}\n\nLimit: ${entry.caveat}\n\n`,
    ).join("") +
    "## Work packets\n\n" +
    IDEA_WORKSTREAMS.map(
      (item) =>
        `- [${item.name}](${item.id}.md) — ${item.priority}; ${item.owner}.`,
    ).join("\n") +
    "\n\n## Measurement\n\n" +
    IDEA_KPIS.map(
      (item) =>
        `- **${item.name}:** ${item.definition} Source: ${item.source}. Current measured value: unavailable.`,
    ).join("\n") +
    "\n\n## Scenario check\n\nThe website post's assumptions imply 30 new customers/month and 360 customers after 12 months at zero churn: $35,640 monthly gross revenue. It does not establish profit or actual conversion. scenario-check.json adds 5% and 10% monthly churn plus explicitly illustrative operating costs and support hours. No bulk outreach is enabled.\n\n## Build boundary\n\nThe current code implements URL ingestion/deduplication, source mapping, packet generation, bounded workflow transitions, evidence-based release readiness, and scenario arithmetic. Client products, native voice processing, hosted persistence, provider execution, dataset entitlements, and payment adapters remain separate implementation work.\n";
  await writeFile(path.join(output, "README.md"), overview, { mode: 0o600 });
  console.log(
    JSON.stringify(
      {
        output,
        reviewedPosts: IDEA_SOURCES.length,
        workPackets: packets.length,
        status: "exported_specifications",
        externalActions: 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Idea Lab export failed.",
  );
  process.exitCode = 1;
});
