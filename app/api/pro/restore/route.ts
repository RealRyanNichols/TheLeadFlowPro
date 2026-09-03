import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import {
  PRO_ACCESS_COOKIE,
  isPlausibleEmail,
  isProKind,
  licenseKey,
  mergeProAccess,
  normalizeEmail,
  normalizeLicenseKey,
  proAccessSecrets,
  proKindSlug,
  signProAccess,
  verifyLicenseKey,
  verifyProAccess,
} from "@/lib/proAccess";
import { proAccessCookieOptions } from "@/lib/proAccessServer";
import { PRO_BUNDLE, allProKinds, getProTool } from "@/lib/tools/pro";

// Restore access on another device.
//
// Two shapes of request:
//   { email, key }  -> the key is checked against every kind for that email.
//                      Matches become the access cookie. No database needed.
//   { email }       -> the purchase rows for that email are looked up and the
//                      keys re-sent. The response is the same whether or not
//                      anything was found, so this cannot be used to test
//                      which emails have bought something.

const SITE = "https://www.theleadflowpro.com";

function kitName(kind: string): string {
  if (kind === PRO_BUNDLE.kind) return PRO_BUNDLE.name;
  const slug = proKindSlug(kind);
  return (slug && getProTool(slug)?.name) || kind;
}

function kitPath(kind: string): string {
  const slug = proKindSlug(kind);
  return kind === PRO_BUNDLE.kind || !slug ? "/tools/pro" : `/tools/pro/${slug}`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; key?: unknown };
  const email = normalizeEmail(body.email);
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "Enter the email you used at checkout." }, { status: 400 });
  }
  const secrets = proAccessSecrets();
  if (secrets.length === 0) {
    return NextResponse.json(
      { error: "Access restore is not configured yet. Email hello@theleadflowpro.com and we will unlock you by hand." },
      { status: 503 },
    );
  }

  const key = normalizeLicenseKey(body.key);
  if (typeof body.key === "string" && body.key.trim() && !key) {
    return NextResponse.json({ error: "That does not look like a key. It reads LFP-XXXX-XXXX-XXXX-XXXX." }, { status: 400 });
  }

  if (key) {
    const granted = allProKinds().filter((kind) => verifyLicenseKey(email, kind, key, secrets));
    if (granted.length === 0) {
      return NextResponse.json(
        { error: "That key does not match this email. Check both, or ask for the key to be re-sent." },
        { status: 403 },
      );
    }
    const existing = verifyProAccess(
      request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${PRO_ACCESS_COOKIE}=([^;]+)`))?.[1],
      secrets,
    );
    const token = signProAccess(mergeProAccess(existing, email, granted), secrets[0]);
    const res = NextResponse.json({
      ok: true,
      kinds: granted,
      names: granted.map(kitName),
      next: kitPath(granted[0]),
    });
    res.cookies.set(PRO_ACCESS_COOKIE, token, proAccessCookieOptions());
    return res;
  }

  // Re-send the keys. Needs the purchase rows and a mail provider.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!serviceKey || !resendKey) {
    return NextResponse.json(
      { error: "Key recovery by email is not switched on yet. Email hello@theleadflowpro.com with the email you paid with." },
      { status: 503 },
    );
  }

  try {
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("purchases")
      .select("kind")
      .ilike("email", email.replace(/[\\%_]/g, (c) => `\\${c}`))
      .eq("status", "paid")
      .like("kind", "pro_%");
    const kinds = [...new Set((data ?? []).map((r) => String(r.kind)).filter(isProKind))];

    if (kinds.length > 0) {
      const lines = kinds.map((kind) => {
        const k = licenseKey(email, kind, secrets[0]);
        return [
          `${kitName(kind)}`,
          `  Key: ${k}`,
          `  Open: ${SITE}${kitPath(kind)}`,
          `  One-tap restore: ${SITE}/tools/pro/unlock?email=${encodeURIComponent(email)}&key=${encodeURIComponent(k)}`,
        ].join("\n");
      });
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "The LeadFlow Pro <hello@theleadflowpro.com>",
          to: [email],
          reply_to: "hello@theleadflowpro.com",
          subject: "Your Pro Kit access keys",
          text: [
            "Here are the keys for every kit bought with this email.",
            "",
            ...lines,
            "",
            "Paste a key with this email at the restore page on any device and the kit unlocks there too.",
            "",
            "Ryan Nichols",
            "The LeadFlow Pro",
          ].join("\n\n"),
        }),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}`);
    }
  } catch (error) {
    console.error("Pro key re-send failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not send right now. Try again in a minute." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent: true });
}
