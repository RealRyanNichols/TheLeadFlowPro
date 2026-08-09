import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

// Stripe webhook: records paid checkouts and unlocks training access.
// Needs STRIPE_WEBHOOK_SECRET (from Stripe dashboard → Webhooks) and
// SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API) in Vercel env vars.
// Endpoint to register in Stripe: https://www.theleadflowpro.com/api/stripe-webhook
// Event to send: checkout.session.completed

function verifySignature(payload: string, header: string, secret: string): boolean {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((p) => p.split("=") as [string, string])
    );
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;
    // Reject stale events (>5 min) to block replay
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${t}.${payload}`)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

async function sendPurchaseEmails(email: string, kind: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const send = (payload: object) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});

  await send({
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `💰 PURCHASE: ${kind} — ${email}`,
    text: `New purchase.\n\nProduct: ${kind}\nBuyer: ${email}\n\nAdmin: https://www.theleadflowpro.com/admin`,
  });
  await send({
    from: "Ryan Nichols <hello@theleadflowpro.com>",
    to: [email],
    reply_to: "hello@theleadflowpro.com",
    subject: "You're in. Here's your training.",
    text: [
      "Welcome to Own Your Platform.",
      "",
      "Your access is live. Here's how to get in:",
      "",
      `1. Create your login with THIS email address (${email}):`,
      "   https://www.theleadflowpro.com/login",
      "2. Head to the training area and start at the top:",
      "   https://www.theleadflowpro.com/training",
      "",
      "Work the courses in order. By the capstone you'll have your own platform live on your own domain — code in your GitHub, data in your database, nobody's hand in your pocket every month.",
      "",
      "Stuck on anything? Reply to this email. I read every one.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro | Own your platform.",
    ].join("\n"),
  });
}

export async function POST(request: Request) {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!whSecret || !serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  const payload = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";
  if (!verifySignature(payload, sig, whSecret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(payload);
    if (event.type === "checkout.session.completed") {
      const s = event.data?.object ?? {};
      const email = s.customer_details?.email ?? s.customer_email ?? "";
      const kind = s.metadata?.kind ?? "learn_it";
      if (email && s.payment_status === "paid") {
        const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
        await supabase.from("purchases").upsert(
          {
            email: email.toLowerCase(),
            kind,
            amount_cents: s.amount_total ?? null,
            stripe_session_id: s.id,
            status: "paid",
          },
          { onConflict: "stripe_session_id" }
        );
        if (kind === "event" && s.metadata?.registration_id) {
          // Paid seat → confirm the registration automatically
          await supabase
            .from("event_registrations")
            .update({ status: "confirmed" })
            .eq("id", s.metadata.registration_id);
        }
        if (kind === "learn_it") {
          await sendPurchaseEmails(email, kind);
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
}
