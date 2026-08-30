import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  FileText,
  GraduationCap,
  MessageSquareText,
  Rocket,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signDeliverableFile } from "@/lib/deliverableFiles";
import SignOutButton from "@/components/SignOutButton";
import MessageThread, { type Msg } from "@/components/MessageThread";
import { canAccessCourse, getTrainingEntitlements } from "@/lib/access";

export const metadata = { title: "Command Center | The LeadFlow Pro" };

// The client command center. The first thing a client sees after login:
// their build, their numbers, their files, their next step. Every figure on
// this page is real data from their own project rows. Nothing is decorated.

const STATUS_LABELS: Record<string, string> = {
  discovery: "Discovery",
  design: "Design",
  build: "In build",
  launch: "Launch prep",
  live: "Live",
  support: "Live + supported",
  paused: "Paused",
};

type MilestoneRow = { id: string; title: string; status: string; sort_order: number };
type DeliverableRow = {
  id: string;
  title: string;
  kind: string;
  status: string;
  url: string | null;
  file_path: string | null;
  visible_to_client: boolean;
  requires_approval: boolean;
  client_decision: string;
  created_at: string;
  sort_order: number;
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T12:00:00Z`).getTime();
  const days = Math.ceil((target - Date.now()) / 86400000);
  return Number.isFinite(days) ? days : null;
}

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

  const entitlements = await getTrainingEntitlements();
  const { data: publishedCourses } = await supabase
    .from("courses")
    .select("id, slug, is_free")
    .eq("is_published", true);
  const accessibleCourseIds = (publishedCourses ?? [])
    .filter((course) => canAccessCourse(course, entitlements))
    .map((course) => course.id);
  const publishedLessonsResult = accessibleCourseIds.length
    ? await supabase
        .from("lessons")
        .select("id")
        .eq("is_published", true)
        .in("course_id", accessibleCourseIds)
    : { data: [] as { id: string }[] };
  const publishedLessons = publishedLessonsResult.data;
  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", user!.id);
  const publishedIds = new Set((publishedLessons ?? []).map((l) => l.id));
  const completedCount = new Set(
    (progressRows ?? []).map((p) => p.lesson_id).filter((id) => publishedIds.has(id)),
  ).size;
  const lessonCount = publishedIds.size;
  const trainingPct = lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0;

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const project = (projects ?? [])[0] as
    | (Record<string, unknown> & {
        id: string;
        name: string;
        status: string;
        live_url: string | null;
        target_launch: string | null;
        old_platform: string | null;
        old_monthly_cost: number | null;
        new_monthly_cost: number | null;
        milestones: MilestoneRow[] | null;
        deliverables: DeliverableRow[] | null;
      })
    | undefined;

  const milestones = [...(project?.milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const doneCount = milestones.filter((m) => m.status === "done").length;
  const buildPct = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;
  const activeMilestone =
    milestones.find((m) => m.status === "in_progress") || milestones.find((m) => m.status !== "done");

  const visibleDeliverables = [...(project?.deliverables ?? [])]
    .filter((d) => d.visible_to_client)
    .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
  const signedDeliverables = await Promise.all(
    visibleDeliverables.map(async (d) => ({ ...d, file_url: await signDeliverableFile(d.file_path) })),
  );
  const deliveredCount = signedDeliverables.filter(
    (d) => d.status === "delivered" || d.status === "approved",
  ).length;
  const awaitingReview = signedDeliverables.filter(
    (d) => d.requires_approval && d.status === "ready_for_review" && d.client_decision === "pending",
  ).length;

  const launchDays = daysUntil(project?.target_launch ?? null);
  const oldCost = Number(project?.old_monthly_cost ?? 0);
  const newCost = Number(project?.new_monthly_cost ?? 0);
  const monthlySavings = oldCost > 0 && oldCost > newCost ? Math.round(oldCost - newCost) : 0;

  const stats: { label: string; value: string; sub: string }[] = [];
  if (project) {
    stats.push({ label: "Build progress", value: `${buildPct}%`, sub: `${doneCount} of ${milestones.length || 0} milestones done` });
    stats.push({ label: "Delivered to you", value: String(deliveredCount), sub: awaitingReview ? `${awaitingReview} waiting on your review` : "everything reviewed" });
    if (launchDays !== null) {
      stats.push({
        label: launchDays >= 0 ? "To target launch" : "Since target date",
        value: `${Math.abs(launchDays)}d`,
        sub: project.status === "live" || project.status === "support" ? "your system is live" : "target can move with scope",
      });
    }
    if (monthlySavings > 0) {
      stats.push({ label: "Monthly rent replaced", value: `$${monthlySavings.toLocaleString("en-US")}`, sub: `vs ${project.old_platform || "your old platform"}` });
    }
  }

  return (
    <>
      <style>{`.cc-dark h1, .cc-dark h2, .cc-dark h3 { color: #f4f6fa !important; }`}</style>

      {/* Command hero — dark glass, real numbers */}
      <section className="cc-dark bg-[#0a1220]">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#35c6f4]">
                Your command center
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                {firstName}, here is your business system.
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[#a8b4c8]">
                {project
                  ? `${project.name} · ${STATUS_LABELS[project.status] ?? project.status}. Everything on this page is live data from your build.`
                  : "The moment your build kicks off, this page turns into live progress, files, and launch dates."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {project?.live_url && (
                <a href={project.live_url} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1240e8] px-5 text-sm font-extrabold text-white shadow-[0_0_28px_#1240e880]">
                  <Rocket className="h-4 w-4" aria-hidden="true" /> Open my live system
                </a>
              )}
              <Link href="/dashboard/build-room" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#ffffff2e] px-5 text-sm font-bold text-[#e6ebf4]">
                Build Room <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <SignOutButton className="inline-flex min-h-[44px] items-center rounded-xl border border-[#ffffff1f] px-4 text-xs font-bold text-[#8b97ad]" />
            </div>
          </div>

          {stats.length > 0 && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-[#ffffff1f] bg-[#111c30] p-5 shadow-[0_0_40px_#1240e81f]">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#8b97ad]">{stat.label}</p>
                  <p className="mt-1 text-3xl font-black text-white [text-shadow:0_0_24px_#5b87ff4d]">{stat.value}</p>
                  <p className="mt-1 text-xs text-[#a8b4c8]">{stat.sub}</p>
                </div>
              ))}
            </div>
          )}

          {project && milestones.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#ffffff1f] bg-[#111c30] p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#8b97ad]">
                  {activeMilestone ? `Now building: ${activeMilestone.title}` : "Every milestone is done"}
                </p>
                <span className="text-sm font-extrabold text-[#35c6f4]">{buildPct}%</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#ffffff14]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#1240e8] to-[#35c6f4] shadow-[0_0_18px_#5b87ff99]" style={{ width: `${buildPct}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Light body — files, training, messages */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {!project && (
          <div className="card text-center">
            <h2 className="text-xl font-bold text-[var(--heading)]">No active build yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-[var(--muted)]">
              Once we kick off your build, every milestone, file, and launch date lands here.
              In the meantime the training area is open, and the team is one message away.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link href="/training" className="btn-primary">Go to Training</Link>
              <Link href="/book" className="btn-ghost">Book a Call</Link>
            </div>
          </div>
        )}

        {project && (
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
                <h2 className="text-lg font-bold text-[var(--heading)]">Delivered to you</h2>
              </div>
              <Link href="/dashboard/build-room" className="inline-flex items-center gap-1 text-sm font-bold text-[var(--blue)] hover:underline">
                Review and approve in the Build Room <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {signedDeliverables.length ? (
              <ul className="mt-4 divide-y divide-[var(--line)]">
                {signedDeliverables.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[var(--heading)]">{d.title}</p>
                      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                        {d.kind.replace(/_/g, " ")} · {d.status.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {d.requires_approval && d.status === "ready_for_review" && d.client_decision === "pending" && (
                        <Link href="/dashboard/build-room" className="rounded-lg bg-[var(--accent-tint)] px-3 py-1.5 text-xs font-bold text-[var(--blue)]">
                          Needs your review
                        </Link>
                      )}
                      {d.url && (
                        <a href={d.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-xs font-bold text-[var(--blue)]">
                          Open
                        </a>
                      )}
                      {d.file_url && (
                        <a href={d.file_url} target="_blank" rel="noreferrer" className="rounded-lg bg-[var(--blue)] px-3 py-1.5 text-xs font-bold text-white">
                          Download
                        </a>
                      )}
                      {d.client_decision === "approved" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--green)]">
                          <CircleCheck className="h-4 w-4" aria-hidden="true" /> Approved
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">
                The first file lands here the moment it is ready for you.
              </p>
            )}
          </div>
        )}

        {monthlySavings > 0 && (
          <div className="card mt-6 border-[var(--green-line)] bg-[var(--green-tint)]">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[var(--green)]" aria-hidden="true" />
              <h2 className="text-lg font-bold text-[var(--heading)]">You own this. You stopped renting.</h2>
            </div>
            <p className="mt-2 text-sm text-[var(--text)]">
              {project?.old_platform ? `${project.old_platform} was` : "Your old platform stack was"} costing about
              ${oldCost.toLocaleString("en-US")}/month. Your system runs at ${newCost.toLocaleString("en-US")}/month,
              in accounts you control. That is ${monthlySavings.toLocaleString("en-US")} a month that stays in your business.
            </p>
          </div>
        )}

        {lessonCount > 0 && (
          <div className="card mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
                <h2 className="text-lg font-bold text-[var(--heading)]">Training progress</h2>
              </div>
              <span className="text-sm text-[var(--muted)]">{completedCount} of {lessonCount} lessons complete</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-mint" style={{ width: `${trainingPct}%` }} />
            </div>
            <div className="mt-4">
              <Link href="/training" className="btn-primary">
                {completedCount === 0 ? "Start Training" : "Continue Training"}
              </Link>
            </div>
          </div>
        )}

        <div className="card mt-6">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--heading)]">Message the team</h2>
          </div>
          <p className="mb-4 mt-1 text-sm text-[var(--muted)]">
            Questions about your build land straight in our back office. We answer fast.
          </p>
          <MessageThread
            threadProfileId={user!.id}
            initialMessages={(threadMessages ?? []) as Msg[]}
            senderRole="client"
          />
        </div>

        {project?.target_launch && (
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
            <CalendarDays className="h-4 w-4 text-[var(--blue)]" aria-hidden="true" />
            Target launch: {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" }).format(new Date(`${project.target_launch}T12:00:00Z`))}
          </p>
        )}
      </section>
    </>
  );
}
