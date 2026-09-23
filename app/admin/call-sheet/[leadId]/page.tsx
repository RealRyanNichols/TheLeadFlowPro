import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCentral } from "@/lib/businessTime";
import {
  CALL_HISTORY_DETAIL_PATTERN,
  CALL_HISTORY_KINDS,
  closerOffersFor,
  countPriorAttempts,
  firstName,
  isCallHistoryEntry,
  meetingPlaceForLabel,
  offerIdsFromDetail,
  theirWords,
  type PlannerLead,
} from "@/lib/callCloser";
import { SAMPLE_ACTOR_NAME, SAMPLE_CALL_ACTIVITY, SAMPLE_CALL_LEAD, SAMPLE_NOTES, SAMPLE_NOW } from "@/lib/callCloserFixtures";
import {
  ageLabel,
  callbackState,
  canText,
  interestLabel,
  isHumanTouch,
  noteSummary,
  sourceLabel,
  touchesFromRows,
  type LatestInbound,
} from "@/lib/callSheet";
import { loadLeadTouches } from "@/lib/callSheetServer";
import { hasLeadEmailAddress, leadMessageAuthor } from "@/lib/leadMessageAuthor";
import { safeLeadDiagnostic } from "@/lib/leadTimeline";
import { closerOffers, payDoorFor, type CloserOfferId, type PayDoor } from "@/lib/payDoors";
import { toE164 } from "@/lib/quo";
import CallCardPanel from "./CallCardPanel";

// The call card: one lead, everything Ryan needs on the phone, and the two
// taps that record how the call went.
//
// Top to bottom it follows the call. Who they are and whether a call back is
// due. What they sent, when they texted or called since a person last
// reached them (the call sheet lists them under "They reached out" and links
// here). The buttons to reach them (a text only with consent and no STOP). What
// they wrote, in their own words. What he can offer them, with the published
// price and exactly how they would pay. What was said last time. Then "How did
// the call go?", which saves the outcome and sets when the lead comes back to
// the call sheet.
//
// Read-only until Save: this page reads the lead, its last three notes, its
// last twenty call entries, and its recent Quo calls and texts through the
// call sheet's loader (so "Call back due now" follows the same touches the
// call sheet counts), and the panel posts to the one save route.
// Authorization sits next to the read, not only in the layout, and runs before
// anything about the lead is read. /admin/call-sheet/sample shows a fictional
// lead from lib/callCloserFixtures.ts and reads no lead data at all. Phone and
// text links are built here on the server, so the browser panel never loads
// the Quo or call sheet code.

