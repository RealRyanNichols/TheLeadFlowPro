"use client";

import { useState } from "react";
import { Star, Copy, Check, ExternalLink } from "lucide-react";

// Direct Google review link from a Place ID, plus a QR code image for print.
// Place ID finder is linked for people who do not know theirs.
export default function ReviewLinkTool() {
  const [placeId, setPlaceId] = useState("");
  const [copied, setCopied] = useState(false);

  const link = placeId.trim()
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId.trim())}`
    : "";
  const qr = link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=png&data=${encodeURIComponent(link)}`
    : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <Star className="h-6 w-6 text-warn" />
        <h2 className="text-xl font-black text-[var(--heading)]">Google Review Link + QR Maker</h2>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Paste your Google Place ID. Get a one-tap review link and a QR code you can put
        on receipts, invoices, counters, and truck doors.
      </p>
      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-semibold text-[var(--text)]">
          Your Google Place ID
        </span>
        <input
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          placeholder="ChIJ..."
          className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 py-2.5 text-sm text-[var(--heading)] placeholder:text-[var(--quiet)] focus:border-[var(--accent-line)] focus:outline-none"
        />
      </label>
      <p className="mt-2 text-xs text-[var(--quiet)]">
        Do not know it? Search your business name in Google&apos;s{" "}
        <a
          href="https://developers.google.com/maps/documentation/places/web-service/place-id"
          target="_blank"
          rel="noreferrer"
          className="font-bold text-[var(--blue)] underline"
        >
          Place ID Finder
        </a>{" "}
        and paste what it gives you.
      </p>
      {link && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2.5 text-xs text-[var(--blue)]">
              {link}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--fill-2)] px-3 py-2.5 text-sm font-bold text-[var(--heading)] hover:border-[var(--accent-line)]"
            >
              {copied ? <Check className="h-4 w-4 text-[var(--green)]" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--fill-2)] px-3 py-2.5 text-sm font-bold text-[var(--heading)] hover:border-[var(--accent-line)]"
            >
              <ExternalLink className="h-4 w-4" />
              Test it
            </a>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code for your Google review link" width={280} height={280} />
            <span className="text-xs font-bold text-[var(--quiet)]">
              Right-click or long-press to save. Print it everywhere.
            </span>
          </div>
        </div>
      )}
      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        Want reviews on autopilot after every job?{" "}
        <a href="https://www.theleadflowpro.com/free-build" className="font-bold text-[var(--blue)] underline" target="_top">
          I will build that free.
        </a>
      </p>
    </div>
  );
}
