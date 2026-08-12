"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Milestone = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  sort_order: number;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client_id: string | null;
  old_platform: string | null;
  old_monthly_cost: number | null;
  milestones: Milestone[];
  profiles: { full_name: string | null; email: string } | null;
};

type Client = { id: string; full_name: string | null; email: string };

const PROJECT_STATUSES = ["discovery", "design", "build", "launch", "live", "support", "paused"];

const DEFAULT_MILESTONES = [
  "Discovery call and scope",
  "Figma design approved",
  "Site and funnel built",
  "Dashboard and database live",
  "Domain connected and launched",
  "Handover: repo, hosting, database keys",
];

export default function ProjectsManager({
  initialProjects,
  clients,
}: {
  initialProjects: Project[];
  clients: Client[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name: String(fd.get("name")),
        description: String(fd.get("description") || "") || null,
        client_id: String(fd.get("client_id") || "") || null,
        old_platform: String(fd.get("old_platform") || "") || null,
        old_monthly_cost: fd.get("old_monthly_cost")
          ? Number(fd.get("old_monthly_cost"))
          : null,
      })
      .select()
      .single();

    if (!error && project) {
      await supabase.from("milestones").insert(
        DEFAULT_MILESTONES.map((title, i) => ({
          project_id: project.id,
          title,
          sort_order: i,
        }))
      );
      setShowNew(false);
      router.refresh();
      // optimistic: reload data
      window.location.reload();
    }
    setBusy(false);
  }

  async function setProjectStatus(id: string, status: string) {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, status } : p)));
    const supabase = createClient();
    await supabase.from("projects").update({ status }).eq("id", id);
  }

  async function setMilestoneStatus(projectId: string, m: Milestone) {
    const next =
      m.status === "pending" ? "in_progress" : m.status === "in_progress" ? "done" : "pending";
    setProjects((ps) =>
      ps.map((p) =>
        p.id === projectId
          ? {
              ...p,
              milestones: p.milestones.map((x) =>
                x.id === m.id ? { ...x, status: next } : x
              ),
            }
          : p
      )
    );
    const supabase = createClient();
    await supabase
      .from("milestones")
      .update({ status: next, completed_at: next === "done" ? new Date().toISOString() : null })
      .eq("id", m.id);
  }

  return (
    <div>
      <div className="mb-6 flex justify-between">
        <p className="text-[var(--muted)]">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </p>
        <button className="btn-primary !py-2 text-sm" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showNew && (
        <form onSubmit={createProject} className="card mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Project name *</label>
              <input className="input" name="name" required />
            </div>
            <div>
              <label className="label">Client</label>
              <select className="input" name="client_id" defaultValue="">
                <option value="">No client account yet</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" name="description" rows={2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Platform they are leaving</label>
              <input className="input" name="old_platform" placeholder="Shopify, Wix, WordPress..." />
            </div>
            <div>
              <label className="label">Their old monthly cost ($)</label>
              <input className="input" name="old_monthly_cost" type="number" step="1" min="0" />
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? "Creating..." : "Create with standard milestones"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {projects.map((p) => (
          <div key={p.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--heading)]">{p.name}</h2>
                <p className="text-xs text-[var(--muted)]">
                  {p.profiles ? p.profiles.full_name || p.profiles.email : "No client linked"}
                  {p.old_platform && ` · leaving ${p.old_platform}`}
                  {p.old_monthly_cost ? ` · was paying $${p.old_monthly_cost}/mo` : ""}
                </p>
              </div>
              <select
                className="input !w-auto !py-1.5 text-sm"
                value={p.status}
                onChange={(e) => setProjectStatus(p.id, e.target.value)}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {[...p.milestones]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => setMilestoneStatus(p.id, m)}
                      className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-sm transition hover:border-flow-500"
                    >
                      <span
                        className={
                          m.status === "done"
                            ? "text-mint"
                            : m.status === "in_progress"
                              ? "text-warn"
                              : "text-[var(--quiet)]"
                        }
                      >
                        {m.status === "done" ? "●" : m.status === "in_progress" ? "◐" : "○"}
                      </span>
                      <span className={m.status === "done" ? "text-[var(--muted)] line-through" : "text-[var(--text)]"}>
                        {m.title}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="card text-center text-[var(--muted)]">
            No projects yet. Win a lead, then create their build here.
          </div>
        )}
      </div>
    </div>
  );
}
