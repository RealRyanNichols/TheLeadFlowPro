import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import MessageThread, { type Msg } from "@/components/MessageThread";

export const metadata = { title: "Your Dashboard | The LeadFlow Pro" };

const STATUS_LABELS: Record<string, string> = {
  discovery: "Discovery",
  design: "Design",
  build: "Build",
  launch: "Launch prep",
  live: "Live",
  support: "Support",
  paused: "Paused",
};

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("*, milestones(*), deliverables(*)")
    .order("created_at", { ascending: false });

  const { data: threadMessages } = await supabase
    .from("messages")
    .select("id, body, sender, created_at")
    .eq("thread_profile_id", user!.id)
    .order("created_at");

  // Training progress: published lessons in published courses vs completions.
  const { data: publishedLessons } = await supabase
    .from("lessons")
    .select("id, courses!inner(is_published)")
    .eq("is_published", true)
    .eq("courses.is_published", true);
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", user!.id);
  const publishedIds = new Set((publishedLessons ?? []).map((l) => l.id));
  const completedCount = new Set(
    (progress ?? []).map((p) => p.lesson_id).filter((id) => publishedIds.has(id)),
  ).size;
  const lessonCount = publishedIds.size;
  const trainingPct = lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">
            {profile?.full_name ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Your Dashboard"}
          </h1>
          <p className="mt-1 text-slate-400">
            Your projects, your progress, your platform.
          </p>
        </div>
        <SignOutButton />
      </div>

      {(!projects || projects.length === 0) && (
        <div className="card mt-8 text-center">
          <h2 className="text-xl font-bold text-white">No active projects yet</h2>
          <p className="mt-2 text-slate-400">
            Once we kick off your build, every milestone and deliverable shows up
            here. In the meantime, the training area is open.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/training" className="btn-primary">
              Go to Training
            </Link>
            <Link href="/book" className="btn-ghost">
              Book a Call
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {projects?.map((p) => {
          const milestones = (p.milestones ?? []).sort(
            (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
          );
          const done = milestones.filter((m: { status: string }) => m.status === "done").length;
          const pct = milestones.length ? Math.round((done / milestones.length) * 100) : 0;

          return (
            <div key={p.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-white">{p.name}</h2>
                <span className="rounded-full bg-flow-600/20 px-3 py-1 text-xs font-bold text-flow-400">
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
              {p.description && <p className="mt-2 text-sm text-slate-400">{p.description}</p>}

              {milestones.length > 0 && (
                <>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full bg-mint" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {done} of {milestones.length} milestones done ({pct}%)
                  </p>
                  <ul className="mt-4 space-y-2">
                    {milestones.map((m: { id: string; title: string; status: string }) => (
                      <li key={m.id} className="flex items-center gap-3 text-sm">
                        <span
                          className={
                            m.status === "done"
                              ? "text-mint"
                              : m.status === "in_progress"
                                ? "text-warn"
                                : "text-slate-600"
                          }
                        >
                          {m.status === "done" ? "●" : m.status === "in_progress" ? "◐" : "○"}
                        </span>
                        <span className={m.status === "done" ? "text-slate-400 line-through" : "text-slate-200"}>
                          {m.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {(p.deliverables ?? []).length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                    Your deliverables
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {p.deliverables.map((d: { id: string; title: string; url: string | null; kind: string }) => (
                      <li key={d.id} className="text-sm">
                        {d.url ? (
                          <a href={d.url} target="_blank" rel="noreferrer" className="text-flow-400 underline">
                            {d.title}
                          </a>
                        ) : (
                          <span className="text-slate-200">{d.title}</span>
                        )}
                        <span className="ml-2 text-xs text-slate-400">({d.kind})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lessonCount > 0 && (
        <div className="card mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-white">Training progress</h2>
            <span className="text-sm text-slate-400">
              {completedCount} of {lessonCount} lessons complete
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-mint" style={{ width: `${trainingPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-400">{trainingPct}% of the published curriculum</p>
          <div className="mt-4">
            <Link href="/training" className="btn-primary">
              {completedCount === 0 ? "Start Training" : "Continue Training"}
            </Link>
          </div>
        </div>
      )}

      <div className="card mt-8">
        <h2 className="text-lg font-bold text-white">Message Ryan</h2>
        <p className="mb-4 mt-1 text-sm text-slate-400">
          Questions about your project or the training land straight in my back
          office.
        </p>
        <MessageThread
          threadProfileId={user!.id}
          initialMessages={(threadMessages ?? []) as Msg[]}
          senderRole="client"
        />
      </div>
    </section>
  );
}
