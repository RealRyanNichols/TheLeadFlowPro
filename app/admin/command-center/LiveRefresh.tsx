"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const WATCHED_TABLES = [
  "leads",
  "lead_activity",
  "lead_tasks",
  "sales_invoices",
  "purchases",
  "approval_queue",
  "social_posts",
  "projects",
  "milestones",
] as const;

export default function LiveRefresh() {
  const router = useRouter();
  const [lastPulse, setLastPulse] = useState(() => Date.now());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const pulse = () => {
      setLastPulse(Date.now());
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase.channel("leadflow-mission-control");
    WATCHED_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        pulse,
      );
    });

    channel.subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });

    // Realtime is the preferred path. This fallback keeps the board moving even
    // when a table is not yet in the Realtime publication.
    const interval = setInterval(() => {
      setLastPulse(Date.now());
      router.refresh();
    }, 15000);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 text-xs font-bold text-[var(--muted)]">
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-[var(--green)]" : "bg-[var(--warn)]"}`}>
        <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-25 motion-reduce:animate-none" />
      </span>
      <Radio className="h-3.5 w-3.5" aria-hidden="true" />
      {connected ? "Live" : "15s refresh"}
      <span className="sr-only">Last refreshed {new Date(lastPulse).toLocaleTimeString()}</span>
    </div>
  );
}
