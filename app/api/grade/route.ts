import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import {
  normalizeGradeUrl,
  resolvesPublicly,
  runHtmlChecks,
  runPagespeed,
  searchReadinessScore,
  leadReadinessScore,
  overallScore,
  type GradeScores,
  type HtmlChecks,
} from "@/lib/analytics/grader";

// The /live website grader. Grades the visitor's site with Google's public
// Lighthouse API plus our own HTML checks, re-grades this site on the same
// scale, and returns the running average of every site graded here. Stores
// only the domain and its scores — nothing about the visitor.

export const maxDuration = 60;

const REFERENCE_HOST = "www.theleadflowpro.com";
const REFERENCE_URL = "https://www.theleadflowpro.com/";
const CACHE_HOURS = 24;
const MIN_SITES_FOR_AVERAGE = 5;

// Burst guard per IP; the 24h per-host cache is the real quota protection.
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + 60_000 });
    if (buckets.size > 2000) buckets.clear();
    return false;
  }
  b.count += 1;
  return b.count > 4;
}

type StoredGrade = {
  host: string;
  url: string;
  checked_at: string;
  scores: GradeScores;
  checks: Partial<HtmlChecks>;
};

async function gradeSite(url: string, host: string): Promise<StoredGrade | { error: string }> {
  const htmlResult = await runHtmlChecks(url, host);
  if (!htmlResult) {
    return { error: "Could not reach that site. Check the address and try again." };
  }

  let lighthouse = {
    performance: null as number | null,
    seo: null as number | null,
    accessibility: null as number | null,
    best_practices: null as number | null,
    lcp_s: null as number | null,
  };
  try {
    lighthouse = await runPagespeed(htmlResult.finalUrl);
  } catch {
    // Lighthouse unavailable (quota/timeout). The grade is computed from
    // what WAS measured and the UI labels the missing rows — never padded.
  }

  const search = searchReadinessScore(htmlResult.checks);
  const lead = leadReadinessScore(htmlResult.checks);
  const { overall, letter } = overallScore({
    ...lighthouse,
    search_readiness: search,
    lead_readiness: lead,
  });

  return {
    host,
    url: htmlResult.finalUrl,
    checked_at: new Date().toISOString(),
    scores: { ...lighthouse, search_readiness: search, lead_readiness: lead, overall, letter },
    checks: htmlResult.checks,
  };
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many checks at once — give it a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = normalizeGradeUrl(String(body?.url ?? ""));
    if (parsed.error || !parsed.url || !parsed.host) {
      return NextResponse.json({ error: parsed.error ?? "Bad address." }, { status: 400 });
    }
    if (!(await resolvesPublicly(parsed.host))) {
      return NextResponse.json(
        { error: "That domain doesn't resolve to a public website." },
        { status: 400 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY);
    const canStore = !!serviceKey;
    const cacheCutoff = new Date(Date.now() - CACHE_HOURS * 3600e3).toISOString();

    // ---- visitor's site (cached per host for 24h) ----
    let theirs: StoredGrade | null = null;
    if (canStore) {
      const { data: cached } = await supabase
        .from("site_grades")
        .select("host, url, checked_at, scores, checks")
        .eq("host", parsed.host)
        .gte("checked_at", cacheCutoff)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) theirs = cached as StoredGrade;
    }
    if (!theirs) {
      const graded = await gradeSite(parsed.url, parsed.host);
      if ("error" in graded) {
        return NextResponse.json({ error: graded.error }, { status: 422 });
      }
      theirs = graded;
      if (canStore && parsed.host !== REFERENCE_HOST) {
        await supabase.from("site_grades").insert({
          host: graded.host,
          url: graded.url.slice(0, 500),
          scores: graded.scores,
          checks: graded.checks,
          is_reference: false,
        });
      }
    }

    // ---- reference site (this one), refreshed daily ----
    let reference: StoredGrade | null = null;
    if (canStore) {
      const { data: cachedRef } = await supabase
        .from("site_grades")
        .select("host, url, checked_at, scores, checks")
        .eq("host", REFERENCE_HOST)
        .eq("is_reference", true)
        .gte("checked_at", cacheCutoff)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cachedRef) reference = cachedRef as StoredGrade;
    }
    if (!reference && parsed.host !== REFERENCE_HOST) {
      const graded = await gradeSite(REFERENCE_URL, REFERENCE_HOST);
      if (!("error" in graded)) {
        reference = graded;
        if (canStore) {
          await supabase.from("site_grades").insert({
            host: graded.host,
            url: graded.url.slice(0, 500),
            scores: graded.scores,
            checks: graded.checks,
            is_reference: true,
          });
        }
      }
    }

    // ---- real running average of graded sites ----
    let average: Record<string, number> | null = null;
    let averageCount = 0;
    if (canStore) {
      const { data: rows } = await supabase
        .from("site_grades")
        .select("host, scores, checked_at")
        .eq("is_reference", false)
        .gte("checked_at", new Date(Date.now() - 90 * 86400e3).toISOString())
        .order("checked_at", { ascending: false })
        .limit(500);
      if (rows) {
        const latestPerHost = new Map<string, GradeScores>();
        for (const row of rows as Array<{ host: string; scores: GradeScores }>) {
          if (!latestPerHost.has(row.host)) latestPerHost.set(row.host, row.scores);
        }
        averageCount = latestPerHost.size;
        if (averageCount >= MIN_SITES_FOR_AVERAGE) {
          const keys = [
            "performance", "seo", "accessibility", "best_practices",
            "lcp_s", "search_readiness", "lead_readiness", "overall",
          ] as const;
          average = {};
          for (const key of keys) {
            const values = [...latestPerHost.values()]
              .map((s) => s[key])
              .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
            if (values.length >= MIN_SITES_FOR_AVERAGE) {
              const mean = values.reduce((a, b) => a + b, 0) / values.length;
              average[key] = key === "lcp_s" ? Math.round(mean * 10) / 10 : Math.round(mean);
            }
          }
        }
      }
    }

    return NextResponse.json({
      yours: { host: theirs.host, checked_at: theirs.checked_at, scores: theirs.scores, checks: theirs.checks },
      reference: reference
        ? { host: reference.host, checked_at: reference.checked_at, scores: reference.scores }
        : null,
      average,
      average_count: averageCount,
      average_min: MIN_SITES_FOR_AVERAGE,
    });
  } catch {
    return NextResponse.json(
      { error: "Grading hit a snag. Try again in a minute." },
      { status: 500 }
    );
  }
}
