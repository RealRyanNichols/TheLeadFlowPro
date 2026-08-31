import Link from "next/link";
import { ArrowRight, Bot, CalendarCheck, CheckCircle2, CircleAlert, KeyRound, Mail, Radio, ShieldCheck, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import OperatorSetupForm from "./OperatorSetupForm";

export const metadata = { title: "OperatorOS Setup | The LeadFlow Pro" };
export const dynamic = "force-dynamic";

type Settings = {
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  booking_url: string | null;
  outbound_owner: string;
  closer_owner: string;
  default_market: string;
  daily_new_contact_limit: number;
  daily_followup_limit: number;
  reply_target_minutes: number;
  business_timezone: string;
  allowed_channels: string[];
  operator_notes: string | null;
};

const DEFAULT_SETTINGS: Settings = {
  sender_name: "Ryan Nichols",
  sender_email: "hello@theleadflowpro.com",
  sender_phone: null,
  booking_url: null,
  outbound_owner: "Pat",
  closer_owner: "Ryan",
  default_market: "Longview, TX",
  daily_new_contact_limit: 50,
  daily_followup_limit: 20,
  reply_target_minutes: 15,
  business_timezone: "America/Chicago",
  allowed_channels: ["email", "dm", "phone", "text"],
  operator_notes: null,
};

function readinessTone(ready: boolean) {
  return ready
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-amber-200 bg-amber-50 text-amber-950";
}

export default async function OperatorSetup() {
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("operator_workspaces")
    .select("id")
    .eq("slug", "the-leadflow-pro")
    .single();
  if (workspaceError || !workspace) throw new Error("OperatorOS workspace is unavailable.");

  const [settingsResult, prospectsResult, socialResult, missionResult] = await Promise.all([
    supabase
      .from("operator_workspace_settings")
      .select("sender_name,sender_email,sender_phone,booking_url,outbound_owner,closer_owner,default_market,daily_new_contact_limit,daily_followup_limit,reply_target_minutes,business_timezone,allowed_channels,operator_notes")
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase
      .from("operator_prospects")
      .select("id,contact_email,contact_phone,contact_verified_at")
      .eq("workspace_id", workspace.id),
    supabase
      .from("social_connections")
      .select("provider,page_name,status,last_verified_at,last_error")
      .eq("provider", "facebook")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("operator_missions")
      .select("name,target_value,unit,status")
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError = [settingsResult, prospectsResult, socialResult, missionResult]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw new Error(`OperatorOS setup is temporarily unavailable: ${firstError.message}`);

  const settings = (settingsResult.data || DEFAULT_SETTINGS) as Settings;
  const prospects = prospectsResult.data ?? [];
  const contactLoaded = prospects.filter((prospect) => prospect.contact_email || prospect.contact_phone).length;
  const contactVerified = prospects.filter((prospect) => prospect.contact_verified_at).length;
  const social = socialResult.data;

  const readiness = [
    {
      label: "AI provider",
      ready: Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
      note: process.env.OPENAI_API_KEY ? "ChatGPT configured" : process.env.ANTHROPIC_API_KEY ? "Claude configured" : "Add an OpenAI or Anthropic key in Vercel",
      icon: Bot,
    },
    {
      label: "Execution switch",
      ready: process.env.OPERATOROS_EXECUTION_ENABLED === "true",
      note: process.env.OPERATOROS_EXECUTION_ENABLED === "true" ? "Provider calls enabled" : "Safe pause is still on",
      icon: ShieldCheck,
    },
    {
      label: "Owner email",
      ready: Boolean(process.env.RESEND_API_KEY),
      note: process.env.RESEND_API_KEY ? "Resend configured" : "Add RESEND_API_KEY in Vercel",
      icon: Mail,
    },
    {
      label: "Cron + service access",
      ready: Boolean(process.env.CRON_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY),
      note: process.env.CRON_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY ? "Nightly jobs can run" : "Add the missing server-only variables",
      icon: KeyRound,
    },
    {
      label: "Facebook publisher",
      ready: social?.status === "active" || social?.status === "connected",
      note: social ? `${social.page_name || "Facebook page"} · ${social.status}` : "No Facebook page connection found",
      icon: Radio,
    },
    {
      label: "Booking path",
      ready: Boolean(settings.booking_url),
      note: settings.booking_url ? "Booking URL stored" : "Add the calendar link prospects should receive",
      icon: CalendarCheck,
    },
    {
      label: "Prospect contacts",
      ready: contactVerified > 0,
      note: `${contactLoaded}/${prospects.length} have a route · ${contactVerified} human verified`,
      icon: UsersRound,
    },
    {
      label: "Revenue mission",
      ready: Boolean(missionResult.data),
      note: missionResult.data ? `${missionResult.data.name} · ${Number(missionResult.data.target_value || 0).toLocaleString("en-US")} ${missionResult.data.unit || ""}` : "No active mission",
      icon: CheckCircle2,
    },
  ];

  const readyCount = readiness.filter((item) => item.ready).length;

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[28px] border border-[#ffffff1f] bg-[#07111f] p-6 text-white shadow-[0_30px_90px_rgba(7,17,31,0.24)] sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#50d4ff]">OperatorOS activation</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Inputs, access, and stoplines</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b8c5d9]">This page separates what is already built from what still needs a human decision, a business contact, or a server-side credential. Secrets are never displayed here.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101d31] px-5 py-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#8295b1]">Activation readiness</p>
            <p className="mt-1 text-3xl font-black">{readyCount}/{readiness.length}</p>
            <p className="mt-1 text-xs text-[#aabbd2]">controls ready</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {readiness.map(({ label, ready, note, icon: Icon }) => (
          <section key={label} className={`rounded-2xl border p-4 ${readinessTone(ready)}`}>
            <div className="flex items-center justify-between gap-2"><Icon className="h-5 w-5" />{ready ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</div>
            <p className="mt-3 text-xs font-black uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-sm font-bold leading-5">{note}</p>
          </section>
        ))}
      </div>

      <OperatorSetupForm settings={settings} />

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6">
        <h2 className="text-xl font-black text-[var(--heading)]">What happens after these inputs are complete</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Link href="/admin/operator/prospects" className="rounded-xl border border-[var(--line)] p-4 hover:border-[var(--accent-line)] hover:bg-[var(--accent-tint)]"><p className="font-black text-[var(--heading)]">1. Verify the first contacts</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Load decision-maker details, review the evidence, edit the draft, approve it, send it yourself, then mark it sent.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--blue)]">Open Prospect Command <ArrowRight className="h-3.5 w-3.5" /></span></Link>
          <Link href="/admin/operator/growth" className="rounded-xl border border-[var(--line)] p-4 hover:border-[var(--accent-line)] hover:bg-[var(--accent-tint)]"><p className="font-black text-[var(--heading)]">2. Replace assumptions</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">As replies, calls, proposals, and closes accumulate, Goal Mode should use the measured conversion rates instead of the starting model.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--blue)]">Open Goal Mode <ArrowRight className="h-3.5 w-3.5" /></span></Link>
          <Link href="/proof-floor" target="_blank" className="rounded-xl border border-[var(--line)] p-4 hover:border-[var(--accent-line)] hover:bg-[var(--accent-tint)]"><p className="font-black text-[var(--heading)]">3. Publish proof, not private data</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">The Proof Floor stays aggregate. The Episode Engine drafts the story. A human still decides what becomes a public post.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--blue)]">Open the Proof Floor <ArrowRight className="h-3.5 w-3.5" /></span></Link>
        </div>
      </section>
    </div>
  );
}
