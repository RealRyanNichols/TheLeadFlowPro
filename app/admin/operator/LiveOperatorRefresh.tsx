"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const WATCHED_TABLES = [
  "operator_missions",
  "operator_workers",
  "operator_runs",
  "operator_run_events",
  "operator_approvals",
  "operator_prospects",
  "operator_outreach_actions",
  "operator_outreach_events",
  "operator_workspace_settings",
  "operator_client_missions",
  "operator_daily_episodes",
  "operator_manual_cash_events",
  "leads",
  "lead_activity",
  "lead_tasks",
  "purchases",
  "sales_invoices",
  "projects",
  "milestones",
  "social_posts",
] as const;

export default function LiveOperatorRefresh() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [lastPulse, setLastPulse] = useState(() => Date.now());

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const pulse = () => {
      setLastPulse(Date.now());
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase.channel("leadflow-operatoros-live");
    WATCHED_TABLES.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, pulse);
    });
    channel.subscribe((status: string) => setConnected(status === "SUBSCRIBED"));

    const fallback = setInterval(() => {
      setLastPulse(Date.now());
      router.refresh();
    }, 15_000);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[#ffffff24] bg-[#111c30] px-3 text-xs font-bold text-[#b8c5d9]">
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`}>
        <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-30 motion-reduce:animate-none" />
      </span>
      <Radio className="h-3.5 w-3.5" aria-hidden="true" />
      {connected ? "Live" : "15s refresh"}
      <span className="sr-only">Last pulse {new Date(lastPulse).toLocaleTimeString()}</span>
    </div>
  );
}
