"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Sparkles } from "lucide-react";
import { hqPost } from "./api";

// Two ways to get something to post. The weekly set is the one the engine
// writes on its own; this button is for when you want it early. The single
// draft is for the thing that came up today, including the reply to a review
// that just landed.

export function DraftWeekButton({ label = "Draft this week" }: { label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    const result = await hqPost("draft_weekly_content");
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <button type="button" className="pro-buy-button" onClick={run} disabled={busy}>
        <Sparkles aria-hidden="true" className="h-4 w-4" /> {busy ? "Writing..." : label}
      </button>
      {error && <p className="hq-error">{error}</p>}
    </div>
  );
}

const KINDS = [
  { value: "post", label: "A post" },
  { value: "ad", label: "A lead ad" },
  { value: "video_script", label: "A video script" },
  { value: "review_reply", label: "A reply to a review" },
] as const;

export function DraftOneForm() {
  const router = useRouter();
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("post");
  const [topic, setTopic] = useState("");
  const [stars, setStars] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    const result = await hqPost("draft_content", {
      kind,
      ...(kind === "review_reply"
        ? { review_stars: Number(stars), review_text: reviewText.trim(), reviewer_name: reviewerName.trim() }
        : { topic: topic.trim() }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk("Written. It is in the list below.");
    setTopic("");
    setReviewText("");
    setReviewerName("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="hq-card">
      <div className="flex items-center gap-2">
        <PenLine aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
        <h2 className="text-lg font-black text-[var(--heading)]">Draft one now</h2>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">Something came up and you want to say it today. Pick what you need and it writes a first version.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="hq-label" htmlFor="draft-kind">
            What do you need
          </label>
          <select id="draft-kind" className="hq-select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>

        {kind === "review_reply" ? (
          <>
            <div>
              <label className="hq-label" htmlFor="draft-stars">
                How many stars
              </label>
              <select id="draft-stars" className="hq-select" value={stars} onChange={(e) => setStars(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="hq-label" htmlFor="draft-reviewer">
                Who wrote it (optional)
              </label>
              <input id="draft-reviewer" className="hq-input" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="hq-label" htmlFor="draft-review">
                What the review said
              </label>
              <textarea id="draft-review" className="hq-textarea" value={reviewText} onChange={(e) => setReviewText(e.target.value)} required />
            </div>
          </>
        ) : (
          <div>
            <label className="hq-label" htmlFor="draft-topic">
              What should it be about (optional)
            </label>
            <input id="draft-topic" className="hq-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Water heater replacement" />
          </div>
        )}
      </div>

      {error && <p className="hq-error mt-4">{error}</p>}
      {ok && !error && <p className="hq-ok mt-4">{ok}</p>}

      <div className="mt-4">
        <button type="submit" className="hq-btn" disabled={busy}>
          {busy ? "Writing..." : "Write it"}
        </button>
      </div>
    </form>
  );
}
