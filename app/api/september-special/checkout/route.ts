import { NextResponse } from "next/server";
import { parseSpecialProspect } from "@/lib/septemberSpecial";
import { SpecialCheckoutError, startSpecialCheckout } from "@/lib/septemberSpecialServer";
import { BUSINESS } from "@/lib/site/business";
import { requestOrigin } from "@/lib/requestOrigin";

export const runtime = "nodejs";

const MESSAGES: Record<string, string> = {
  upcoming: "This special opens September 22 at 6 PM Central.",
  expired: "This special has ended. New checkout sessions are closed.",
  sold_out: "All five spots are paid or temporarily held in checkout. Please check again shortly.",
  existing_checkout: "A checkout is already open for this email. Complete that checkout or try again after its hold expires.",
  already_paid: "Payment is already confirmed for this reservation. We will contact you for onboarding.",
  hold_expired: "Your checkout hold expired. Try again to start a new checkout.",
  request_conflict: "This checkout attempt belongs to another email. Reload the page and try again.",
  needs_review: `Your earlier checkout needs payment verification. Please contact ${BUSINESS.email.hello} before paying again.`,
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin(request)) {
    return NextResponse.json({ error: "Please start checkout from this website." }, { status: 403 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(raw); } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const prospect = parseSpecialProspect(body);
    if (!prospect) {
      return NextResponse.json(
        { error: "Enter your name, business, city, valid email and phone, then confirm the offer terms and local service area." },
        { status: 400 },
      );
    }
    return NextResponse.json(await startSpecialCheckout(prospect), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SpecialCheckoutError) {
      return NextResponse.json(
        { code: error.code, error: MESSAGES[error.code] || "Checkout could not start. Retry this page before starting a new checkout." },
        { status: error.httpStatus },
      );
    }
    console.error("September special checkout unavailable");
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
