import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, MessageSquareText, Target, TimerReset } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Business War Room | The LeadFlow Pro" };
export const dynamic = "force-dynamic";

type ClientMission = {
  id: string;
  name: string;
  target_label: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  bottleneck: string | null;
  leads_generated: number;
  contacted: number;
  qualified_conversations: number;
  appointments: number;
  proposals: number;
  response_time_seconds: number | null;
  activity_json: Array<{ at?: string; title?: string; detail?: string }> | null;
};

function progress(current: number, target: number) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export default async function ClientWarRoom() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/war-room");

  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  let projectQuery = supabase
    .from("projects")
    .select("id,name,status,live_url,target_launch,milestones(id,title,status,sort_order)")
    .order("created_at", { ascending: false })
    .limit(1);
  if (!isAdmin) projectQuery = projectQuery.eq("client_id", user.id);
  const { data: projects, error: projectError } = await projectQuery;
  if (projectError) throw new Error("Your War Room is temporarily unavailable.");
  const project = projects?.[0];

  if (!project) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-[var(--line)] bg-white p-8 text-center">
          <Target className="mx-auto h-8 w-8 text-[var(--blue)]" />
          <h1 className="mt-4 text-3xl font-black text-[var(--heading)]">Your War Room opens with your first active mission.</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Once a LeadFlow Pro project is linked to your account, this becomes the live view of the target, activity, bottleneck, delivery milestones, and next move.</p>
          <Link href="/dashboard" className="btn-primary mt-6 inline-flex items-center gap-2">Back to Command Center <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    );
  }

  const { data: missionData, error: missionError } = await supabase
    .from("operator_client_missions")
    .select("id,name,target_label,target_value,current_value,unit,status,bottleneck,leads_generated,contacted,qualified_conversations,appointments,proposals,response_time_seconds,activity_json")
    .eq("project_id", project.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (missionError) throw new Error("Your business mission is temporarily unavailable.");
  const mission = missionData as ClientMission | null;
  const milestones = [...(project.milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const done = milestones.filter((milestone) => milestone.status === "done").length;
  const buildProgress = progress(done, milestones.length);
  const missionProgress = mission ? progress(Number(mission.current_value || 0), Number(mission.target_value || 0)) : 0;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="overflow-hidden rounded-[30px] border border-[#ffffff1f] bg-[#07111f] p-6 text-white shadow-[0_30px_90px_rgba(7,17,31,0.25)] sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#50d4ff]">Client War Room</p>
        <div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">{project.name}</h1><p className="mt-3 text-sm text-[#aabbd2]">{mission ? mission.name : "Delivery mission"} · {project.status.replaceAll("_", " ")}</p></div>
          {project.live_url && <a href={project.live_url} target="_blank" rel="noreferrer" className="rounded-xl bg-[#1240e8] px-5 py-3 text-sm font-black text-white">Open live system</a>}
        </div>

        {mission && <div className="mt-7 rounded-2xl border border-white/10 bg-[#101d31] p-5">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-[#8295b1]">{mission.target_label}</p><p className="mt-1 text-3xl font-black">{mission.current_value} / {mission.target_value} {mission.unit.replaceAll("_", " ")}</p></div><span className="text-2xl font-black text-[#50d4ff]">{missionProgress}%</span></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#1240e8] to-[#35c6f4]" style={{ width: `${missionProgress}%` }} /></div>
        </div>}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["Generated", mission?.leads_generated ?? 0, Target],
          ["Contacted", mission?.contacted ?? 0, MessageSquareText],
          ["Qualified", mission?.qualified_conversations ?? 0, CheckCircle2],
          ["Appointments", mission?.appointments ?? 0, Target],
          ["Proposals", mission?.proposals ?? 0, Gauge],
          ["Response time", mission?.response_time_seconds ? `${Math.round(mission.response_time_seconds / 60)}m` : "—", TimerReset],
        ].map(([label, value, Icon]) => { const C = Icon as typeof Target; return <div key={String(label)} className="rounded-2xl border border-[var(--line)] bg-white p-4"><C className="h-5 w-5 text-[var(--blue)]" /><p className="mt-3 text-xs font-black uppercase tracking-wide text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-black text-[var(--heading)]">{String(value)}</p></div>; })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Current bottleneck</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--heading)]">{mission?.bottleneck || "No measured bottleneck yet"}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">The bottleneck should change when the data changes. It is not a permanent label. The point of the War Room is to make the next constraint visible before it becomes a month-long leak.</p>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Delivery</p><h2 className="mt-2 text-2xl font-black text-[var(--heading)]">{done} of {milestones.length} milestones complete</h2></div><span className="text-xl font-black text-[var(--blue)]">{buildProgress}%</span></div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--fill-2)]"><div className="h-full rounded-full bg-[var(--blue)]" style={{ width: `${buildProgress}%` }} /></div>
          <ul className="mt-5 space-y-2">{milestones.slice(0, 6).map((milestone) => <li key={milestone.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm"><span className="font-bold text-[var(--heading)]">{milestone.title}</span><span className="text-xs font-black uppercase text-[var(--muted)]">{milestone.status.replaceAll("_", " ")}</span></li>)}</ul>
        </section>
      </div>

      {mission?.activity_json && mission.activity_json.length > 0 && <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Live work log</p><div className="mt-4 space-y-4">{mission.activity_json.slice(0, 12).map((item, index) => <div key={`${item.at || "activity"}-${index}`} className="border-l-2 border-[var(--accent-line)] pl-4"><p className="font-black text-[var(--heading)]">{item.title || "System activity"}</p>{item.detail && <p className="mt-1 text-sm text-[var(--muted)]">{item.detail}</p>}{item.at && <p className="mt-1 text-xs text-[var(--quiet)]">{item.at}</p>}</div>)}</div></section>}
    </section>
  );
}
