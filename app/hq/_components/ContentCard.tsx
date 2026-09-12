"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Facebook, Save, ThumbsDown } from "lucide-react";
import type { Content } from "@/lib/hq/types";
import { hqPost } from "./api";
import CopyButton from "./CopyButton";
import { CONTENT_KIND_LABEL, CONTENT_STATUS_TONE } from "./labels";

// One draft, ready to go out. The owner reads it, changes whatever sounds
// wrong, and either approves it or throws it out. Publishing straight to a
// connected Facebook Page is one button; without a Page connected the honest
// answer is copy it, paste it, and tell HQ you posted it.

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

type Shot = { shot?: number; seconds?: string; frame?: string; onScreen?: string };

function shotList(value: unknown): Shot[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Shot => !!v && typeof v === "object");
}

function Extras({ item }: { item: Content }) {
  const extras = item.extras ?? {};

  if (item.kind === "ad") {
    const targeting = (extras.targeting ?? {}) as Record<string, unknown>;
    const questions = strList(extras.formQuestions);
    return (
      <div className="mt-3 grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4 text-sm">
        {str(extras.headline) && (
          <p>
            <span className="hq-eyebrow">Headline</span>
            <span className="mt-1 block font-bold text-[var(--heading)]">{str(extras.headline)}</span>
          </p>
        )}
        {str(extras.description) && (
          <p>
            <span className="hq-eyebrow">Description</span>
            <span className="mt-1 block text-[var(--text)]">{str(extras.description)}</span>
          </p>
        )}
        {str(extras.buttonLabel) && (
          <p>
            <span className="hq-eyebrow">Button</span>
            <span className="mt-1 block text-[var(--text)]">{str(extras.buttonLabel)}</span>
          </p>
        )}
        {questions.length > 0 && (
          <div>
            <p className="hq-eyebrow">Ask them on the form</p>
            <ul className="mt-1 list-disc pl-5 text-[var(--text)]">
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        )}
        {(str(targeting.center) || Number(targeting.radiusMiles) > 0 || str(targeting.note)) && (
          <div>
            <p className="hq-eyebrow">Where to run it</p>
            <p className="mt-1 text-[var(--text)]">
              {str(targeting.center)}
              {Number(targeting.radiusMiles) > 0 ? `, ${Number(targeting.radiusMiles)} mile radius` : ""}
            </p>
            {str(targeting.note) && <p className="mt-1 text-[var(--muted)]">{str(targeting.note)}</p>}
          </div>
        )}
        {str(extras.compliance) && <p className="text-[var(--muted)]">{str(extras.compliance)}</p>}
      </div>
    );
  }

  if (item.kind === "video_script") {
    const shots = shotList(extras.shots);
    const tips = strList(extras.tips);
    return (
      <div className="mt-3 grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4 text-sm">
        <p className="hq-eyebrow">
          Shot list
          {Number(extras.lengthSeconds) > 0 ? ` · ${Number(extras.lengthSeconds)} seconds` : ""}
          {str(extras.orientation) ? ` · hold the phone ${str(extras.orientation) === "vertical" ? "upright" : "sideways"}` : ""}
        </p>
        {shots.length > 0 && (
          <div className="hq-scroll">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  <th scope="col" className="py-2 pr-3 font-extrabold">
                    Time
                  </th>
                  <th scope="col" className="py-2 pr-3 font-extrabold">
                    What to film
                  </th>
                  <th scope="col" className="py-2 font-extrabold">
                    Words on screen
                  </th>
                </tr>
              </thead>
              <tbody>
                {shots.map((shot, i) => (
                  <tr key={`${shot.seconds ?? i}`} className="border-t border-[var(--line)] align-top">
                    <td className="py-2 pr-3 font-bold text-[var(--heading)]">{shot.seconds ?? `Shot ${i + 1}`}</td>
                    <td className="py-2 pr-3 text-[var(--text)]">{shot.frame ?? ""}</td>
                    <td className="py-2 text-[var(--muted)]">{shot.onScreen ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {str(extras.caption) && (
          <div>
            <p className="hq-eyebrow">Caption</p>
            <p className="mt-1 text-[var(--text)]">{str(extras.caption)}</p>
          </div>
        )}
        {tips.length > 0 && (
          <div>
            <p className="hq-eyebrow">Filming it</p>
            <ul className="mt-1 list-disc pl-5 text-[var(--muted)]">
              {tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const note = str(extras.note) || str(extras.ask);
  if (!note) return null;
  return <p className="hq-note mt-3">{note}</p>;
}

export default function ContentCard({ item, facebookConnected }: { item: Content; facebookConnected: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [needsPage, setNeedsPage] = useState(false);

  const dirty = title !== item.title || body !== item.body;

  async function review(decision: "approve" | "reject" | "save", said: string) {
    setBusy(decision);
    setError("");
    setOk("");
    const result = await hqPost("review_content", { content_id: item.id, decision, title, body });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(said);
    router.refresh();
  }

  async function publish() {
    setBusy("publish");
    setError("");
    setOk("");
    setNeedsPage(false);
    const result = await hqPost("publish_content", { content_id: item.id });
    setBusy("");
    if (!result.ok) {
      if (result.status === 409) setNeedsPage(true);
      setError(result.error);
      return;
    }
    setOk("Posted to your Facebook Page.");
    router.refresh();
  }

  async function markPosted() {
    setBusy("mark");
    setError("");
    setOk("");
    const result = await hqPost("mark_published", { content_id: item.id });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNeedsPage(false);
    setOk("Marked as posted.");
    router.refresh();
  }

  return (
    <article id={`content-${item.id}`} className="hq-card scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="hq-eyebrow">{CONTENT_KIND_LABEL[item.kind] ?? item.kind}</p>
          <label className="sr-only" htmlFor={`title-${item.id}`}>
            Title
          </label>
          <input id={`title-${item.id}`} className="hq-input mt-2 font-black" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <span className="hq-pill" data-tone={CONTENT_STATUS_TONE[item.status]}>
          {item.status}
        </span>
      </div>

      {item.hook && (
        <p className="mt-3 text-sm italic leading-relaxed text-[var(--muted)]">
          <span className="hq-eyebrow not-italic">Hook</span> {item.hook}
        </p>
      )}

      <label className="hq-label mt-3" htmlFor={`body-${item.id}`}>
        The words
      </label>
      <textarea id={`body-${item.id}`} className="hq-textarea min-h-[220px]" value={body} onChange={(e) => setBody(e.target.value)} />

      {item.cta && <p className="mt-2 text-sm text-[var(--muted)]">Call to action: {item.cta}</p>}

      <Extras item={item} />

      {error && <p className="hq-error mt-3">{error}</p>}
      {needsPage && (
        <p className="hq-note mt-2">
          Connect your Facebook Page in{" "}
          <Link href="/hq/settings#channels" className="font-bold text-[var(--blue)] hover:underline">
            Settings
          </Link>{" "}
          to post from here. Or copy the words, paste them into Facebook yourself, and tap Mark as posted so the weekly report counts it.
        </p>
      )}
      {ok && !error && <p className="hq-ok mt-3">{ok}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {item.status !== "approved" && (
          <button type="button" className="pro-buy-button" disabled={busy !== ""} onClick={() => review("approve", "Approved.")}>
            <Check aria-hidden="true" className="h-4 w-4" /> {busy === "approve" ? "Saving..." : "Approve"}
          </button>
        )}
        <button type="button" className="hq-btn" disabled={busy !== "" || !dirty} onClick={() => review("save", "Changes saved.")}>
          <Save aria-hidden="true" className="h-4 w-4" /> {busy === "save" ? "Saving..." : dirty ? "Save edits" : "Saved"}
        </button>
        <CopyButton value={body} label="Copy the text" className="hq-btn" />
        {item.kind === "post" && item.status !== "published" && (
          <button type="button" className="hq-btn" disabled={busy !== ""} onClick={publish}>
            <Facebook aria-hidden="true" className="h-4 w-4" />
            {busy === "publish" ? "Posting..." : facebookConnected ? "Publish to Facebook" : "Try publishing to Facebook"}
          </button>
        )}
        {item.status !== "published" && (
          <button type="button" className="hq-btn" disabled={busy !== ""} onClick={markPosted}>
            {busy === "mark" ? "Saving..." : "Mark as posted"}
          </button>
        )}
        {item.status !== "rejected" && (
          <button type="button" className="hq-btn" disabled={busy !== ""} onClick={() => review("reject", "Thrown out.")}>
            <ThumbsDown aria-hidden="true" className="h-4 w-4" /> {busy === "reject" ? "Saving..." : "Throw it out"}
          </button>
        )}
      </div>
    </article>
  );
}
