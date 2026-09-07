// Private CRM presentation only. Callers must authorize the user and use RLS
// before supplying records. Lead IDs are checked again to prevent accidental
// cross-lead aggregation when several records are loaded together.
export type LeadNoteRecord = {
  id: string;
  lead_id: string;
  body: string;
  author: string | null;
  created_at: string;
};
export type LeadActivityRecord = {
  id: string;
  lead_id: string;
  kind: string;
  detail: string;
  created_at: string;
};
export type LeadMessageRecord = {
  id: string;
  lead_id: string;
  direction: "out" | "in";
  channel: "sms" | "email" | "note";
  body: string;
  author: string | null;
  delivered: boolean;
  created_at: string;
};
export type LeadEmailRecord = {
  id: string;
  lead_id: string;
  step: number;
  sent_at: string | null;
  delivery_status: "pending" | "sent" | "failed" | null;
  first_attempt_at: string | null;
  last_attempt_at: string | null;
};
export type LeadCallRecord = {
  id: string;
  lead_id: string;
  direction: string | null;
  status: string | null;
  outcome: string | null;
  started_at: string | null;
  created_at: string;
  duration_seconds: number | null;
  summary: string | null;
  next_steps: string[] | null;
  source: string | null;
  scope_status: string | null;
};
export type TimelineLead = {
  id: string;
  created_at: string;
  full_name: string;
  source: string | null;
  notes: string | null;
};
export type LeadTimelineItem = {
  id: string;
  kind: "intake" | "note" | "message" | "email" | "activity" | "call";
  at: string | null;
  title: string;
  body: string;
  author: string;
  status?: string;
};

export function leadSourceLabel(source: string | null | undefined): string {
  if (
    ["meta_lead_ad", "facebook-lead-ad", "facebook_lead_ad"].includes(
      source ?? "",
    )
  )
    return "Facebook lead form";
  if (source === "quo_call") return "Business phone call";
  if (source === "website") return "Website form";
  return source?.replace(/_/g, " ") || "Source not recorded";
}

