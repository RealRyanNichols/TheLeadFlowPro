import { NextResponse } from "next/server";
import { cancelSpecialCheckout, SpecialCheckoutError } from "@/lib/septemberSpecialServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Use the checkout website." }, { status: 403 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 1024) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const body = JSON.parse(raw);
    const result = await cancelSpecialCheckout(
      typeof body?.request_id === "string" ? body.request_id : "",
      typeof body?.session_id === "string" ? body.session_id : "",
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: "The checkout could not be released. A completed payment is never cancelled here." },
      { status: error instanceof SpecialCheckoutError ? error.httpStatus : 503 },
    );
  }
}
