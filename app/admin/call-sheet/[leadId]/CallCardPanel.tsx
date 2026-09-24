"use client";

import { useRouter } from "next/navigation";
import CallOutcomePanel, { type CallOutcomePanelProps } from "../CallOutcomePanel";

// The call card's outcome panel, plus a server refresh after each save so the
// header (the call back time, the last notes, the unanswered-try count) shows
// what was just written. The refresh keeps the panel's own state, so the
// success message and the pay links stay on screen. A server page cannot pass
// a callback into a client component, which is the only reason this file
// exists; the panel itself stays free of the Next.js router.

export default function CallCardPanel(props: Omit<CallOutcomePanelProps, "onSaved">) {
  const router = useRouter();
  return <CallOutcomePanel {...props} onSaved={() => router.refresh()} />;
}
