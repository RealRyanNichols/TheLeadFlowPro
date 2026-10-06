import { NextResponse } from "next/server";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";
import { ideaLabSameOrigin } from "@/lib/ideaLabHttp";
import { validateRegistry } from "@/lib/service-areas/engine";
import {
  readServiceAreaJson,
  ServiceAreaBodyError,
} from "@/lib/service-areas/http";
import {
  readServiceAreaState,
  saveServiceAreaRegistry,
  ServiceAreaStoreError,
} from "@/lib/service-areas/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
function failure(error: unknown) {
  if (error instanceof OperatorAuthError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  if (error instanceof ServiceAreaStoreError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  return NextResponse.json(
    {
      error:
        "Private territory storage is unavailable. Changes were not saved. Check the droplet data directory.",
    },
    { status: 503, headers },
  );
}
export async function GET() {
  try {
    await requireOperatorAdmin();
    const state = await readServiceAreaState();
    if (!state)
      throw new ServiceAreaStoreError(
        "Initialize the private droplet territory register before using the editor.",
      );
    return NextResponse.json(
      {
        registry: state.registry,
        revision: state.revision,
        inquiries: [...state.inquiries]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 200),
      },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const { user } = await requireOperatorAdmin();
    if (!ideaLabSameOrigin(request))
      return NextResponse.json(
        { error: "Save from the LeadFlow website." },
        { status: 403, headers },
      );
    let registry, revision;
    try {
      const b = await readServiceAreaJson(
        request,
        450000,
        "Registry is too large.",
      );
      registry = validateRegistry(b.registry);
      const requestedRevision = b.revision;
      if (
        typeof requestedRevision !== "number" ||
        !Number.isSafeInteger(requestedRevision) ||
        requestedRevision < 0
      )
        throw new Error("Invalid registry revision.");
      revision = requestedRevision;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid registry." },
        {
          status: error instanceof ServiceAreaBodyError ? error.status : 400,
          headers,
        },
      );
    }
    // The private store serializes the revision check, linked-inquiry consent
    // validation, register update, and audit snapshot in one durable write.
    const savedRevision = await saveServiceAreaRegistry(
      registry,
      revision,
      user.id,
    );
    return NextResponse.json({ revision: savedRevision }, { headers });
  } catch (error) {
    return failure(error);
  }
}
// Pure imports above are also used by the UI's conflict preview; no mutation
// occurs when an operator merely previews an area.
