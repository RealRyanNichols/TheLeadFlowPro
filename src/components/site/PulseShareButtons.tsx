"use client";

import { useState } from "react";
import { Copy, Facebook, Linkedin, Share2 } from "lucide-react";

type SharePlatform = "x" | "facebook" | "linkedin" | "copy";

type PulseShareButtonsProps = {
  path: string;
  title: string;
  className?: string;
};

function getVisitorId() {
  const key = "leadflow_public_visitor_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, next);
  return next;
}

const SHARE_OPTIONS: Array<{
  platform: SharePlatform;
  label: string;
  Icon: typeof Share2;
}> = [
  { platform: "x", label: "X", Icon: Share2 },
  { platform: "facebook", label: "Facebook", Icon: Facebook },
  { platform: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { platform: "copy", label: "Copy", Icon: Copy },
];

export function PulseShareButtons({ path, title, className = "" }: PulseShareButtonsProps) {
  const [active, setActive] = useState<SharePlatform | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createShare(platform: SharePlatform) {
    setActive(platform);
    setMessage(null);

    try {
      const response = await fetch("/api/pulse-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: getVisitorId(),
          platform,
          path,
          title,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        shareUrl?: string;
        intentUrl?: string;
        text?: string;
      };

      if (!response.ok || !data.ok || !data.shareUrl) throw new Error("Share link failed");

      const shareText = data.text ? `${data.text} ${data.shareUrl}` : data.shareUrl;
      if (platform === "copy" || !data.intentUrl) {
        await navigator.clipboard?.writeText(shareText);
        setMessage("Tracked link copied. Click-backs will show on Live Pulse.");
        return;
      }

      window.open(data.intentUrl, "_blank", "noopener,noreferrer");
      setMessage("Tracked share opened. Click-backs will show on Live Pulse.");
    } catch {
      setMessage("Could not create the share link. Try again in a minute.");
    } finally {
      setActive(null);
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {SHARE_OPTIONS.map(({ platform, label, Icon }) => (
          <button
            key={platform}
            type="button"
            onClick={() => createShare(platform)}
            disabled={active !== null}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-cyan-300/50 hover:bg-cyan-300/15 disabled:cursor-wait disabled:opacity-60"
          >
            <Icon className="h-4 w-4" />
            {active === platform ? "Creating..." : label}
          </button>
        ))}
      </div>
      {message ? (
        <div className="mt-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs leading-relaxed text-cyan-50">
          {message}
        </div>
      ) : null}
    </div>
  );
}
