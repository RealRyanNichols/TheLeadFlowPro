import {
  canonicalPostUrl,
  IDEA_SOURCES,
  IDEA_WORKSTREAMS,
  type IdeaLane,
  type IdeaSource,
} from "./ideaLab.ts";

export type IdeaBrief = {
  lane: IdeaLane;
  buyer: string;
  outcome: string;
  scope: string;
  acceptance: string;
  queued: boolean;
};
export type IdeaWorkspace = {
  version: 1;
  importedUrls: string[];
  briefs: IdeaBrief[];
};
export const emptyIdeaWorkspace = (): IdeaWorkspace => ({
  version: 1,
  importedUrls: [],
  briefs: [],
});

/** Keep unreviewed imports as URLs, never as fabricated source text or claims. */
export function validateIdeaWorkspace(value: unknown): IdeaWorkspace {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("A workspace is required.");
  const document = value as Record<string, unknown>;
  if (
    document.version !== 1 ||
    !Array.isArray(document.importedUrls) ||
    !Array.isArray(document.briefs)
  )
    throw new Error("Unsupported workspace format.");
  if (
    document.importedUrls.length > 500 ||
    document.briefs.length > IDEA_WORKSTREAMS.length
  )
    throw new Error("Workspace limit reached.");
  const known = new Set(IDEA_SOURCES.map((source) => source.id));
  const importedUrls = document.importedUrls.map((url) => {
    const parsed = typeof url === "string" ? canonicalPostUrl(url) : null;
    if (!parsed || known.has(parsed.id))
      throw new Error("Imports must contain unique new X post URLs.");
    known.add(parsed.id);
    return parsed.url;
  });
  const lanes = new Set<string>();
  const briefs = document.briefs.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error("Invalid brief.");
    const brief = item as Record<string, unknown>;
    if (
      typeof brief.lane !== "string" ||
      !IDEA_WORKSTREAMS.some((workstream) => workstream.id === brief.lane) ||
      lanes.has(brief.lane)
    )
      throw new Error("Invalid or duplicate workstream.");
    lanes.add(brief.lane);
    for (const key of ["buyer", "outcome", "scope", "acceptance"] as const) {
      if (typeof brief[key] !== "string" || brief[key].length > 6000)
        throw new Error("Brief fields must be text under 6,000 characters.");
    }
    if (typeof brief.queued !== "boolean")
      throw new Error("Invalid queue state.");
    if (
      brief.queued &&
      [brief.buyer, brief.outcome, brief.scope, brief.acceptance].some(
        (field) => !(field as string).trim(),
      )
    )
      throw new Error("Complete the brief before adding it to the queue.");
    return {
      lane: brief.lane as IdeaLane,
      buyer: brief.buyer as string,
      outcome: brief.outcome as string,
      scope: brief.scope as string,
      acceptance: brief.acceptance as string,
      queued: brief.queued,
    };
  });
  const result: IdeaWorkspace = { version: 1, importedUrls, briefs };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 190_000)
    throw new Error(
      "Workspace storage limit reached. Download completed briefs before adding more text.",
    );
  return result;
}

export function workspaceSources(workspace: IdeaWorkspace): IdeaSource[] {
  return [
    ...IDEA_SOURCES,
    ...workspace.importedUrls.map((url) => {
      const parsed = canonicalPostUrl(url)!;
      return {
        ...parsed,
        title: "Source review needed",
        postedOn: "",
        reviewedOn: null,
        review: "awaiting_review" as const,
        lesson: "",
        application: "",
        caveat:
          "Read the post and verify its claims before using it in a build.",
        lanes: [],
        primarySources: [],
      };
    }),
  ];
}

export function defaultIdeaBrief(lane: IdeaLane): IdeaBrief {
  const workstream = IDEA_WORKSTREAMS.find((item) => item.id === lane)!;
  return {
    lane,
    buyer: workstream.buyer,
    outcome: workstream.outcome,
    scope: workstream.deliverables.join("\n"),
    acceptance: workstream.acceptance.join("\n"),
    queued: false,
  };
}

export function ideaBriefMarkdown(brief: IdeaBrief): string {
  const workstream = IDEA_WORKSTREAMS.find((item) => item.id === brief.lane)!;
  return [
    `# ${workstream.name}`,
    "",
    "Status: draft specification. Product implementation and verification are pending.",
    "",
    "## Buyer",
    brief.buyer,
    "",
    "## Result",
    brief.outcome,
    "",
    "## Build scope",
    brief.scope,
    "",
    "## Acceptance to verify",
    brief.acceptance,
    "",
    `Owner: ${workstream.owner}`,
    "",
    "## Sources",
    ...IDEA_SOURCES.filter((source) => source.lanes.includes(brief.lane)).map(
      (source) =>
        `- ${source.title} — @${source.author}: ${source.url}\n  Caveat: ${source.caveat}`,
    ),
    "",
    "External execution: disabled. Deployment, sending, prices, and spending need separate approval.",
    "",
  ].join("\n");
}
