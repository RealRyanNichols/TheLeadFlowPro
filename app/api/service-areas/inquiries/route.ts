import { NextResponse } from "next/server";
import {
  submitServiceAreaInquiry,
  ServiceAreaStoreError,
} from "@/lib/service-areas/store";
import { ideaLabSameOrigin } from "@/lib/ideaLabHttp";
import { validateInquiry } from "@/lib/service-areas/engine";
import {
  readServiceAreaJson,
  ServiceAreaBodyError,
} from "@/lib/service-areas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!ideaLabSameOrigin(request))
    return NextResponse.json(
      { error: "Use the area request on this website." },
      { status: 403, headers },
    );
  let inquiry;
  try {
    const body = await readServiceAreaJson(
      request,
      10000,
      "Request is too large.",
    );
    if (body.website)
      return NextResponse.json(
        { error: "Request could not be accepted." },
        { status: 400, headers },
      );
    inquiry = validateInquiry(body);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Complete the area request.",
      },
      {
        status: error instanceof ServiceAreaBodyError ? error.status : 400,
        headers,
      },
    );
  }
  try {
    await submitServiceAreaInquiry(inquiry);
    // Durable private intake on the droplet. No automatic CRM delivery,
    // outgoing email/text, or public scarcity signal is claimed.
    return NextResponse.json(
      {
        ok: true,
        saved: "private_area_request",
        crmStatus: "pending_manual_handoff",
        message:
          "Your private area request is saved for our team to review. Your area is not reserved.",
      },
      { status: 201, headers },
    );
  } catch (error) {
    if (error instanceof ServiceAreaStoreError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers },
      );
    return NextResponse.json(
      {
        error:
          "We could not save your request. Please try again or contact our team.",
      },
      { status: 503, headers },
    );
  }
}