export function buildLeadTimeline(input: {
  lead: TimelineLead;
  notes?: LeadNoteRecord[];
  activity?: LeadActivityRecord[];
  messages?: LeadMessageRecord[];
  emails?: LeadEmailRecord[];
  calls?: LeadCallRecord[];
}): LeadTimelineItem[] {
  const { lead } = input;
  const entries: LeadTimelineItem[] = [
    {
      id: `intake:${lead.id}`,
      kind: "intake",
      at: lead.created_at,
      title: "Lead received",
      body: leadSourceLabel(lead.source),
      author: lead.full_name,
    },
  ];
  if (lead.notes?.trim())
    entries.push({
      id: `legacy:${lead.id}`,
      kind: "note",
      at: null,
      title: "Earlier saved note",
      body: lead.notes,
      author: "Author not recorded",
    });
  for (const note of input.notes ?? []) {
    if (note.lead_id !== lead.id) continue;
    entries.push({
      id: `note:${note.id}`,
      kind: "note",
      at: note.created_at,
      title: "Team note",
      body: note.body,
      author: note.author?.trim() || "Author not recorded",
    });
  }
  for (const message of input.messages ?? []) {
    if (message.lead_id !== lead.id) continue;
    const channel =
      message.channel === "sms"
        ? "Text"
        : message.channel === "email"
          ? "Email"
          : "Manually logged reply";
    entries.push({
      id: `message:${message.id}`,
      kind: "message",
      at: message.created_at,
      title:
        message.channel === "note"
          ? channel
          : `${channel} ${message.direction === "out" ? "to" : "from"} lead`,
      body: message.body,
      author:
        message.channel === "note"
          ? message.author
            ? `Logged by ${message.author}`
            : "Recorder not recorded"
          : message.direction === "out"
            ? message.author || "Sender not recorded"
            : lead.full_name,
      status:
        message.channel === "note"
          ? "Recorded only · nothing sent"
          : message.direction === "in"
            ? "Received in CRM"
            : message.delivered
              ? "Sent · provider accepted"
              : "Not sent",
    });
  }
  for (const email of input.emails ?? []) {
    if (email.lead_id !== lead.id) continue;
    // Step zero enrolls a lead in follow-up. It is never an email send.
    const enrollment = email.step === 0;
    const status = email.delivery_status;
    entries.push({
      id: `email:${email.id}`,
      kind: "email",
      at:
        enrollment || status === "sent"
          ? email.sent_at
          : (email.last_attempt_at ?? email.first_attempt_at ?? email.sent_at),
      title: enrollment
        ? "Follow-up sequence enrolled"
        : `Automated email · step ${email.step}`,
      body: enrollment
        ? "The lead was added to the follow-up sequence. This record is not a sent email."
        : "Delivery log only. This record does not store the message body or an inbox reply.",
      author: "Automated follow-up",
      status: enrollment
        ? "Enrollment record"
        : status === "sent"
          ? "Sent · provider accepted"
          : status === "failed"
            ? "Failed · needs attention"
            : status === "pending"
              ? "Pending · not confirmed sent"
              : "Delivery state not recorded",
    });
  }
  for (const call of input.calls ?? []) {
    if (call.lead_id !== lead.id || call.scope_status !== "company") continue;
    const details = [
      call.summary?.trim(),
      ...(call.next_steps ?? []).filter(Boolean).map((step) => `Next: ${step}`),
    ].filter(Boolean);
    const duration =
      typeof call.duration_seconds === "number" &&
      Number.isFinite(call.duration_seconds) &&
      call.duration_seconds >= 0
        ? `${Math.floor(call.duration_seconds / 60)}m ${Math.floor(call.duration_seconds % 60)}s`
        : null;
    entries.push({
      id: `call:${call.id}`,
      kind: "call",
      at: call.started_at ?? call.created_at,
      title: `${call.direction === "incoming" || call.direction === "inbound" ? "Incoming" : call.direction === "outgoing" || call.direction === "outbound" ? "Outgoing" : "Business"} call`,
      body:
        details.join("\n") ||
        "Call logged. No summary is stored for this call.",
      author: call.source || "Business phone",
      status:
        [call.outcome || call.status, duration].filter(Boolean).join(" · ") ||
        "Call recorded",
    });
  }
  for (const event of input.activity ?? []) {
    if (event.lead_id !== lead.id) continue;
    entries.push({
      id: `activity:${event.id}`,
      kind: "activity",
      at: event.created_at,
      title: event.kind.replace(/_/g, " "),
      body: event.detail,
      author: "CRM activity",
    });
  }
  const timestamp = (value: string | null) =>
    value && Number.isFinite(Date.parse(value))
      ? Date.parse(value)
      : Number.NEGATIVE_INFINITY;
  return entries.sort(
    (a, b) => timestamp(b.at) - timestamp(a.at) || a.id.localeCompare(b.id),
  );
}

const SECRET_KEY =
  /resume|token|secret|password|credential|authorization|apikey|cookie/i;

/** Remove credential-bearing diagnostic keys before server-to-client serialization. */
export function safeLeadDiagnostic(value: unknown, depth = 0): unknown {
  if (depth > 12) return null;
  if (Array.isArray(value))
    return value
      .slice(0, 100)
      .map((item) => safeLeadDiagnostic(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SECRET_KEY.test(key.replace(/[^a-z]/gi, "")))
      .map(([key, item]) => [key, safeLeadDiagnostic(item, depth + 1)]),
  );
}

export function originalLeadAnswers(
  diagnostic: Record<string, unknown> | null,
): { label: string; value: string }[] {
  const fields = diagnostic?.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return [];
  const clean = safeLeadDiagnostic(fields) as Record<string, unknown>;
  return Object.entries(clean).flatMap(([key, value]) => {
    const text =
      typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : Array.isArray(value)
            ? value.filter((v) => typeof v === "string").join(", ")
            : "";
    return text.trim() ? [{ label: key.replace(/_/g, " "), value: text }] : [];
  });
}
