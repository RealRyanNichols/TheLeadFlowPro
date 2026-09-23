"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  Inbox,
  Library,
  LoaderCircle,
  MessageSquareReply,
  Radio,
  RefreshCw,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CONTENT_PLATFORMS,
  type ContentCommandState,
  type ContentPlatform,
  type ContentVariant,
} from "@/lib/content-command/types";

type Tab = "queue" | "inbox" | "library" | "activity";

const PLATFORM_LABEL: Record<ContentPlatform, string> = {
  facebook: "Facebook",
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const STATUS_TONE: Record<string, string> = {
  draft: "border-[var(--line)] bg-[var(--fill-2)] text-[var(--muted)]",
  approved: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  queued: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  processing: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  scheduled: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  published: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  verified: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  connected: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  limited: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  blocked: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  error: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  not_connected: "border-[var(--line)] bg-[var(--fill-2)] text-[var(--muted)]",
};

function Status({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${STATUS_TONE[value] ?? STATUS_TONE.draft}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function when(value: string | null) {
  if (!value) return "No time set";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const shifted = new Date(date.valueOf() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

export default function ContentCommandCenter({ initialState }: { initialState: ContentCommandState }) {
  const [state, setState] = useState(initialState);
  const [tab, setTab] = useState<Tab>("queue");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [platformByUnit, setPlatformByUnit] = useState<Record<string, ContentPlatform>>({});
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState(state.threads[0]?.id ?? "");
  const [reply, setReply] = useState("");
  const [templateId, setTemplateId] = useState("");

  async function refresh(artifactId = state.activeArtifactId) {
    const url = artifactId ? `/api/admin/content-command?artifact=${encodeURIComponent(artifactId)}` : "/api/admin/content-command";
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not refresh the command center.");
    setState(data.state);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("content-command-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_variants" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "content_threads" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "content_messages" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "content_publish_jobs" }, () => void refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // The active artifact id is intentionally captured for this subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeArtifactId]);

  const variantsByUnit = useMemo(() => {
    const map = new Map<string, ContentVariant[]>();
    for (const variant of state.variants) map.set(variant.unit_id, [...(map.get(variant.unit_id) ?? []), variant]);
    return map;
  }, [state.variants]);

  const counts = useMemo(() => {
    const approved = state.variants.filter((variant) => variant.status === "approved").length;
    const queued = state.variants.filter((variant) => ["queued", "processing", "scheduled"].includes(variant.status)).length;
    const published = state.variants.filter((variant) => ["published", "verified"].includes(variant.status)).length;
    const unread = state.threads.reduce((sum, thread) => sum + thread.unread_count, 0);
    return { approved, queued, published, unread };
  }, [state]);

  async function call(action: string, payload: Record<string, unknown> = {}) {
    const response = await fetch("/api/admin/content-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed with ${response.status}.`);
    return data;
  }

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy("");
    }
  }

  async function approveSelected() {
    if (!selected.size) return setError("Select at least one platform version.");
    await run("approve", async () => {
      await call("approve_variants", { ids: [...selected] });
      setNotice(`${selected.size} platform version${selected.size === 1 ? "" : "s"} approved.`);
      setSelected(new Set());
      await refresh();
    });
  }

  async function publishSelected() {
    if (!selected.size) return setError("Select at least one approved platform version.");
    if (!window.confirm(`Push ${selected.size} selected platform version${selected.size === 1 ? "" : "s"}? Connected channels will receive a live publishing job. Blocked channels will stay blocked.`)) return;
    await run("publish", async () => {
      const result = await call("publish_variants", { ids: [...selected], confirmed: true });
      const blocked = (result.results ?? []).filter((item: { status: string }) => item.status === "blocked").length;
      setNotice(blocked ? `${selected.size - blocked} queued. ${blocked} blocked by missing channel permissions.` : `${selected.size} publish job${selected.size === 1 ? "" : "s"} queued.`);
      setSelected(new Set());
      await refresh();
    });
  }

  async function saveVariant(variant: ContentVariant, copy: string, schedule: string) {
    await run(`save-${variant.id}`, async () => {
      await call("update_variant", {
        id: variant.id,
        copy,
        scheduled_for: schedule ? new Date(schedule).toISOString() : null,
      });
      setNotice(`${PLATFORM_LABEL[variant.platform]} copy saved.`);
      await refresh();
    });
  }

  const selectedThread = state.threads.find((thread) => thread.id === selectedThreadId) ?? state.threads[0] ?? null;
  const threadMessages = state.messages.filter((message) => message.thread_id === selectedThread?.id);

  async function queueReply() {
    if (!selectedThread) return;
    if (!reply.trim()) return setError("Write or choose a reply first.");
    if (!window.confirm(`Send this ${selectedThread.thread_type} reply through ${PLATFORM_LABEL[selectedThread.platform]}?`)) return;
    await run("reply", async () => {
      await call("queue_reply", {
        thread_id: selectedThread.id,
        body: reply,
        template_id: templateId || null,
        confirmed: true,
      });
      setReply("");
      setTemplateId("");
      setNotice("Reply queued for the connected channel.");
      await refresh();
    });
  }

  if (!state.ready) {
    return (
      <main className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Setup required</p>
        <h2 className="mt-3 text-3xl font-black text-[var(--heading)]">Content Command Center is built, but its schema is not live.</h2>
        <p className="mt-3 max-w-2xl text-[var(--text)]">{state.schemaError}</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_38%),linear-gradient(135deg,#061325,#0a1a36)] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              <Radio className="h-4 w-4" aria-hidden="true" /> Live operations
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Content Command Center</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Review the daily artifact, approve each native platform version, push only what you choose, and answer comments or messages from one audited queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Daily artifact"
              value={state.activeArtifactId ?? ""}
              onChange={(event) => void run("artifact", async () => refresh(event.target.value))}
              className="min-h-11 rounded-xl border border-white/15 bg-slate-950/70 px-3 text-sm font-bold text-white"
            >
              {state.artifacts.map((artifact) => (
                <option key={artifact.id} value={artifact.id}>{artifact.artifact_date} · {artifact.unit_count} units</option>
              ))}
            </select>
            <button type="button" onClick={() => void run("refresh", async () => refresh())} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black text-white hover:bg-white/10">
              <RefreshCw className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Approved", value: counts.approved, Icon: Check },
            { label: "Queued", value: counts.queued, Icon: Clock3 },
            { label: "Published", value: counts.published, Icon: Send },
            { label: "Unread", value: counts.unread, Icon: Inbox },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between text-slate-400"><span className="text-xs font-black uppercase tracking-[0.16em]">{label}</span><Icon className="h-4 w-4" aria-hidden="true" /></div>
              <p className="mt-2 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {state.connections.map((connection) => (
          <div key={connection.platform} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-black text-[var(--heading)]">{PLATFORM_LABEL[connection.platform]}</span>
              <Status value={connection.status} />
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">
              {connection.capabilities.length ? connection.capabilities.join(" · ") : connection.last_error || "No permissions verified."}
            </p>
          </div>
        ))}
      </section>

      {(notice || error) && (
        <div className={`rounded-2xl border p-4 text-sm font-bold ${error ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}`}>
          {error || notice}
        </div>
      )}

      <nav className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">
        {([
          ["queue", "Daily queue", Sparkles],
          ["inbox", `Inbox${counts.unread ? ` (${counts.unread})` : ""}`, Inbox],
          ["library", "Replies", Library],
          ["activity", "Activity", Activity],
        ] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black ${tab === value ? "bg-flow-500 text-white" : "border border-[var(--line)] bg-[var(--card)] text-[var(--text)]"}`}>
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </nav>

      {tab === "queue" && (
        <section className="space-y-4">
          {state.units.length > 0 && (
            <div className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-[#071528]/95 p-3 shadow-xl backdrop-blur">
              <p className="text-sm font-bold text-slate-200">{selected.size} platform version{selected.size === 1 ? "" : "s"} selected</p>
              <div className="flex gap-2">
                <button type="button" disabled={busy !== "" || !selected.size} onClick={() => void approveSelected()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 px-4 text-sm font-black text-cyan-200 disabled:opacity-40">
                  {busy === "approve" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                </button>
                <button type="button" disabled={busy !== "" || !selected.size} onClick={() => void publishSelected()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black text-slate-950 disabled:opacity-40">
                  {busy === "publish" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Push selected
                </button>
              </div>
            </div>
          )}

          {state.units.map((unit) => {
            const variants = variantsByUnit.get(unit.id) ?? [];
            const activePlatform = platformByUnit[unit.id] ?? variants[0]?.platform ?? "facebook";
            const variant = variants.find((item) => item.platform === activePlatform) ?? variants[0];
            return (
              <article key={unit.id} className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
                  <div className="border-b border-[var(--line)] bg-[var(--fill-2)] p-5 lg:border-b-0 lg:border-r">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Unit {unit.position}</p>
                    <h3 className="mt-2 text-xl font-black leading-tight text-[var(--heading)]">{unit.title}</h3>
                    <div className="mt-3"><Status value={unit.status} /></div>
                    <dl className="mt-5 space-y-3 text-xs">
                      <div><dt className="font-black uppercase tracking-wider text-[var(--muted)]">Type</dt><dd className="mt-1 text-[var(--text)]">{unit.content_type}</dd></div>
                      {unit.target_persona && <div><dt className="font-black uppercase tracking-wider text-[var(--muted)]">For</dt><dd className="mt-1 text-[var(--text)]">{unit.target_persona}</dd></div>}
                    </dl>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {unit.verified_url && <a href={unit.verified_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-[var(--blue)] hover:underline">Verified link <ExternalLink className="h-3 w-3" /></a>}
                      {unit.asset_url && <a href={unit.asset_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-[var(--blue)] hover:underline">Asset <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      {variants.map((item) => (
                        <button key={item.id} type="button" onClick={() => setPlatformByUnit((current) => ({ ...current, [unit.id]: item.platform }))} className={`rounded-full border px-3 py-1.5 text-xs font-black ${item.platform === activePlatform ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" : "border-[var(--line)] text-[var(--muted)]"}`}>
                          {PLATFORM_LABEL[item.platform]} · {item.status}
                        </button>
                      ))}
                    </div>
                    {variant ? (
                      <VariantEditor
                        key={`${variant.id}-${variant.copy}-${variant.scheduled_for}`}
                        variant={variant}
                        selected={selected.has(variant.id)}
                        busy={busy === `save-${variant.id}`}
                        onSelect={(checked) => setSelected((current) => {
                          const next = new Set(current);
                          if (checked) next.add(variant.id); else next.delete(variant.id);
                          return next;
                        })}
                        onSave={saveVariant}
                      />
                    ) : <p className="mt-5 text-sm text-[var(--muted)]">No platform copy was imported for this unit.</p>}
                  </div>
                </div>
              </article>
            );
          })}

          {!state.units.length && (
            <div className="rounded-3xl border border-dashed border-[var(--line-strong)] p-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-[var(--blue)]" />
              <h3 className="mt-4 text-xl font-black text-[var(--heading)]">No daily artifact has been imported yet</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--muted)]">The Droplet sync looks for today&apos;s approved Notion package. The dashboard fills in as soon as the 10-unit package is available.</p>
            </div>
          )}
        </section>
      )}

      {tab === "inbox" && (
        <section className="grid min-h-[620px] overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--card)] lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-[var(--line)] lg:border-b-0 lg:border-r">
            <div className="border-b border-[var(--line)] p-4"><h3 className="font-black text-[var(--heading)]">Comments and messages</h3><p className="mt-1 text-xs text-[var(--muted)]">Live after channel webhooks are connected.</p></div>
            <div className="max-h-[620px] overflow-y-auto">
              {state.threads.map((thread) => (
                <button key={thread.id} type="button" onClick={() => setSelectedThreadId(thread.id)} className={`w-full border-b border-[var(--line)] p-4 text-left ${selectedThread?.id === thread.id ? "bg-cyan-400/10" : "hover:bg-[var(--fill-2)]"}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-wider text-[var(--blue)]">{PLATFORM_LABEL[thread.platform]} · {thread.thread_type}</span>{thread.unread_count > 0 && <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-xs font-black text-slate-950">{thread.unread_count}</span>}</div>
                  <p className="mt-2 truncate font-black text-[var(--heading)]">{thread.author_name || thread.author_handle || "Unknown sender"}</p>
                  <p className="mt-1 truncate text-sm text-[var(--muted)]">{thread.subject || "Conversation"}</p>
                </button>
              ))}
              {!state.threads.length && <p className="p-6 text-sm text-[var(--muted)]">No comments or messages have been synced.</p>}
            </div>
          </aside>
          <div className="flex min-h-[520px] flex-col">
            {selectedThread ? (
              <>
                <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-4">
                  <div><h3 className="font-black text-[var(--heading)]">{selectedThread.author_name || selectedThread.author_handle || "Conversation"}</h3><p className="text-xs text-[var(--muted)]">{PLATFORM_LABEL[selectedThread.platform]} · {selectedThread.thread_type} · {selectedThread.status}</p></div>
                  {selectedThread.external_url && <a href={selectedThread.external_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-sm font-black text-[var(--text)]">Open original <ExternalLink className="h-4 w-4" /></a>}
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {threadMessages.map((message) => (
                    <div key={message.id} className={`max-w-[86%] rounded-2xl p-3 text-sm ${message.direction === "outbound" ? "ml-auto bg-cyan-500/15 text-[var(--heading)]" : "bg-[var(--fill-2)] text-[var(--text)]"}`}>
                      <p className="whitespace-pre-wrap">{message.body}</p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{message.direction} · {message.status} · {when(message.created_at)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[var(--line)] p-4">
                  <select value={templateId} onChange={(event) => {
                    setTemplateId(event.target.value);
                    const template = state.templates.find((item) => item.id === event.target.value);
                    if (template) setReply(template.body);
                  }} className="input mb-3" aria-label="Reply template">
                    <option value="">Choose a prepared reply</option>
                    {state.templates.filter((item) => !item.platform || item.platform === selectedThread.platform).map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
                  </select>
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} className="input min-h-28" placeholder="Write the reply. Nothing sends until you confirm." />
                  <div className="mt-3 flex justify-end"><button type="button" onClick={() => void queueReply()} disabled={busy !== "" || !reply.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black text-slate-950 disabled:opacity-40"><MessageSquareReply className="h-4 w-4" /> {busy === "reply" ? "Queuing..." : "Review and send"}</button></div>
                </div>
              </>
            ) : <div className="grid flex-1 place-items-center p-10 text-center text-sm text-[var(--muted)]">Choose a conversation when one arrives.</div>}
          </div>
        </section>
      )}

      {tab === "library" && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.templates.map((template) => (
            <article key={template.id} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5">
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--blue)]">{template.kind} · {template.category}</p><button type="button" title="Copy template" onClick={() => void navigator.clipboard.writeText(template.body)} className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)] hover:text-[var(--heading)]"><Copy className="h-4 w-4" /></button></div>
              <h3 className="mt-3 font-black text-[var(--heading)]">{template.title}</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{template.body}</p>
            </article>
          ))}
        </section>
      )}

      {tab === "activity" && (
        <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--card)]">
          {state.activity.map((event) => (
            <div key={event.id} className="flex gap-4 border-b border-[var(--line)] p-4 last:border-0"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,.8)]" /><div><p className="font-bold text-[var(--heading)]">{event.summary}</p><p className="mt-1 text-xs uppercase tracking-wider text-[var(--muted)]">{event.kind} · {when(event.created_at)}</p></div></div>
          ))}
          {!state.activity.length && <p className="p-8 text-sm text-[var(--muted)]">No content activity has been recorded yet.</p>}
        </section>
      )}
    </main>
  );
}

function VariantEditor({
  variant,
  selected,
  busy,
  onSelect,
  onSave,
}: {
  variant: ContentVariant;
  selected: boolean;
  busy: boolean;
  onSelect: (checked: boolean) => void;
  onSave: (variant: ContentVariant, copy: string, schedule: string) => Promise<void>;
}) {
  const [copy, setCopy] = useState(variant.copy || variant.description || "");
  const [schedule, setSchedule] = useState(localInput(variant.scheduled_for));
  const dirty = copy !== (variant.copy || variant.description || "") || schedule !== localInput(variant.scheduled_for);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex min-h-11 items-center gap-3 text-sm font-black text-[var(--heading)]">
          <input type="checkbox" checked={selected} onChange={(event) => onSelect(event.target.checked)} className="h-5 w-5 accent-cyan-400" /> Select {PLATFORM_LABEL[variant.platform]}
        </label>
        <Status value={variant.status} />
      </div>
      {variant.hook && <p className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-3 text-sm text-[var(--text)]"><span className="font-black text-[var(--heading)]">Hook:</span> {variant.hook}</p>}
      <textarea value={copy} onChange={(event) => setCopy(event.target.value)} className="input mt-3 min-h-52 font-[inherit] leading-6" />
      {variant.talking_points.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">{variant.talking_points.map((point) => <li key={point}>{point}</li>)}</ul>}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Central publishing time<input type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} className="input mt-1 min-h-11 font-normal normal-case tracking-normal" /></label>
        <div className="flex flex-wrap gap-2">
          {variant.external_url && <a href={variant.external_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-sm font-black text-[var(--text)]">Open post <ExternalLink className="h-4 w-4" /></a>}
          <button type="button" disabled={!dirty || busy || !copy.trim()} onClick={() => void onSave(variant, copy, schedule)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-black text-[var(--text)] disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button>
        </div>
      </div>
      {variant.last_error && <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{variant.last_error}</p>}
    </div>
  );
}
