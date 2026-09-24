"use client";

import { Maximize2 } from "lucide-react";

/**
 * Puts the framed Business dashboard in full screen. Esc comes back. Where a
 * browser will not do full screen for a frame, the dashboard opens signed in
 * in its own tab instead. It only changes what is on screen.
 */
export default function BusinessFullScreenButton({
  frameId,
  fallbackHref,
  className,
}: {
  frameId: string;
  fallbackHref: string;
  className?: string;
}) {
  const openFullScreen = () => {
    const openTab = () => {
      window.open(fallbackHref, "_blank", "noopener,noreferrer");
    };
    const frame = document.getElementById(frameId);
    if (!frame || typeof frame.requestFullscreen !== "function") {
      openTab();
      return;
    }
    try {
      frame.requestFullscreen().catch(openTab);
    } catch {
      openTab();
    }
  };

  return (
    <button type="button" onClick={openFullScreen} className={className}>
      <Maximize2 className="h-4 w-4" aria-hidden="true" />
      Full screen
    </button>
  );
}
