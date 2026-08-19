import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  FileText,
  FolderOpen,
  MessageSquareText,
  Rocket,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import DeliverableReview, { type ReviewDeliverable } from "./DeliverableReview";

export const metadata = { title: "Your Build Room | The LeadFlow Pro" };

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sort_order: number;
  due_date: string | null;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  target_launch: string | null;
  live_url: string | null;
  repo_url: string | null;
  milestones: Milestone[] | null;
  deliverables: ReviewDeliverable[] | null;
};

const STAGES = [
  { key: "discovery", label: "Map" },
  { key: "design", label: "Design" },
  { key: "build", label: "Build" },
  { key: "launch", label: "Review" },
  { key: "live", label: "Launch" },
];

const PROJECT_STAGE_INDEX: Record<string, number> = {
  discovery: 0,
  design: 1,
  build: 2,
  launch: 3,
  live: 4,
  support: 4,
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default async function BuildRoom() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/build-room");

  const [profileResult, projectsResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("projects")
      .select("id, name, description, status, target_launch, live_url, repo_url, milestones(*), deliverables(*)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error || projectsResult.error) {
    throw new Error("Build room data is temporarily unavailable.");
  }

  const profile = profileResult.data;
  const projects = (projectsResult.data ?? []) as Project[];
  const project = projects[0];
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  if (!project) {
    return (
      <section className="mx-auto min-h-[calc(100vh-72px)] max-w-6xl px-4 py-10 sm:py-14">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--blue)] hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
        </Link>
        <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_24px_80px_rgba(10,18,32,0.08)]">
          <div className="border-b border-[var(--line)] bg-[#0a1220] px-6 py-7 text-white sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8fe3ff]">Client build room</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your build room is ready, {firstName}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b8c3d9]">Nothing is hidden behind email threads. Once your project is created, this is where the map, milestones, files, review items, and launch path will live.</p>
          </div>
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="grid grid-cols-5 gap-2" aria-label="Build stages">
                {STAGES.map((stage, index) => (
                  <div key={stage.key} className="text-center">
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border ${index === 0 ? "border-[var(--blue)] bg-[var(--accent-tint)] text-[var(--blue)]" : "border-[var(--line-strong)] bg-[var(--fill-2)] text-[var(--quiet)]"}`}>
                      {index + 1}
                    </div>
                    <p className="mt-2 text-[11px] font-bold text-[var(--muted)] sm:text-xs">{stage.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--fill-2)] p-8 text-center sm:p-12">
                <FolderOpen className="mx-auto h-9 w-9 text-[var(--blue)]" aria-hidden="true" />
                <h2 className="mt-4 text-2xl font-black text-[var(--heading)]">No active build yet</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Your account is working. A project record has not been created for you yet, so this room stays at the starting line until there is real progress to show.</p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/start" className="btn-primary inline-flex items-center justify-center gap-2">Map my company <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                  <Link href="/dashboard" className="btn-ghost inline-flex items-center justify-center gap-2"><MessageSquareText className="h-4 w-4" aria-hidden="true" /> Message the team</Link>
                </div>
              </div>
            </div>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-[var(--line)] p-5">
                <h2 className="font-black text-[var(--heading)]">What appears here</h2>
                <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                  {["The approved company map", "Milestones and target dates", "Files and working versions", "The current next action", "Launch links when ready"].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--green)]" aria-hidden="true" />{item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-5">
                <h2 className="font-black text-[var(--heading)]">Your business stays yours</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">The code, database, domain, vendor accounts, and customer relationships are organized in accounts you control.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    );
  }

  const milestones = [...(project.milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const deliverables = [...(project.deliverables ?? [])].sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
  const doneCount = milestones.filter((item) => item.status === "done").length;
  const progress = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;
  const activeMilestone = milestones.find((item) => item.status === "in_progress") || milestones.find((item) => item.status !== "done");
  const activeStage = PROJECT_STAGE_INDEX[project.status] ?? -1;

  return (
    <section className="mx-auto min-h-[calc(100vh-72px)] max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--blue)] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard</Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--blue)]">Client build room</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--heading)] sm:text-4xl">{project.name}</h1>
          {project.description && <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{project.description}</p>}
        </div>
        <Link href="/dashboard" className="btn-ghost inline-flex items-center justify-center gap-2"><MessageSquareText className="h-4 w-4" aria-hidden="true" /> Message the team</Link>
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-7">
        <div className="grid grid-cols-5 gap-2" aria-label={`Project is in ${STAGES[activeStage]?.label || project.status}`}>
          {STAGES.map((stage, index) => {
            const complete = activeStage >= 0 && (index < activeStage || project.status === "live" || project.status === "support");
            const current = index === activeStage && project.status !== "live";
            return <div key={stage.key} className="relative text-center"><div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 ${complete ? "border-[var(--green)] bg-[var(--green-tint)] text-[var(--green)]" : current ? "border-[var(--blue)] bg-[var(--accent-tint)] text-[var(--blue)]" : "border-[var(--line-strong)] bg-[var(--fill-2)] text-[var(--quiet)]"}`}>{complete ? <Check className="h-5 w-5" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}</div><p className={`mt-2 text-[11px] font-bold sm:text-sm ${current ? "text-[var(--heading)]" : "text-[var(--muted)]"}`}>{stage.label}</p></div>;
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Milestones</p><h2 className="mt-1 text-xl font-black text-[var(--heading)]">The path to launch</h2></div><span className="text-sm font-bold text-[var(--blue)]">{progress}%</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--fill-3)]"><div className="h-full rounded-full bg-[var(--blue)]" style={{ width: `${progress}%` }} /></div>
            {milestones.length ? <ol className="mt-6 divide-y divide-[var(--line)]">{milestones.map((item) => <li key={item.id} className="flex gap-4 py-4"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.status === "done" ? "bg-[var(--green-tint)] text-[var(--green)]" : item.status === "in_progress" ? "bg-[var(--accent-tint)] text-[var(--blue)]" : "bg-[var(--fill-2)] text-[var(--quiet)]"}`}>{item.status === "done" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clock3 className="h-4 w-4" aria-hidden="true" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-[var(--heading)]">{item.title}</p>{item.due_date && <span className="text-xs text-[var(--muted)]">Due {displayDate(item.due_date)}</span>}</div>{item.description && <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.description}</p>}</div></li>)}</ol> : <p className="mt-6 text-sm text-[var(--muted)]">Milestones have not been added yet.</p>}
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
            <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" /><h2 className="text-xl font-black text-[var(--heading)]">Files and deliverables</h2></div>
            <DeliverableReview initialDeliverables={deliverables} />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--blue)]">Waiting on the build</p>
            <h2 className="mt-2 text-xl font-black text-[var(--heading)]">{activeMilestone?.title || "Next milestone is being prepared"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{activeMilestone?.description || "The LeadFlow Pro team will update this room when the next review item or decision is ready."}</p>
            {activeMilestone?.due_date && <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--heading)]"><CalendarDays className="h-4 w-4 text-[var(--blue)]" aria-hidden="true" /> Target {displayDate(activeMilestone.due_date)}</p>}
          </section>
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
            <Rocket className="h-6 w-6 text-[var(--blue)]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-black text-[var(--heading)]">Launch target</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{project.target_launch ? displayDate(project.target_launch) : "Set after the map and scope are approved."}</p>
            {project.live_url && <a href={project.live_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 font-bold text-[var(--blue)] hover:underline">Open live system <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>}
          </section>
        </aside>
      </div>
    </section>
  );
}
