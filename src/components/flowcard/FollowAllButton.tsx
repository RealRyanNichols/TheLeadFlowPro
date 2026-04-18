"use client";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

/**
 * Real "follow all in one tap" isn't possible on most platforms (Instagram /
 * TikTok don't expose a follow-from-link API). This button does the closest
 * legit thing: opens every social profile in its own tab, so the visitor only
 * has to tap "Follow" on each — no typing, no searching.
 *
 * On iOS deep-link URLs auto-open the native app, which is even smoother.
 */
export function FollowAllButton({
  links
}: {
  links: { platform: string; url: string; label: string }[];
}) {
  const [state, setState] = useState<"idle" | "opening" | "done">("idle");

  function handleClick() {
    setState("opening");
    // Open each link in a new tab (some browsers may block bulk tabs after the first;
    // in that case we fall back to opening sequentially with a small delay).
    links.forEach((link, i) => {
      setTimeout(() => window.open(link.url, "_blank", "noopener,noreferrer"), i * 120);
    });
    setTimeout(() => setState("done"), links.length * 120 + 400);
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "opening"}
      className="btn-accent w-full text-base"
    >
      {state === "idle" && <>Follow all in one tap <ExternalLink className="h-4 w-4" /></>}
      {state === "opening" && <>Opening… <Loader2 className="h-4 w-4 animate-spin" /></>}
      {state === "done" && <>All opened — tap follow on each <CheckCircle2 className="h-4 w-4" /></>}
    </button>
  );
}
