"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// The rows of the Uncalled list, and the one write on the page: Mark
// contacted. It runs as the signed-in person under row level security (the
// same way the sales workspace logs a call), so it works for Pat (sales) and
// Ryan (admin): a note, last_contacted_at plus new -> contacted, and a call
// entry in the lead's history. The row leaves at once and comes back with the
// reason if any write fails.

export type UncalledItem = {
  id: string;
  name: string;
  business: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  /** Source, interest, age and status, already worded. */
  meta: string;
  tel: string | null;
  /** Only when texting is allowed (consent, no STOP). */
  sms: string | null;
  textBlocked: string | null;
  reachedOut: boolean;
  href: string;
};

const NOTE_BODY = "Marked contacted from the Uncalled list.";

export default function UncalledList({ items, actorName }: { items: UncalledItem[]; actorName: string }) {
  // Hidden by id rather than copied into state, so a live refresh that lands
  // mid-save cannot bring a row back, and a fresh server list always wins.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setIn = (setter: typeof setHidden, id: string, on: boolean) =>
    setter((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function markContacted(item: UncalledItem) {
    if (saving.has(item.id)) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setIn(setSaving, item.id, true);
    setIn(setHidden, item.id, true);

    const fail = (message: string) => {
      setIn(setHidden, item.id, false);
      setErrors((current) => ({ ...current, [item.id]: message }));
    };

    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      const note = await supabase.from("lead_notes").insert({ lead_id: item.id, body: NOTE_BODY, author: actorName });
      if (note.error) return fail(`Not saved: the note could not be written (${note.error.message}). Nothing changed. Try again.`);

      const stamped = await supabase.from("leads").update({ last_contacted_at: now }).eq("id", item.id).select("id");
      if (stamped.error || !stamped.data?.length) {
        return fail(`The note was saved, but the lead could not be updated (${stamped.error?.message ?? "no access to this lead"}).`);
      }
      // new -> contacted only; any later stage stays where it is.
      const moved = await supabase.from("leads").update({ status: "contacted" }).eq("id", item.id).eq("status", "new");
      if (moved.error) return fail(`The note was saved, but the status could not move to contacted (${moved.error.message}).`);

      const logged = await supabase
        .from("lead_activity")
        .insert({ lead_id: item.id, kind: "call", detail: `${actorName}: marked contacted from the Uncalled list` });
      if (logged.error) return fail(`Marked contacted, but the history entry could not be written (${logged.error.message}).`);
    } catch (error) {
      fail(`Not saved: ${error instanceof Error ? error.message : "the connection dropped"}. Try again.`);
    } finally {
      setIn(setSaving, item.id, false);
    }
  }

  const visible = items.filter((item) => !hidden.has(item.id));
  // A failed save restores its row; its error shows on it.
  return (
    <ol className="grid gap-3">
      {visible.map((item, i) => (
        <li key={item.id} className="card !p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-black text-[var(--heading)]">
                {i + 1}. {item.name}
                {item.business ? <span className="font-semibold text-[var(--muted)]"> at {item.business}</span> : null}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">{item.meta}</div>
              {item.reachedOut ? (
                <p className="mt-2 text-sm font-bold text-[var(--text)]">They texted or called in, and nobody has answered yet.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {item.tel ? (
                <a href={item.tel} className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white">
                  Call {item.phone}
                </a>
              ) : (
                <span className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm text-[var(--muted)]">
                  No phone on file
                </span>
              )}
              {item.sms ? (
                <a href={item.sms} className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--text)]">
                  Text (consented)
                </a>
              ) : item.textBlocked ? (
                <span className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)]" title={item.textBlocked}>
                  No texting
                </span>
              ) : null}
              {item.email ? (
                <a href={`mailto:${item.email}`} className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--text)]">
                  Email
                </a>
              ) : null}
              <Link href={item.href} className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--blue)]">
                Open
              </Link>
              <button
                type="button"
                onClick={() => void markContacted(item)}
                disabled={saving.has(item.id)}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--text)] disabled:opacity-60"
              >
                {saving.has(item.id) ? "Saving..." : "Mark contacted"}
              </button>
            </div>
          </div>
          {errors[item.id] ? (
            <p
              className="mt-3 rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]"
              role="alert"
            >
              {errors[item.id]}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
