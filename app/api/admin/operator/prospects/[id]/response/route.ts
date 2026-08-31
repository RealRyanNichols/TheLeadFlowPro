import { NextResponse } from "next/server";
import { requireOperatorAdmin, OperatorAuthError } from "@/lib/operatoros/auth";
import { callOperatorProvider, providerConfiguration } from "@/lib/operatoros/providers";

const DECLINE = /\b(no thanks|not interested|do not contact|don't contact|stop contacting|remove me|unsubscribe)\b/i;
const DEFER = /\b(later|busy|next week|next month|not now|circle back|follow up later|reach back out)\b/i;
const POSITIVE = /\b(yes|yeah|sure|send it|send me|interested|sounds good|let's talk|lets talk|okay|ok)\b/i;
const QUESTION = /\?|\b(how much|what does|what is|how does|price|cost|when|where|who)\b/i;

function centralParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour === "24" ? "0" : values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function centralInstant(year: number, month: number, day: number, hour: number, minute = 0) {
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desired;
  for (let i = 0; i < 3; i += 1) {
    const actual = centralParts(new Date(guess));
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    guess += desired - actualAsUtc;
  }
  return new Date(guess);
}

function nextBusinessDayAt3(now = new Date()) {
  const current = centralParts(now);
  const cursor = new Date(Date.UTC(current.year, current.month - 1, current.day + 1, 12));
  while ([0, 6].includes(cursor.getUTCDay())) cursor.setUTCDate(cursor.getUTCDate() + 1);
  return centralInstant(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), 15);
}

function todayAt3OrSoon(now = new Date()) {
  const current = centralParts(now);
  const at3 = centralInstant(current.year, current.month, current.day, 15);
  return at3.getTime() > now.getTime() + 10 * 60_000 ? at3 : new Date(now.getTime() + 10 * 60_000);
}

function classify(response: string) {
  if (DECLINE.test(response)) return "declined" as const;
  if (DEFER.test(response)) return "defer" as const;
  if (POSITIVE.test(response)) return "interested" as const;
  if (QUESTION.test(response)) return "question" as const;
  return "other" as const;
}

function fallbackReply(classification: ReturnType<typeof classify>, business: string, bestOffer: string | null) {
  if (classification === "declined") return "No reply recommended. Mark this record do-not-contact and close the sequence.";
  if (classification === "interested") {
    return `Absolutely. I kept the private walkthrough focused on ${bestOffer || "the clearest conversion and follow-up opportunity"}. I’ll send it over. Take a look when you have a minute and tell me what I missed.`;
  }
  if (classification === "defer") return `No problem. I’ll get out of your way and circle back at a better time. If there is one part of ${business} you want me to look at before then, send it over and I’ll keep the review focused.`;
  if (classification === "question") return "Thanks for getting back to me. I want to answer that accurately instead of guessing. I’m checking it against the private audit now and I’ll send you the concise answer with the relevant screenshot or number.";
  return "Thanks for getting back to me. I saw your note. I’m keeping this focused on the one business result we mapped instead of sending a generic pitch. I’ll follow up with the clearest next step.";
}

function cleanProviderJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as { reply?: unknown; classification?: unknown };
  } catch {
    return null;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireOperatorAdmin();
    const { id } = await context.params;
    const body = (await request.json()) as { response?: unknown };
    const response = typeof body.response === "string" ? body.response.trim() : "";
    if (!response || response.length > 4000) return NextResponse.json({ error: "A prospect reply is required" }, { status: 400 });

    const { data: prospect, error: prospectError } = await supabase
      .from("operator_prospects")
      .select("id,workspace_id,business_name,industry,observed_gap,best_offer,contact_route,status,permission_state")
      .eq("id", id)
      .single();
    if (prospectError || !prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

    let classification = classify(response);
    let reply = fallbackReply(classification, prospect.business_name, prospect.best_offer);
    let providerUsed = "deterministic";

    if (classification !== "declined") {
      const openai = providerConfiguration("openai");
      const anthropic = providerConfiguration("anthropic");
      const provider = openai.ready ? "openai" : anthropic.ready ? "anthropic" : null;
      if (provider) {
        try {
          const result = await callOperatorProvider({
            provider,
            systemPrompt: [
              "You are the LeadFlow Pro Prospect Reply Planner.",
              "Write one concise, human business reply that advances the conversation without pressure.",
              "Use only the supplied facts. Never invent results, pricing, a completed walkthrough, a published page, or a customer claim.",
              "Permission-first. No em dashes. No hype. Do not auto-send anything.",
              "Return JSON only: {\"classification\":\"interested|defer|question|other\",\"reply\":\"...\"}.",
            ].join("\n"),
            userPrompt: JSON.stringify({
              business: prospect.business_name,
              industry: prospect.industry,
              observed_gap: prospect.observed_gap,
              best_offer: prospect.best_offer,
              contact_route: prospect.contact_route,
              prospect_reply: response,
            }),
          });
          const parsed = cleanProviderJson(result.text);
          if (parsed && typeof parsed.reply === "string" && parsed.reply.trim()) {
            reply = parsed.reply.trim().slice(0, 4000);
            if (["interested", "defer", "question", "other"].includes(String(parsed.classification))) {
              classification = parsed.classification as typeof classification;
            }
            providerUsed = provider;
          }
        } catch {
          providerUsed = "deterministic";
        }
      }
    }

    const now = new Date();
    const dueAt = classification === "defer" ? nextBusinessDayAt3(now) : todayAt3OrSoon(now);
    const permissionState = classification === "interested" ? "granted" : classification === "declined" ? "declined" : prospect.permission_state;
    const prospectStatus = classification === "declined" ? "do_not_contact" : "responded";

    await supabase
      .from("operator_outreach_actions")
      .update({ status: "cancelled", updated_at: now.toISOString(), notes: "Cancelled because a prospect reply changed the sequence." })
      .eq("prospect_id", id)
      .in("status", ["queued", "approved"]);

    const { error: prospectUpdateError } = await supabase
      .from("operator_prospects")
      .update({
        status: prospectStatus,
        permission_state: permissionState,
        response_summary: response,
        last_contacted_at: now.toISOString(),
        next_action_at: classification === "declined" ? null : dueAt.toISOString(),
        next_action: classification === "declined" ? "No further outreach. Prospect declined." : "Review the response recommendation and approve, edit, or skip it.",
        updated_at: now.toISOString(),
      })
      .eq("id", id);
    if (prospectUpdateError) return NextResponse.json({ error: "Prospect status could not be updated" }, { status: 500 });

    if (classification !== "declined") {
      const { error: actionError } = await supabase.from("operator_outreach_actions").upsert(
        {
          workspace_id: prospect.workspace_id,
          prospect_id: id,
          channel: "email_or_dm",
          action_type: "response_recommendation",
          due_at: dueAt.toISOString(),
          sequence_day: 60,
          message_draft: reply,
          status: "queued",
          human_approved: false,
          sent_at: null,
          notes: `Generated after prospect reply. Planner: ${providerUsed}. Human approval required before sending.`,
          updated_at: now.toISOString(),
        },
        { onConflict: "prospect_id,sequence_day,action_type" },
      );
      if (actionError) return NextResponse.json({ error: "Response recommendation could not be queued" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      classification,
      reply,
      timing: classification === "declined"
        ? "No further contact"
        : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(dueAt),
      provider: providerUsed,
    });
  } catch (error) {
    if (error instanceof OperatorAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Response planning failed" }, { status: 500 });
  }
}
