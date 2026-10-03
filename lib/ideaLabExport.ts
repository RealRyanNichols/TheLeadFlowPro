import {
  ideaBriefMarkdown,
  validateIdeaWorkspace,
} from "./ideaLabWorkspace.ts";
import { ideaLabSameOrigin } from "./ideaLabHttp.ts";
import {
  ideaOutcomeMarkdown,
  validateIdeaOutcomeExperiment,
} from "./ideaLabOutcome.ts";

export async function exportIdeaBrief(request: Request): Promise<Response> {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (!ideaLabSameOrigin(request))
    return Response.json(
      { error: "Use Idea Lab from this website." },
      { status: 403, headers },
    );
  if (Number(request.headers.get("content-length")) > 300_000)
    return Response.json(
      { error: "Brief is too large." },
      { status: 413, headers },
    );
  try {
    const form = await request.formData();
    if (form.has("experiment")) {
      const value = form.get("experiment");
      if (
        form.has("brief") ||
        typeof value !== "string" ||
        value.length > 30_000
      )
        throw new Error("Invalid pilot report.");
      const experiment = validateIdeaOutcomeExperiment(JSON.parse(value));
      return new Response(ideaOutcomeMarkdown(experiment), {
        headers: {
          ...headers,
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="leadflow-outcome-report.md"',
        },
      });
    }
    const value = form.get("brief");
    if (typeof value !== "string" || value.length > 30_000)
      throw new Error("Invalid brief.");
    const workspace = validateIdeaWorkspace({
      version: 1,
      importedUrls: [],
      briefs: [JSON.parse(value)],
    });
    const brief = workspace.briefs[0];
    return new Response(ideaBriefMarkdown(brief), {
      headers: {
        ...headers,
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="leadflow-${brief.lane}-brief.md"`,
      },
    });
  } catch {
    return Response.json(
      { error: "Complete the draft before exporting." },
      { status: 400, headers },
    );
  }
}