export const dynamic = "force-dynamic";
export const metadata = { title: "Call card | The LeadFlow Pro" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEAD_COLUMNS =
  "id, created_at, full_name, business_name, email, phone, status, interest, source, utm_source, best_contact_method, goals, sms_consent, sms_unsubscribed_at, next_follow_up_at, last_contacted_at, is_test, diagnostic";
const NOTES_SHOWN = 3;
const CALL_ENTRIES_READ = 20;

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const BUTTON = `inline-flex min-h-[44px] items-center rounded-lg px-4 py-2 text-sm font-bold ${FOCUS}`;
const QUIET_LINK = `inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`;
const SECTION_TITLE = "text-base font-black text-[var(--heading)]";

type CardNote = { summary: string; at: string; atIso: string; author: string };

type CardView = {
  sample: boolean;
  now: Date;
  lead: PlannerLead;
  createdAt: string;
  source: string | null;
  utmSource: string | null;
  bestContact: string | null;
  lastContactedAt: string | null;
  isTest: boolean;
  goals: string | null;
  notes: CardNote[];
  callDetails: string[];
  /**
   * The latest human touch on the record (ISO), for the call sheet's own
   * callback rule: a note, a logged call, a Quo call, a text a person sent, or
   * a reply logged by hand, mapped by the sheet's own touchesFromRows.
   * last_contacted_at is left out on purpose: an inbound text and the
   * automatic text-back move it, and neither is a person acting.
   */
  lastHumanTouchAt: string | null;
  /**
   * The newest message or missed call from the lead (the call sheet's own
   * rule). Shown when it is newer than the last human touch, so a lead the
   * sheet lists under "They reached out" arrives with what they asked.
   */
  latestInbound: LatestInbound | null;
  /** Some history failed to load. The page says so instead of showing an empty history. */
  partial: boolean;
  /** The notes read itself failed, so "Last time" cannot say there are none. */
  notesFailed: boolean;
  actorName: string;
};

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function validDate(iso: string | null): Date | null {
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : at;
}

function withPeriod(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function toNotes(rows: { body: string | null; created_at: string; author: string | null }[]): CardNote[] {
  return rows.flatMap((row) => {
    const summary = noteSummary(row.body);
    const at = validDate(row.created_at);
    if (!summary || !at) return [];
    return [{ summary, at: formatCentral(at), atIso: at.toISOString(), author: row.author?.trim() || "Author not recorded" }];
  });
}

/**
 * "They texted you Mon, Sep 21 at 2:12 PM Central, and nobody has answered
 * since." With some history missing, the second half cannot be known, so it
 * is left off.
 */
function reachedOutSentence(inbound: LatestInbound, partial: boolean): string {
  const at = validDate(inbound.at);
  const when = at ? `${formatCentral(at)} Central` : "recently";
  if (inbound.kind === "call_in") {
    return partial ? `They called ${when} and nobody picked up.` : `They called ${when} and nobody picked up. Nobody has reached them since.`;
  }
  const verb = inbound.channel === "sms" ? "texted you" : inbound.channel === "email" ? "emailed you" : "wrote to you";
  return partial ? `They ${verb} ${when}.` : `They ${verb} ${when}, and nobody has answered since.`;
}

/** The newest valid instant among these, as ISO, or null. */
function latest(values: (string | null | undefined)[]): string | null {
  let best: Date | null = null;
  for (const v of values) {
    const at = validDate(v ?? null);
    if (at && (!best || at > best)) best = at;
  }
  return best ? best.toISOString() : null;
}

function sampleView(): CardView {
  const { created_at, source, goals, best_contact_method, ...lead } = SAMPLE_CALL_LEAD;
  const notes = toNotes(SAMPLE_NOTES);
  return {
    sample: true,
    now: SAMPLE_NOW,
    lead,
    createdAt: created_at,
    source,
    utmSource: null,
    bestContact: best_contact_method,
    lastContactedAt: null,
    isTest: false,
    goals,
    notes,
    callDetails: SAMPLE_CALL_ACTIVITY,
    lastHumanTouchAt: latest(notes.map((n) => n.atIso)),
    latestInbound: null,
    partial: false,
    notesFailed: false,
    actorName: SAMPLE_ACTOR_NAME,
  };
}

export default async function CallCardPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const supabase = await createClient();
  // Authorization next to the private read, not only in the layout.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/admin/call-sheet/${leadId}`)}`);
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  if (leadId === "sample") return <CallCard view={sampleView()} />;
  if (!UUID_RE.test(leadId)) notFound();

  const leadRead = await supabase.from("leads").select(LEAD_COLUMNS).eq("id", leadId).is("deleted_at", null).maybeSingle();
  if (leadRead.error) return <ConnectionProblem leadId={leadId} />;
  const row = leadRead.data as Record<string, unknown> | null;
  if (!row) notFound();

  const [notesRead, callsRead, quoTouches] = await Promise.all([
    supabase
      .from("lead_notes")
      .select("body, author, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(NOTES_SHOWN),
    // The Call Closer's entries: calls, and sent proposals (kind "sales").
    supabase
      .from("lead_activity")
      .select("kind, detail, created_at")
      .eq("lead_id", leadId)
      .in("kind", [...CALL_HISTORY_KINDS])
      .ilike("detail", CALL_HISTORY_DETAIL_PATTERN)
      .order("created_at", { ascending: false })
      .limit(CALL_ENTRIES_READ),
    // Quo calls and thread messages, mapped by the call sheet's own rules.
    loadLeadTouches(supabase, leadId),
  ]);

  const author = leadMessageAuthor(profile.full_name, user.email);
  const diagnostic = safeLeadDiagnostic(row.diagnostic);
  const noteRows = notesRead.error ? [] : ((notesRead.data ?? []) as { body: string | null; created_at: string; author: string | null }[]);
  const notes = toNotes(noteRows);
  const callRows = callsRead.error
    ? []
    : ((callsRead.data ?? []) as { kind?: unknown; detail: unknown; created_at?: unknown }[]).filter((r) => isCallHistoryEntry(r.kind, r.detail));
  // The call sheet's own mapping (lib/callSheet.ts): notes, Quo calls about
  // the company, texts a person sent that were delivered, and replies logged
  // by hand are touches; an inbound text or a missed call from the lead is not.
  const touches = [
    ...touchesFromRows({ notes: noteRows.map((n) => ({ lead_id: leadId, created_at: n.created_at, body: n.body })), calls: [], messages: [] }),
    ...quoTouches.touches,
  ];
  const humanTouches = touches.filter(isHumanTouch).map((t) => t.at);
  const view: CardView = {
    sample: false,
    now: new Date(),
    lead: {
      id: leadId,
      full_name: text(row.full_name) ?? "",
      business_name: text(row.business_name),
      status: text(row.status) ?? "",
      interest: text(row.interest),
      phone: text(row.phone),
      email: text(row.email),
      sms_consent: typeof row.sms_consent === "boolean" ? row.sms_consent : null,
      sms_unsubscribed_at: text(row.sms_unsubscribed_at),
      next_follow_up_at: text(row.next_follow_up_at),
      diagnostic: diagnostic && typeof diagnostic === "object" && !Array.isArray(diagnostic) ? (diagnostic as Record<string, unknown>) : null,
    },
    createdAt: text(row.created_at) ?? "",
    source: text(row.source),
    utmSource: text(row.utm_source),
    bestContact: text(row.best_contact_method),
    lastContactedAt: text(row.last_contacted_at),
    isTest: row.is_test === true,
    goals: text(row.goals),
    notes,
    callDetails: callRows.map((r) => r.detail).filter((d): d is string => typeof d === "string"),
    lastHumanTouchAt: latest([...humanTouches, ...callRows.map((r) => (typeof r.created_at === "string" ? r.created_at : null))]),
    latestInbound: quoTouches.latestInbound,
    partial: Boolean(notesRead.error || callsRead.error || !quoTouches.ok),
    notesFailed: Boolean(notesRead.error),
    // Signs the pay-link draft the same way the save route does: the profile name, else the owner's first name.
    actorName: author.auditName === author.displayName ? author.displayName : "",
  };
  return <CallCard view={view} />;
}

function ConnectionProblem({ leadId }: { leadId: string }) {
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4">
      <div className="card !p-4" role="alert">
        <h2 className="text-lg font-black text-[var(--heading)]">The call card could not be loaded.</h2>
        <p className="my-3 text-sm">This is a connection problem, not an empty lead. Try again in a moment.</p>
        <div className="flex flex-wrap gap-2">
          <a href={`/admin/call-sheet/${encodeURIComponent(leadId)}`} className={`${BUTTON} bg-[var(--blue)] text-white`}>
            Try again
          </a>
          <Link href="/admin/call-sheet" className={QUIET_LINK}>
            Back to the call sheet
          </Link>
        </div>
      </div>
    </div>
  );
}

function CallCard({ view }: { view: CardView }) {
  const { lead, now, sample } = view;
  const name = lead.full_name.trim() || "Unnamed lead";
  const first = firstName(lead.full_name);
  const who = first || "this lead";

  const e164 = lead.phone ? toE164(lead.phone) : null;
  const textable = canText(lead);
  const tel = e164 ? `tel:${e164}` : null;
  const sms = e164 && textable ? `sms:${e164}` : null;
  const hasEmail = hasLeadEmailAddress(lead.email);
  const mail = hasEmail ? `mailto:${lead.email}` : null;

  const created = validDate(view.createdAt);
  const ageHours = created ? Math.max(0, (now.getTime() - created.getTime()) / 3_600_000) : null;
  const touched = view.notes.length > 0 || view.callDetails.length > 0 || Boolean(view.lastHumanTouchAt) || Boolean(view.lastContactedAt);
  // The call sheet's own rule (lib/callSheet.ts callbackState): a past time is
  // a call back still owed only when the last human touch came before it.
  // Otherwise it was kept, or it is the diagnostic's stamp.
  const promise = callbackState(lead.next_follow_up_at, view.lastHumanTouchAt, now);
  const pastTime = promise.at !== null && promise.at.getTime() <= now.getTime() ? promise.at : null;
  // They reached out after the last time a person did: a reply is owed.
  const lastTouchMs = view.lastHumanTouchAt ? Date.parse(view.lastHumanTouchAt) : Number.NEGATIVE_INFINITY;
  const inbound = view.latestInbound && Date.parse(view.latestInbound.at) > lastTouchMs ? view.latestInbound : null;

  const words = theirWords(view.goals);
  const suggested = closerOffersFor(lead.interest, lead.diagnostic);
  const lastOffers: CloserOfferId[] = view.callDetails.map(offerIdsFromDetail).find((ids) => ids.length > 0) ?? [];
  const suggestedDoors = suggested.map((id) => payDoorFor(id)).filter((d): d is PayDoor => d !== null);
  const everyDoor = closerOffers();

  return (
    // grid-cols-1 is minmax(0, 1fr): a long URL in the pay message or in their
    // words wraps inside the card instead of widening every card past a phone.
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4">
      <Link href="/admin/call-sheet" className={QUIET_LINK + " justify-self-start"}>
        Back to the call sheet
      </Link>

      {sample ? (
        <p className="card !p-4 text-sm" role="note">
          <span className="font-bold">Sample call card.</span> {name} and the business are fictional. Try the outcomes below: the
          list updates as you choose, and nothing is saved or sent.
        </p>
      ) : null}

      <header className="card !p-4">
        <p className="hq-eyebrow">Call card</p>
        <h2 className="mt-1 break-words text-2xl font-black text-[var(--heading)]">{name}</h2>
        {lead.business_name ? <p className="break-words font-semibold text-[var(--muted)]">{lead.business_name}</p> : null}
        <p className="mt-2 text-sm text-[var(--muted)]">
          {sourceLabel({ source: view.source, utm_source: view.utmSource })}
          {lead.interest ? ` · ${interestLabel(lead.interest)}` : ""}
          {ageHours !== null ? ` · came in ${ageLabel(ageHours)}` : ""}
          {lead.status ? ` · status ${lead.status.replace(/_/g, " ")}` : ""}
          {view.bestContact ? ` · prefers ${view.bestContact}` : ""}
          {view.isTest ? " · test lead" : ""}
        </p>
        {/* "First call" only on a full load: missing history is a connection problem, not proof nobody called. */}
        {!touched && !view.partial ? (
          <p className="mt-3 rounded-lg border border-[var(--accent-line)] bg-[var(--accent-tint)] p-3 text-sm text-[var(--text)]">
            Nobody has logged a call or a note yet. This is the first call.
          </p>
        ) : view.partial && pastTime ? (
          // Some history did not load, so whether this time is still owed cannot be told.
          <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--page)] p-3 text-sm text-[var(--text)]">
            <span className="font-bold">Follow-up time on file:</span> {formatCentral(pastTime)} Central.
          </p>
        ) : promise.state === "due" ? (
          <p className="mt-3 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]">
            <span className="font-bold">Call back due now.</span> You set it for {formatCentral(promise.at)} Central.
          </p>
        ) : promise.state === "later" ? (
          <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--page)] p-3 text-sm text-[var(--text)]">
            <span className="font-bold">Call back set for</span> {formatCentral(promise.at)} Central.
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">No call back is set.</p>
        )}

        {/* The sheet's "They reached out" case: what they sent, before Ryan dials. */}
        {inbound ? (
          <div className="mt-3 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]">
            <p>
              <span className="font-bold">They reached out.</span> {reachedOutSentence(inbound, view.partial)}
            </p>
            {inbound.said ? (
              <blockquote className="mt-2 whitespace-pre-wrap border-l-4 [overflow-wrap:anywhere] border-[var(--warn-line)] pl-3">
                {inbound.said}
              </blockquote>
            ) : null}
            {!sample ? (
              <Link href={`/admin/leads/${lead.id}`} className={`${QUIET_LINK} mt-1`}>
                Open the thread in the full record
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={`Reach ${who}`}>
          {tel ? (
            <a href={tel} className={`${BUTTON} bg-[var(--blue)] text-white`}>
              Call {lead.phone}
            </a>
          ) : (
            <span className={`${BUTTON} border border-[var(--line-strong)] font-normal text-[var(--muted)]`}>No phone on file</span>
          )}
          {sms ? (
            <a href={sms} className={`${BUTTON} border border-[var(--line-strong)] text-[var(--text)]`}>
              Text (consented)
            </a>
          ) : lead.phone && lead.sms_unsubscribed_at ? (
            <span className={`${BUTTON} border border-[var(--line)] font-normal text-[var(--muted)]`}>Replied STOP. Call instead.</span>
          ) : lead.phone ? (
            <span className={`${BUTTON} border border-[var(--line)] font-normal text-[var(--muted)]`}>No text consent</span>
          ) : null}
          {mail ? (
            <a href={mail} className={`${BUTTON} border border-[var(--line-strong)] text-[var(--text)]`}>
              Email
            </a>
          ) : null}
        </div>
      </header>

      {view.partial ? (
        <div className="card !p-4 text-sm" role="alert">
          <p className="font-bold">Some of this lead&apos;s history did not load.</p>
          <p className="mt-1">
            This is a connection problem, not an empty lead. The notes, the count of unanswered tries, and whether a call back is still
            owed may be off. Saving
            still checks the full record.
          </p>
        </div>
      ) : null}

      <section className="card !p-4" aria-labelledby="call-card-words">
        <h3 id="call-card-words" className={SECTION_TITLE}>
          In their words
        </h3>
        {words.words ? (
          <blockquote className="mt-2 whitespace-pre-wrap border-l-4 [overflow-wrap:anywhere] border-[var(--accent-line)] pl-3 text-sm text-[var(--text)]">
            {words.words}
          </blockquote>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">They did not write anything. Ask what made them reach out.</p>
        )}
        {words.meet || words.reachBy ? (
          <dl className="mt-3 grid gap-1 text-sm">
            {words.meet ? (
              <div>
                <dt className="inline font-bold">Wants to meet: </dt>
                <dd className="inline">{words.meet}</dd>
              </div>
            ) : null}
            {words.reachBy ? (
              <div>
                <dt className="inline font-bold">Reach them by: </dt>
                <dd className="inline">{words.reachBy}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      <section className="card !p-4" aria-labelledby="call-card-offers">
        <h3 id="call-card-offers" className={SECTION_TITLE}>
          What you can offer
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Prices and payment steps come straight from the published offers.</p>
        <ul className="mt-3 grid gap-3">
          {suggestedDoors.map((door) => (
            <li key={door.offerId} className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-black text-[var(--heading)]">{door.offerName}</span>
                <span className="font-bold text-[var(--blue)]">{door.priceLabel}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text)]">{door.terms}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{withPeriod(door.howTheyPay)}</p>
            </li>
          ))}
        </ul>
        <details className="mt-3">
          <summary className={`flex min-h-[44px] cursor-pointer items-center rounded-lg px-1 text-sm font-bold text-[var(--blue)] ${FOCUS}`}>
            Show every published offer
          </summary>
          <ul className="mt-2 grid gap-2">
            {everyDoor.map((door) => (
              <li key={door.offerId} className="min-w-0 border-b border-[var(--line)] pb-2 text-sm last:border-b-0">
                <span className="font-bold text-[var(--heading)]">{door.offerName}</span>{" "}
                <span className="font-semibold text-[var(--muted)]">{door.priceLabel}</span>
                <span className="block text-[var(--muted)]">{withPeriod(door.howTheyPay)}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="card !p-4" aria-labelledby="call-card-last">
        <h3 id="call-card-last" className={SECTION_TITLE}>
          Last time
        </h3>
        {view.notes.length ? (
          <ol className="mt-2 grid gap-3">
            {view.notes.map((n, i) => (
              <li key={`${n.at}-${i}`} className="min-w-0">
                <p className="text-xs text-[var(--muted)]">
                  {n.at} · {n.author}
                </p>
                <p className="text-sm text-[var(--text)] [overflow-wrap:anywhere]">{n.summary}</p>
              </li>
            ))}
          </ol>
        ) : view.notesFailed ? (
          <p className="mt-2 text-sm text-[var(--muted)]">The notes did not load. Open the full record to check.</p>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">No notes yet.</p>
        )}
        {!sample ? (
          <Link href={`/admin/leads/${lead.id}`} className={`${QUIET_LINK} mt-2`}>
            Open the full record
          </Link>
        ) : null}
      </section>

      <CallCardPanel
        lead={{ ...lead, diagnostic: null }}
        suggestedOffers={suggested}
        initialOffers={lastOffers}
        priorAttempts={countPriorAttempts(view.callDetails)}
        actorName={view.actorName}
        smsHref={sms}
        mailHref={mail}
        canText={Boolean(sms)}
        hasEmail={hasEmail}
        defaultMeetingPlace={meetingPlaceForLabel(words.meet)}
        proposalAllowed
        sample={sample}
        fixedNow={sample ? now.toISOString() : null}
      />
    </div>
  );
}
