import { NextResponse } from "next/server";
import { z } from "zod";
import { gradeHtml } from "@/lib/seo-grader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  url: z.string().trim().min(3).max(2048)
});

function normalizeUrl(raw: string): string | null {
  let input = raw.trim();
  if (!/^https?:\/\//i.test(input)) input = "https://" + input;
  try {
    const u = new URL(input);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a URL to grade." }, { status: 400 });
  }

  const url = normalizeUrl(parsed.data.url);
  if (!url) {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "LeadFlowProBot/1.0 (+https://theleadflowpro.com/tools/seo-grader)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: controller.signal
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Site responded with ${res.status}. Double-check the URL is live.` },
        { status: 400 }
      );
    }

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("html")) {
      return NextResponse.json(
        { error: "That URL didn't return HTML — make sure it's a webpage, not a file." },
        { status: 400 }
      );
    }

    const html = (await res.text()).slice(0, 2_000_000);
    const report = gradeHtml(res.url || url, html);
    return NextResponse.json(report);
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? "The site took too long to respond (10s limit)."
        : "Couldn't fetch that URL. It may be blocking bots, offline, or behind a login.";
    return NextResponse.json({ error: msg }, { status: 400 });
  } finally {
    clearTimeout(timeout);
  }
}
