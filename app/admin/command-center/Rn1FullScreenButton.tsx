"use client";

import { Maximize2 } from "lucide-react";

/**
 * One click puts the framed RN-1 desk in full screen. Esc comes back. Where a
 * browser will not do full screen for a frame, the desk opens in a new tab.
 * It only changes what is on screen: nothing is read, sent, or stored.
 */
export default function Rn1FullScreenButton({
  frameId,
  href,
  className,
}: {
  frameId: string;
  href: string;
  className?: string;
}) {
  const openFullScreen = () => {
    const openTab = () => {
      window.open(href, "_blank", "noopener,noreferrer");
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
