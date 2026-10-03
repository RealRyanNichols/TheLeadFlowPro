import { NextResponse } from "next/server";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";
import {
  emptyIdeaWorkspace,
  validateIdeaWorkspace,
} from "@/lib/ideaLabWorkspace";
import { ideaLabSameOrigin } from "@/lib/ideaLabHttp";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
function invalidWorkspace(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Invalid workspace." },
    { status: 400, headers },
  );
}
function failure(error: unknown) {
  if (error instanceof OperatorAuthError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  return NextResponse.json(
    {
      error:
        "Idea Lab storage is unavailable. Your changes have not been saved. Ask the operator to check the Idea Lab migration.",
    },
    { status: 503, headers },
  );
}

export async function GET() {
  try {
    const { user, supabase } = await requireOperatorAdmin();
    const { data, error } = await supabase
      .from("idea_lab_states")
      .select("document,revision")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) return failure(error);
    return NextResponse.json(
      {
        workspace: data
          ? validateIdeaWorkspace(data.document)
          : emptyIdeaWorkspace(),
        revision: data?.revision ?? 0,
      },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { user, supabase } = await requireOperatorAdmin();
    if (!ideaLabSameOrigin(request))
      return NextResponse.json(
        { error: "Use Idea Lab from this website." },
        { status: 403, headers },
      );
    const text = await request.text();
    if (text.length > 200_000)
      return NextResponse.json(
        { error: "Workspace is too large." },
        { status: 413, headers },
      );
    let workspace;
    let revision;
    try {
      const body = JSON.parse(text);
      workspace = validateIdeaWorkspace(body.workspace);
      revision = body.revision;
      if (!Number.isSafeInteger(revision) || revision < 0)
        throw new Error("Invalid workspace revision.");
    } catch (error) {
      return invalidWorkspace(error);
    }
    // Older clients do not know about pilots and omit them when saving a brief.
    // Read only this owner's row; the RPC still enforces the supplied revision.
    if (workspace.experiments === undefined) {
      const { data: current, error: readError } = await supabase
        .from("idea_lab_states")
        .select("document,revision")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (readError) return failure(readError);
      if (current) {
        const stored = validateIdeaWorkspace(current.document);
        if (stored.experiments !== undefined) {
          try {
            workspace = validateIdeaWorkspace({
              ...workspace,
              experiments: stored.experiments,
            });
          } catch (error) {
            return invalidWorkspace(error);
          }
        }
      }
    }
    const { data, error } = await supabase.rpc("save_idea_lab_state", {
      p_owner: user.id,
      p_document: workspace,
      p_revision: revision,
    });
    if (error?.code === "40001")
      return NextResponse.json(
        {
          error:
            "This workspace changed in another tab. Reload before saving; download your draft first to keep your edits.",
        },
        { status: 409, headers },
      );
    if (error) return failure(error);
    return NextResponse.json({ revision: data }, { headers });
  } catch (error) {
    return failure(error);
  }
}
