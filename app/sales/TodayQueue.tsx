"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Phone, MessageSquare, ChevronRight, CalendarClock } from "lucide-react";
import {
  type InboundSignals,
  type QueueLead,
  TIER_LABELS,
  dialHref,
  formatPhone,
  formatValue,
  prettyTimeline,
  rankQueue,
  waitedLabel,
  whyLine,
} from "@/lib/salesQueue";

// The Today queue. Not a dashboard of numbers, a running order of who to touch
// and what to do about it. Half the traffic here is a phone, so call and text
// are real tel:/sms: links that hand off to the dialer with no app in between.

const TIER_TONE: Record<number, { line: string; tint: string; text: string }> = {
  1: { line: "var(--accent-line)", tint: "var(--accent-tint)", text: "var(--blue)" },
  2: { line: "var(--warn-line)", tint: "var(--warn-tint)", text: "var(--warn)" },
  3: { line: "var(--warn-line)", tint: "var(--warn-tint)", text: "var(--warn)" },
  4: { line: "var(--green-line)", tint: "var(--green-tint)", text: "var(--green)" },
  5: { line: "var(--line-strong)", tint: "var(--fill-2)", text: "var(--muted)" },
};

export default function TodayQueue({
  leads,
  signals,
  loadedAt,
}: {
  leads: QueueLead[];
  signals: InboundSignals;
  loadedAt: number;
}) {
  // Render the clock client-side only, so the server and the first paint agree.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const ranked = useMemo(
    () => rankQueue(leads, signals, now ?? loadedAt),
    [leads, signals, now, loadedAt],
  );

  const groups = useMemo(() => {
    const out: { tier: number; rows: typeof ranked }[] = [];
    for (const row of ranked) {
      const last = out[out.length - 1];
      if (last && last.tier === row.tier) last.rows.push(row);
      else out.push({ tier: row.tier, rows: [row] });
    }
    return out;
  }, [ranked]);

  const reachedOutToday = ranked.filter((r) => r.tier === 1).length;
  const pastDue = ranked.filter((r) => r.tier === 3).length;
  const waitingOverWeek = ranked.filter(
    (r) => (now ?? loadedAt) - r.lastTouchAt > 7 * 24 * 60 * 60 * 1000,
  ).length;

  if (!ranked.length) {
    return (
      <section
        className="rounded-2xl border p-8 text-center"
        style={{ borderColor: "var(--green-line)", background: "var(--green-tint)" }}
      >
        <h2 className="text-xl font-black text-[var(--heading)]">
          Nobody is waiting on you.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          Every open lead has been touched and nothing is past due. That is the
          whole list, not a loading error.
        </p>
        <Link href="/admin/sales/pipeline" className="btn-primary mt-5 inline-flex min-h-[44px] items-center">
          Open the full pipeline
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <StatStrip
        total={ranked.length}
        reachedOutToday={reachedOutToday}
        pastDue={pastDue}
        waitingOverWeek={waitingOverWeek}
        loadedAt={loadedAt}
        now={now}
      />

      {groups.map((group) => {
        const tone = TIER_TONE[group.tier] ?? TIER_TONE[5];
        return (
          <section key={group.tier} aria-labelledby={`tier-${group.tier}`}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2
                id={`tier-${group.tier}`}
                className="text-sm font-black uppercase tracking-wide"
                style={{ color: tone.text }}
              >
                {TIER_LABELS[group.tier]}
              </h2>
              <span className="text-xs font-semibold text-[var(--muted)]">
                {group.rows.length}
              </span>
            </div>
            <ul className="space-y-2">
              {group.rows.map((row) => (
                <QueueRow
                  key={row.lead.id}
                  row={row}
                  tone={tone}
                  now={now ?? loadedAt}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function StatStrip({
  total,
  reachedOutToday,
  pastDue,
  waitingOverWeek,
  loadedAt,
  now,
}: {
  total: number;
  reachedOutToday: number;
  pastDue: number;
  waitingOverWeek: number;
  loadedAt: number;
  now: number | null;
}) {
  const stats = [
    { label: "To touch", value: total, tone: "var(--heading)" },
    { label: "Reached out", value: reachedOutToday, tone: "var(--blue)" },
    { label: "Past due", value: pastDue, tone: "var(--warn)" },
    { label: "Over a week", value: waitingOverWeek, tone: "var(--muted)" },
  ];
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border px-2 py-3 text-center"
            style={{ borderColor: "var(--line)", background: "var(--panel)" }}
          >
            <div className="text-2xl font-black leading-none" style={{ color: s.tone }}>
              {s.value}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-[var(--muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        {total} open {total === 1 ? "lead" : "leads"} in order.{" "}
        {now === null
          ? "Loaded just now."
          : `Loaded ${waitedLabel(loadedAt, now)} ago. Refresh for newer.`}
      </p>
    </div>
  );
}

function QueueRow({
  row,
  tone,
  now,
}: {
  row: ReturnType<typeof rankQueue>[number];
  tone: { line: string; tint: string; text: string };
  now: number;
}) {
  const { lead } = row;
  const tel = dialHref(lead.phone, "tel");
  const sms = row.canText ? dialHref(lead.phone, "sms") : null;
  const value = formatValue(lead.expected_value_cents);
  const timeline = prettyTimeline(lead.timeline);

  return (
    <li
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--line)", background: "var(--panel)" }}
    >
      <div className="border-l-4 p-3 sm:p-4" style={{ borderLeftColor: tone.line }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/sales/leads/${lead.id}`}
              className="block text-base font-black leading-tight text-[var(--heading)] hover:underline"
            >
              {lead.full_name}
            </Link>
            {lead.business_name ? (
              <div className="truncate text-sm font-semibold text-[var(--text)]">
                {lead.business_name}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-black" style={{ color: tone.text }}>
              {waitedLabel(row.lastTouchAt, now)}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              waiting
            </div>
          </div>
        </div>

        <p className="mt-2 text-sm leading-snug text-[var(--muted)]">{whyLine(lead)}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Chip tint={tone.tint} line={tone.line} text={tone.text}>
            {row.reason}
          </Chip>
          {timeline ? <Chip>{timeline}</Chip> : null}
          {value ? <Chip>{value}</Chip> : null}
          {lead.next_follow_up_at ? (
            <Chip>
              <CalendarClock className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {new Date(lead.next_follow_up_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </Chip>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Action
            href={tel}
            disabledLabel="No phone"
            label={lead.phone ? "Call" : "No phone"}
            title={lead.phone ? `Call ${formatPhone(lead.phone)}` : undefined}
            icon={<Phone className="h-4 w-4" aria-hidden="true" />}
            primary
          />
          <Action
            href={sms}
            disabledLabel={lead.phone ? "No consent" : "No phone"}
            label="Text"
            title={
              sms
                ? `Text ${formatPhone(lead.phone)}`
                : "This lead has not consented to texts, or has opted out. Call instead."
            }
            icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
          />
          <Link
            href={`/admin/sales/leads/${lead.id}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border text-sm font-bold text-[var(--text)]"
            style={{ borderColor: "var(--line-strong)" }}
          >
            Open <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </li>
  );
}

function Chip({
  children,
  tint,
  line,
  text,
}: {
  children: React.ReactNode;
  tint?: string;
  line?: string;
  text?: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: tint ?? "var(--fill-2)",
        borderColor: line ?? "var(--line)",
        color: text ?? "var(--muted)",
      }}
    >
      {children}
    </span>
  );
}

function Action({
  href,
  label,
  disabledLabel,
  title,
  icon,
  primary,
}: {
  href: string | null;
  label: string;
  disabledLabel: string;
  title?: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  if (!href) {
    return (
      <span
        title={title}
        className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center gap-1 rounded-lg border text-sm font-bold text-[var(--muted)]"
        style={{ borderColor: "var(--line)", background: "var(--fill-2)" }}
      >
        {disabledLabel}
      </span>
    );
  }
  return (
    <a
      href={href}
      title={title}
      className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border text-sm font-bold"
      style={
        primary
          ? { background: "var(--blue)", borderColor: "var(--blue)", color: "var(--on-accent)" }
          : { borderColor: "var(--line-strong)", color: "var(--text)" }
      }
    >
      {icon}
      {label}
    </a>
  );
}
