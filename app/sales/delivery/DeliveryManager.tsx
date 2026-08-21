"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  full_name: string;
  business_name: string | null;
  email: string;
  phone: string | null;
  status: string;
};

type Milestone = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  sort_order: number;
  due_date: string | null;
  completed_at: string | null;
};

type UploadState = { busy: boolean; viewUrl?: string | null; error?: string | null };

type Deliverable = {
  file_path?: string | null;
  id: string;
  project_id: string;
  title: string;
  kind: string;
  url: string | null;
  notes: string | null;
  description: string | null;
  status: string;
  due_date: string | null;
  visible_to_client: boolean;
  result_summary: string | null;
  requires_approval: boolean;
  client_decision: string;
  client_feedback: string | null;
  client_reviewed_at: string | null;
  created_at: string;
  sort_order: number;
};

type Project = {
  id: string;
  lead_id: string | null;
  client_id: string | null;
  name: string;
  description: string | null;
  status: string;
  manager_name: string | null;
  target_launch: string | null;
  client_portal_invited_at: string | null;
  leads: Lead | null;
  profiles: { full_name: string | null; email: string } | null;
  milestones: Milestone[];
  deliverables: Deliverable[];
};

const PROJECT_STATUSES = ["discovery", "design", "build", "launch", "live", "support", "paused"];
const DELIVERY_STATUSES = ["planned", "in_progress", "ready_for_review", "revision_requested", "approved", "delivered"];
const KINDS = ["website", "proposal", "email_flow", "automation", "crm", "system", "creative", "design", "video", "document", "repo", "other"];
const DEFAULT_MILESTONES = [
  ["Discovery and scope", "Confirm goals, offer, audience, and the first measurable result."],
  ["Working preview", "Create the first tangible version the client can open and react to."],
  ["Client review", "Collect approval or a precise change request in the Build Room."],
  ["Final delivery", "Complete revisions, confirm ownership, and publish the final system."],
];

function pretty(value: string) {
  return value.replace(/_/g, " ");
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "";
}

