import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";
import { exportIdeaBrief } from "@/lib/ideaLabExport";

export async function POST(request: Request) {
  try {
    await requireOperatorAdmin();
    return exportIdeaBrief(request);
  } catch (error) {
    return Response.json(
      { error: "Sign in as an admin to export a brief." },
      {
        status: error instanceof OperatorAuthError ? error.status : 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
