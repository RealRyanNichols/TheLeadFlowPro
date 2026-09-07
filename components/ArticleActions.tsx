"use client";

import { useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";

export default function ArticleActions({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const [status, setStatus] = useState("");
  const url = `https://www.theleadflowpro.com/articles/${slug}`;
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: "A practical guide from The LeadFlow Pro.",
          url,
        });
        setStatus("Sharing window closed.");
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied. Send it to someone who can use it.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(`Copy this link to share: ${url}`);
    }
  }
  return (
    <aside
      className="article-actions mb-8 rounded-2xl border border-[var(--line)] bg-[var(--fill-1)] p-5"
      aria-label="Save or share this guide"
    >
      <p className="font-bold text-[var(--heading)]">
        Keep it. Use it. Pass it on.
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--quiet)]">
        Save a text copy, print it, or share the link with your team. Follow the
        tool links online to run your own numbers.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          className="cb-btn cb-btn--primary"
          href={`/articles/${slug}/download`}
          download
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Save guide
        </a>
        <button className="cb-btn cb-btn--secondary" onClick={share}>
          <Share2 className="h-4 w-4" aria-hidden="true" /> Share guide
        </button>
        <button
          className="cb-btn cb-btn--secondary"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" aria-hidden="true" /> Print guide
        </button>
      </div>
      <p
        className="mt-2 break-words text-sm text-[var(--quiet)]"
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
    </aside>
  );
}