export default function DeliveryManager({
  initialProjects,
  leads,
  operatorName,
}: {
  initialProjects: Project[];
  leads: Lead[];
  operatorName: string;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [showNew, setShowNew] = useState(false);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const supabase = useMemo(() => createClient(), []);

  async function attachFile(project: Project, deliverable: Deliverable, file: File | null) {
    if (!file) return;
    setUploads((all) => ({ ...all, [deliverable.id]: { busy: true } }));
    try {
      const body = new FormData();
      body.set("deliverable_id", deliverable.id);
      body.set("file", file);
      const response = await fetch("/api/sales/deliverable-file", { method: "POST", body });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string; file_path?: string; signed_url?: string | null;
      };
      if (!response.ok || !json.file_path) {
        setUploads((all) => ({ ...all, [deliverable.id]: { busy: false, error: json.error || "Upload failed" } }));
        return;
      }
      replaceProject(project.id, (item) => ({
        ...item,
        deliverables: item.deliverables.map((candidate) =>
          candidate.id === deliverable.id ? { ...candidate, file_path: json.file_path } : candidate),
      }));
      setUploads((all) => ({ ...all, [deliverable.id]: { busy: false, viewUrl: json.signed_url } }));
    } catch {
      setUploads((all) => ({ ...all, [deliverable.id]: { busy: false, error: "Upload failed" } }));
    }
  }

  const totals = useMemo(() => {
    const deliverables = projects.flatMap((project) => project.deliverables ?? []);
    return {
      projects: projects.length,
      active: projects.filter((project) => !["live", "support", "paused"].includes(project.status)).length,
      review: deliverables.filter((item) => item.status === "ready_for_review").length,
      delivered: deliverables.filter((item) => item.status === "delivered" || item.status === "approved").length,
    };
  }, [projects]);

  function replaceProject(id: string, update: (project: Project) => Project) {
    setProjects((items) => items.map((item) => (item.id === id ? update(item) : item)));
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create-project");
    setError("");
    const form = event.currentTarget;
    const fd = new FormData(form);
    const leadId = String(fd.get("lead_id") || "");
    const lead = leads.find((item) => item.id === leadId);
    const name = String(fd.get("name") || "").trim();
    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        lead_id: leadId || null,
        name,
        description: String(fd.get("description") || "").trim() || null,
        manager_name: operatorName,
        target_launch: String(fd.get("target_launch") || "") || null,
        status: "discovery",
      })
      .select()
      .single();

    if (insertError || !project) {
      setError(insertError?.message || "Project could not be created");
      setBusy("");
      return;
    }

    const { data: milestones, error: milestoneError } = await supabase
      .from("milestones")
      .insert(DEFAULT_MILESTONES.map(([title, description], index) => ({
        project_id: project.id,
        title,
        description,
        sort_order: (index + 1) * 10,
        status: index === 0 ? "in_progress" : "pending",
      })))
      .select();

    if (milestoneError) setError(milestoneError.message);
    setProjects((items) => [{
      ...project,
      leads: lead ?? null,
      profiles: null,
      milestones: (milestones ?? []) as Milestone[],
      deliverables: [],
    } as Project, ...items]);
    form.reset();
    setShowNew(false);
    setMessage(`${name} is ready in the Delivery Center.`);
    setBusy("");
  }

  async function updateProjectStatus(project: Project, status: string) {
    const previous = project.status;
    replaceProject(project.id, (item) => ({ ...item, status }));
    const { error: updateError } = await supabase.from("projects").update({ status }).eq("id", project.id);
    if (updateError) {
      replaceProject(project.id, (item) => ({ ...item, status: previous }));
      setError(updateError.message);
    }
  }

  async function cycleMilestone(project: Project, milestone: Milestone) {
    const status = milestone.status === "pending" ? "in_progress" : milestone.status === "in_progress" ? "done" : "pending";
    const completed_at = status === "done" ? new Date().toISOString() : null;
    replaceProject(project.id, (item) => ({
      ...item,
      milestones: item.milestones.map((candidate) => candidate.id === milestone.id ? { ...candidate, status, completed_at } : candidate),
    }));
    const { error: updateError } = await supabase.from("milestones").update({ status, completed_at }).eq("id", milestone.id);
    if (updateError) setError(updateError.message);
  }

  async function createDeliverable(event: React.FormEvent<HTMLFormElement>, project: Project) {
    event.preventDefault();
    setBusy(`deliverable-${project.id}`);
    setError("");
    const form = event.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") || "").trim();
    const status = String(fd.get("status") || "in_progress");
    const { data, error: insertError } = await supabase
      .from("deliverables")
      .insert({
        project_id: project.id,
        title,
        kind: String(fd.get("kind") || "other"),
        url: String(fd.get("url") || "").trim() || null,
        description: String(fd.get("description") || "").trim() || null,
        result_summary: String(fd.get("result_summary") || "").trim() || null,
        due_date: String(fd.get("due_date") || "") || null,
        status,
        visible_to_client: fd.get("visible_to_client") === "on",
        requires_approval: fd.get("requires_approval") === "on",
        delivered_at: status === "delivered" ? new Date().toISOString() : null,
        created_by_name: operatorName,
      })
      .select()
      .single();
    if (insertError || !data) setError(insertError?.message || "Deliverable could not be added");
    else {
      replaceProject(project.id, (item) => ({ ...item, deliverables: [data as Deliverable, ...item.deliverables] }));
      form.reset();
      setAddFor(null);
      setMessage(`${title} was added to ${project.name}.`);
    }
    setBusy("");
  }

  async function updateDeliverable(project: Project, deliverable: Deliverable, values: Partial<Deliverable>) {
    const previous = deliverable;
    replaceProject(project.id, (item) => ({
      ...item,
      deliverables: item.deliverables.map((candidate) => candidate.id === deliverable.id ? { ...candidate, ...values } : candidate),
    }));
    const payload: Record<string, unknown> = { ...values };
    if (values.status === "delivered") payload.delivered_at = new Date().toISOString();
    const { error: updateError } = await supabase.from("deliverables").update(payload).eq("id", deliverable.id);
    if (updateError) {
      replaceProject(project.id, (item) => ({
        ...item,
        deliverables: item.deliverables.map((candidate) => candidate.id === deliverable.id ? previous : candidate),
      }));
      setError(updateError.message);
    }
  }

  async function inviteClient(project: Project) {
    if (!project.leads?.email || busy) return;
    if (!window.confirm(`Send a one-time Build Room sign-in link to ${project.leads.email}?`)) return;
    setBusy(`invite-${project.id}`);
    setError("");
    setMessage("");
    const response = await fetch("/api/sales/portal-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: project.id }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setError(json.error || "Portal invitation could not be sent");
    else {
      replaceProject(project.id, (item) => ({ ...item, client_portal_invited_at: new Date().toISOString() }));
      setMessage(`Build Room access was sent to ${project.leads.email}.`);
    }
    setBusy("");
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--heading)]">Delivery Center</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">Turn every promise into visible work. Manage milestones, publish previews, collect client decisions, and keep the handoff moving.</p>
        </div>
        <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => setShowNew((value) => !value)}>{showNew ? "Cancel" : "+ Start a client project"}</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Projects" value={totals.projects} />
        <Metric label="Active builds" value={totals.active} />
        <Metric label="Ready for review" value={totals.review} />
        <Metric label="Approved / delivered" value={totals.delivered} />
      </div>

      {message && <p className="rounded-lg border border-mint/30 bg-mint/10 p-3 text-sm font-semibold text-mint">{message}</p>}
      {error && <p className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]">{error}</p>}

      {showNew && (
        <form onSubmit={createProject} className="card space-y-4 !p-5">
          <h3 className="text-lg font-black text-[var(--heading)]">Start the delivery record</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="label">Qualified lead</span><select className="input" name="lead_id" required defaultValue=""><option value="" disabled>Choose a lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.business_name ? `${lead.business_name} · ${lead.full_name}` : lead.full_name}</option>)}</select></label>
            <label><span className="label">Project name</span><input className="input" name="name" required maxLength={200} placeholder="Client Growth System" /></label>
          </div>
          <label><span className="label">What we are delivering</span><textarea className="input" name="description" rows={3} maxLength={2000} placeholder="Website, CRM, email flow, automation, or complete system" /></label>
          <label className="block sm:max-w-xs"><span className="label">Target launch</span><input className="input" name="target_launch" type="date" /></label>
          <button className="btn-primary disabled:opacity-50" disabled={busy === "create-project"}>{busy === "create-project" ? "Starting project..." : "Create project and milestones"}</button>
        </form>
      )}

      <div className="space-y-5">
        {projects.map((project) => {
          const milestones = [...(project.milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order);
          const deliverables = [...(project.deliverables ?? [])].sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
          const done = milestones.filter((item) => item.status === "done").length;
          const progress = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
          return (
            <section key={project.id} className="card !p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-flow-400">{project.leads?.business_name || project.leads?.full_name || project.profiles?.full_name || "Client project"}</p>
                  <h3 className="mt-1 text-xl font-black text-[var(--heading)]">{project.name}</h3>
                  {project.description && <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{project.description}</p>}
                  <p className="mt-2 text-xs text-[var(--quiet)]">Owner: {project.manager_name || operatorName}{project.target_launch ? ` · target ${date(project.target_launch)}` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.lead_id && <Link href={`/admin/sales/leads/${project.lead_id}`} className="btn-ghost !px-3 !py-2 text-xs">Open CRM</Link>}
                  <button type="button" onClick={() => inviteClient(project)} disabled={!project.leads?.email || busy === `invite-${project.id}`} className="btn-ghost !px-3 !py-2 text-xs disabled:opacity-40">{busy === `invite-${project.id}` ? "Sending..." : project.client_portal_invited_at ? "Resend Build Room access" : "Send Build Room access"}</button>
                  <select className="input !w-auto !py-2 text-xs font-bold" value={project.status} onChange={(event) => updateProjectStatus(project, event.target.value)}>{PROJECT_STATUSES.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}</select>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
                <div>
                  <div className="flex items-end justify-between"><h4 className="text-sm font-black uppercase tracking-wide text-[var(--muted)]">Milestones</h4><span className="text-xs font-bold text-flow-400">{progress}% complete</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--fill-3)]"><div className="h-full bg-flow-500" style={{ width: `${progress}%` }} /></div>
                  <ul className="mt-3 space-y-2">{milestones.map((milestone) => <li key={milestone.id}><button type="button" onClick={() => cycleMilestone(project, milestone)} className="flex w-full items-start gap-3 rounded-lg border border-line p-3 text-left text-sm hover:border-flow-500"><span className={milestone.status === "done" ? "text-mint" : milestone.status === "in_progress" ? "text-warn" : "text-[var(--quiet)]"}>{milestone.status === "done" ? "●" : milestone.status === "in_progress" ? "◐" : "○"}</span><span><span className={milestone.status === "done" ? "font-bold text-[var(--muted)] line-through" : "font-bold text-[var(--text)]"}>{milestone.title}</span>{milestone.description && <span className="mt-1 block text-xs text-[var(--muted)]">{milestone.description}</span>}</span></button></li>)}</ul>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-black uppercase tracking-wide text-[var(--muted)]">Client work and results</h4><button type="button" onClick={() => setAddFor(addFor === project.id ? null : project.id)} className="text-sm font-bold text-flow-400">{addFor === project.id ? "Cancel" : "+ Add deliverable"}</button></div>
                  {addFor === project.id && <DeliverableForm project={project} busy={busy === `deliverable-${project.id}`} onSubmit={createDeliverable} />}
                  <div className="mt-3 space-y-3">
                    {deliverables.map((deliverable) => (
                      <div key={deliverable.id} className="rounded-xl border border-line p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[var(--heading)]">{deliverable.title}</p><span className="rounded-full bg-[var(--fill-3)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--muted)]">{pretty(deliverable.kind)}</span></div>{deliverable.description && <p className="mt-1 text-sm text-[var(--muted)]">{deliverable.description}</p>}{deliverable.result_summary && <p className="mt-2 rounded-lg bg-[var(--page)] p-2 text-xs text-[var(--text)]"><span className="font-bold text-flow-400">Visible result:</span> {deliverable.result_summary}</p>}</div>
                          {deliverable.url && <a href={deliverable.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-flow-400">Open ↗</a>}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <select className="input !w-auto !py-1.5 text-xs" value={deliverable.status} onChange={(event) => updateDeliverable(project, deliverable, { status: event.target.value })}>{DELIVERY_STATUSES.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}</select>
                          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]"><input type="checkbox" checked={deliverable.visible_to_client} onChange={(event) => updateDeliverable(project, deliverable, { visible_to_client: event.target.checked })} /> Visible in Build Room</label>
                          <label className="cursor-pointer text-xs font-bold text-flow-400 hover:underline">
                            {uploads[deliverable.id]?.busy ? "Uploading..." : deliverable.file_path ? "Replace file" : "+ Attach file"}
                            <input type="file" className="hidden" disabled={uploads[deliverable.id]?.busy} onChange={(event) => { attachFile(project, deliverable, event.target.files?.[0] ?? null); event.target.value = ""; }} />
                          </label>
                          {deliverable.file_path && !uploads[deliverable.id]?.busy && (uploads[deliverable.id]?.viewUrl ? <a href={uploads[deliverable.id]!.viewUrl!} target="_blank" rel="noreferrer" className="text-xs font-bold text-mint">File attached · view ↗</a> : <span className="text-xs font-bold text-mint">File attached (client can download)</span>)}
                          {uploads[deliverable.id]?.error && <span className="text-xs font-bold text-warn">{uploads[deliverable.id]!.error}</span>}
                          {deliverable.client_decision !== "pending" && <span className={`text-xs font-bold ${deliverable.client_decision === "approved" ? "text-mint" : "text-warn"}`}>Client: {pretty(deliverable.client_decision)}{deliverable.client_reviewed_at ? ` · ${date(deliverable.client_reviewed_at)}` : ""}</span>}
                        </div>
                        {deliverable.client_feedback && <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--page)] p-3 text-sm"><span className="font-bold">Client feedback:</span> {deliverable.client_feedback}</p>}
                      </div>
                    ))}
                    {deliverables.length === 0 && <p className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-[var(--muted)]">Add the first preview, plan, email flow, website, or completed result.</p>}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
        {projects.length === 0 && <div className="card text-center text-[var(--muted)]">No delivery records yet. Start one from a qualified lead.</div>}
      </div>
    </div>
  );
}

function DeliverableForm({ project, busy, onSubmit }: { project: Project; busy: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>, project: Project) => void }) {
  return (
    <form onSubmit={(event) => onSubmit(event, project)} className="mt-3 space-y-3 rounded-xl bg-[var(--page)] p-4">
      <div className="grid gap-3 sm:grid-cols-2"><label><span className="label">Deliverable title</span><input className="input text-sm" name="title" required maxLength={300} placeholder="30-day email follow-up" /></label><label><span className="label">Type</span><select className="input text-sm" name="kind" defaultValue="website">{KINDS.map((kind) => <option key={kind} value={kind}>{pretty(kind)}</option>)}</select></label></div>
      <label><span className="label">Openable link</span><input className="input text-sm" name="url" type="url" maxLength={1000} placeholder="https://..." /></label>
      <label><span className="label">What the client is receiving</span><textarea className="input text-sm" name="description" rows={2} maxLength={4000} /></label>
      <label><span className="label">Visible result</span><textarea className="input text-sm" name="result_summary" rows={2} maxLength={4000} placeholder="What changed, what is now working, or what can be reviewed immediately" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label><span className="label">Status</span><select className="input text-sm" name="status" defaultValue="ready_for_review">{DELIVERY_STATUSES.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}</select></label><label><span className="label">Due date</span><input className="input text-sm" name="due_date" type="date" /></label></div>
      <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="visible_to_client" /> Show in client Build Room</label><label className="flex items-center gap-2"><input type="checkbox" name="requires_approval" defaultChecked /> Request client approval</label></div>
      <button className="btn-primary !px-4 !py-2 text-sm disabled:opacity-50" disabled={busy}>{busy ? "Adding..." : "Add deliverable"}</button>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="card !p-4 text-center"><p className="text-3xl font-black text-[var(--heading)]">{value}</p><p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p></div>;
}
