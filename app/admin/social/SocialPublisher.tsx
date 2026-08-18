"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SOCIAL_SLOTS,
  SOCIAL_CONTENT_PILLARS,
  SOCIAL_TIMEZONE,
  centralTimeLabel,
  hashtagCount,
} from "@/lib/social";

type SocialPost = {
  id: string;
  status: string;
  message: string;
  media_type: "text" | "link" | "photo" | "video";
  media_url: string | null;
  link_url: string | null;
  content_pillar: string | null;
  campaign: string | null;
  internal_notes: string | null;
  source: "manual" | "chatgpt" | "import" | "api";
  scheduled_for: string | null;
  timezone: string;
  meta_post_id: string | null;
  meta_permalink: string | null;
  last_error: string | null;
  created_at: string;
};

type ScheduleSettings = {
  enabled: boolean;
  timezone: string;
  daily_slots: string[];
  minimum_posts: number;
  maximum_posts: number;
  fifth_post_optional: boolean;
};

type Connection = {
  page_id: string;
  page_name: string | null;
  graph_version: string;
  status: string;
  permission_names: string[];
  page_tasks: string[];
  last_verified_at: string | null;
  last_error: string | null;
};

type Editor = {
  message: string;
  media_type: SocialPost["media_type"];
  media_url: string;
  link_url: string;
  content_pillar: string;
  campaign: string;
  internal_notes: string;
  scheduled_for: string;
  source: SocialPost["source"];
};

const EMPTY_EDITOR: Editor = {
  message: "",
  media_type: "text",
  media_url: "",
  link_url: "",
  content_pillar: "",
  campaign: "",
  internal_notes: "",
  scheduled_for: "",
  source: "manual",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-line text-[var(--muted)]",
  pending_approval: "bg-warn/15 text-warn",
  approved: "bg-flow-400/15 text-flow-400",
  scheduled: "bg-violet-400/15 text-violet-300",
  published: "bg-mint/15 text-mint",
  failed: "bg-[var(--danger)]/15 text-[var(--danger)]",
  cancelled: "bg-line text-[var(--quiet)]",
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "";
  const shifted = new Date(date.valueOf() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function editorFromPost(post: SocialPost): Editor {
  return {
    message: post.message,
    media_type: post.media_type,
    media_url: post.media_url ?? "",
    link_url: post.link_url ?? "",
    content_pillar: post.content_pillar ?? "",
    campaign: post.campaign ?? "",
    internal_notes: post.internal_notes ?? "",
    scheduled_for: toLocalInput(post.scheduled_for),
    source: post.source,
  };
}

export default function SocialPublisher({
  initialPosts,
  initialSettings,
  initialConnection,
  pageId,
  tokenConfigured,
}: {
  initialPosts: SocialPost[];
  initialSettings: ScheduleSettings | null;
  initialConnection: Connection | null;
  pageId: string;
  tokenConfigured: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [settings, setSettings] = useState<ScheduleSettings>(
    initialSettings ?? {
      enabled: true,
      timezone: SOCIAL_TIMEZONE,
      daily_slots: DEFAULT_SOCIAL_SLOTS,
      minimum_posts: 3,
      maximum_posts: 5,
      fifth_post_optional: true,
    },
  );
  const [connection, setConnection] = useState(initialConnection);
  const [editor, setEditor] = useState<Editor>(EMPTY_EDITOR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [slotText, setSlotText] = useState(settings.daily_slots.join(", "));

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const post of posts) out[post.status] = (out[post.status] ?? 0) + 1;
    return out;
  }, [posts]);
  const pending = posts.filter((post) => post.status === "pending_approval");

  async function call(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || `Request failed with ${response.status}.`);
    return json;
  }

  function payload() {
    return {
      ...editor,
      media_url: editor.media_url || null,
      link_url: editor.link_url || null,
      content_pillar: editor.content_pillar || null,
      campaign: editor.campaign || null,
      internal_notes: editor.internal_notes || null,
      scheduled_for: editor.scheduled_for
        ? new Date(editor.scheduled_for).toISOString()
        : null,
      timezone: SOCIAL_TIMEZONE,
    };
  }

  async function savePost(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const json = await call({
        action: editingId ? "update" : "create",
        ...(editingId ? { id: editingId } : {}),
        post: payload(),
      });
      const saved = json.post as SocialPost;
      setPosts((current) =>
        editingId ? current.map((post) => (post.id === saved.id ? saved : post)) : [saved, ...current],
      );
      setEditor(EMPTY_EDITOR);
      setEditingId(null);
      setNotice(editingId ? "Draft updated." : "Draft saved. It cannot reach Facebook until you approve it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function submitPost(id: string) {
    setBusy(id);
    setError(null);
    try {
      const json = await call({ action: "submit", id });
      setPosts((current) => current.map((post) => (post.id === id ? json.post : post)));
      setNotice("Post moved into the approval queue.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function approvePosts(ids: string[]) {
    const label = ids.length === 1 ? "this post" : `${ids.length} posts`;
    if (
      !window.confirm(
        `Approve ${label} for the LeadFlow Pro Facebook Page? This sends the approved content to Meta now and schedules any future publication times.`,
      )
    ) {
      return;
    }
    setBusy("approve");
    setError(null);
    setNotice(null);
    const failures: string[] = [];
    try {
      for (let i = 0; i < ids.length; i += 10) {
        const json = await call({ action: "approve", ids: ids.slice(i, i + 10) });
        for (const result of json.results ?? []) {
          if (!result.ok) failures.push(result.error || `Post ${result.id} failed.`);
        }
      }
      const state = await fetch("/api/admin/social", { cache: "no-store" }).then((r) => r.json());
      if (Array.isArray(state.posts)) setPosts(state.posts);
      if (failures.length) setError(failures.join(" "));
      else setNotice(`${ids.length} approved post${ids.length === 1 ? "" : "s"} sent to Meta successfully.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function cancelPost(post: SocialPost) {
    const external = post.status === "scheduled";
    if (
      !window.confirm(
        external
          ? "Cancel this scheduled Facebook post in Meta and mark it cancelled here?"
          : "Cancel this draft and remove it from the active queue?",
      )
    ) {
      return;
    }
    setBusy(post.id);
    setError(null);
    try {
      const json = await call({ action: "cancel", id: post.id });
      setPosts((current) => current.map((item) => (item.id === post.id ? json.post : item)));
      setNotice("Post cancelled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function verifyConnection() {
    setBusy("verify");
    setError(null);
    setNotice(null);
    try {
      const json = await call({ action: "verify" });
      setConnection(json.connection);
      if (json.connection?.status === "connected") {
        setNotice("Meta connection verified. The Page is ready for approved posts.");
      } else {
        setError(json.connection?.last_error || "The Page is visible, but publishing permission is limited.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    const slots = slotText
      .split(",")
      .map((slot) => slot.trim())
      .filter(Boolean);
    setBusy("settings");
    setError(null);
    try {
      const json = await call({ action: "settings", ...settings, daily_slots: slots });
      setSettings(json.settings);
      setSlotText(json.settings.daily_slots.join(", "));
      setNotice("Daily Facebook schedule saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function edit(post: SocialPost) {
    setEditingId(post.id);
    setEditor(editorFromPost(post));
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-[var(--heading)]">Facebook Publisher</h2>
        <p className="mt-2 max-w-3xl text-[var(--muted)]">
          Build the queue here, approve it once, and Meta publishes it on schedule. Credentials stay
          server-side. Drafts and AI-created posts cannot publish themselves.
        </p>
      </div>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connection?.status === "connected" ? "bg-mint" : tokenConfigured ? "bg-warn" : "bg-[var(--danger)]"
                }`}
              />
              <h3 className="font-bold text-[var(--heading)]">
                {connection?.page_name || "The LeadFlow Pro Facebook Page"}
              </h3>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Page ID {pageId} · {connection?.graph_version || "Graph API v26.0"} · token {tokenConfigured ? "stored server-side" : "not configured"}
            </p>
            {connection?.last_verified_at && (
              <p className="mt-1 text-xs text-[var(--quiet)]">
                Last verified {new Date(connection.last_verified_at).toLocaleString()}
              </p>
            )}
            {connection?.last_error && <p className="mt-2 text-sm text-warn">{connection.last_error}</p>}
          </div>
          <button
            type="button"
            className="btn-ghost !px-4 !py-2 text-sm"
            disabled={busy === "verify" || !tokenConfigured}
            onClick={verifyConnection}
          >
            {busy === "verify" ? "Checking Meta..." : "Verify Meta Connection"}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Drafts", counts.draft ?? 0],
          ["Need Approval", counts.pending_approval ?? 0],
          ["Scheduled", counts.scheduled ?? 0],
          ["Published", counts.published ?? 0],
          ["Failed", counts.failed ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="card !p-4 text-center">
            <div className="text-2xl font-black text-[var(--heading)]">{value}</div>
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
          </div>
        ))}
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border p-4 text-sm ${error ? "border-[var(--danger)]/40 text-[var(--danger)]" : "border-mint/40 text-mint"}`}>
          {error || notice}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={savePost} className="card space-y-4 self-start xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[var(--heading)]">
                {editingId ? "Edit draft" : "Create Facebook draft"}
              </h3>
              <p className="text-xs text-[var(--quiet)]">Nothing publishes when you save.</p>
            </div>
            {editingId && (
              <button
                type="button"
                className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--heading)]"
                onClick={() => {
                  setEditingId(null);
                  setEditor(EMPTY_EDITOR);
                }}
              >
                Stop editing
              </button>
            )}
          </div>

          <div>
            <label className="label" htmlFor="social-message">Post copy</label>
            <textarea
              id="social-message"
              className="input min-h-56"
              value={editor.message}
              onChange={(e) => setEditor((v) => ({ ...v, message: e.target.value }))}
              placeholder="Start with the business pain, the money leak, the proof, or the buyer filter..."
              required
              maxLength={12000}
            />
            <div className="mt-1 flex justify-between text-xs text-[var(--quiet)]">
              <span>{editor.message.length.toLocaleString()} characters</span>
              <span>{hashtagCount(editor.message)}/2 hashtags</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="social-media-type">Format</label>
              <select
                id="social-media-type"
                className="input"
                value={editor.media_type}
                onChange={(e) => setEditor((v) => ({ ...v, media_type: e.target.value as Editor["media_type"] }))}
              >
                <option value="text">Text</option>
                <option value="link">Link</option>
                <option value="photo">Photo</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="social-pillar">Content bucket</label>
              <select
                id="social-pillar"
                className="input"
                value={editor.content_pillar}
                onChange={(e) => setEditor((v) => ({ ...v, content_pillar: e.target.value }))}
              >
                <option value="">Choose one</option>
                {SOCIAL_CONTENT_PILLARS.map((pillar) => <option key={pillar}>{pillar}</option>)}
              </select>
            </div>
          </div>

          {(editor.media_type === "photo" || editor.media_type === "video") && (
            <div>
              <label className="label" htmlFor="social-media-url">
                Public HTTPS {editor.media_type === "photo" ? "image" : "video"} URL
              </label>
              <input
                id="social-media-url"
                className="input"
                type="url"
                value={editor.media_url}
                onChange={(e) => setEditor((v) => ({ ...v, media_url: e.target.value }))}
                placeholder="https://..."
                required
              />
            </div>
          )}

          {editor.media_type === "link" && (
            <div>
              <label className="label" htmlFor="social-link-url">Destination URL</label>
              <input
                id="social-link-url"
                className="input"
                type="url"
                value={editor.link_url}
                onChange={(e) => setEditor((v) => ({ ...v, link_url: e.target.value }))}
                placeholder="https://www.theleadflowpro.com/..."
                required
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="social-schedule">Publish time</label>
              <input
                id="social-schedule"
                className="input"
                type="datetime-local"
                value={editor.scheduled_for}
                onChange={(e) => setEditor((v) => ({ ...v, scheduled_for: e.target.value }))}
              />
              <p className="mt-1 text-xs text-[var(--quiet)]">
                Leave blank for publish now after approval. Meta requires schedules 10 minutes to 75 days ahead.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="social-campaign">Campaign</label>
              <input
                id="social-campaign"
                className="input"
                value={editor.campaign}
                onChange={(e) => setEditor((v) => ({ ...v, campaign: e.target.value }))}
                placeholder="LeadFlow daily organic"
                maxLength={160}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="social-notes">Internal notes</label>
            <textarea
              id="social-notes"
              className="input"
              rows={2}
              value={editor.internal_notes}
              onChange={(e) => setEditor((v) => ({ ...v, internal_notes: e.target.value }))}
              placeholder="Visual brief, source, or follow-up idea. This never goes to Facebook."
              maxLength={3000}
            />
          </div>

          <button type="submit" disabled={busy === "save"} className="btn-primary w-full disabled:opacity-50">
            {busy === "save" ? "Saving..." : editingId ? "Save Changes" : "Save Draft"}
          </button>
        </form>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[var(--heading)]">Content queue</h3>
              <p className="text-xs text-[var(--quiet)]">Newest first. Times are shown in Central Time.</p>
            </div>
            {pending.length > 0 && (
              <button
                type="button"
                className="btn-primary !px-4 !py-2 text-sm"
                disabled={busy === "approve"}
                onClick={() => approvePosts(pending.map((post) => post.id))}
              >
                {busy === "approve" ? "Sending to Meta..." : `Approve All Pending (${pending.length})`}
              </button>
            )}
          </div>

          {posts.map((post) => (
            <article key={post.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[post.status] || STATUS_STYLE.draft}`}>
                    {post.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{post.content_pillar || "Unassigned bucket"}</span>
                  <span className="text-xs text-[var(--quiet)]">{post.media_type}</span>
                </div>
                <span className="text-xs text-[var(--quiet)]">{centralTimeLabel(post.scheduled_for)}</span>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{post.message}</p>

              {post.media_type === "photo" && post.media_url && (
                <img src={post.media_url} alt="Facebook post preview" className="mt-4 max-h-72 w-full rounded-xl border border-line object-cover" />
              )}
              {post.media_type === "video" && post.media_url && (
                <video src={post.media_url} controls className="mt-4 max-h-72 w-full rounded-xl border border-line" />
              )}
              {post.link_url && (
                <a href={post.link_url} target="_blank" rel="noreferrer" className="mt-3 block truncate text-xs font-semibold text-flow-400 hover:underline">
                  {post.link_url}
                </a>
              )}
              {post.last_error && (
                <div className="mt-4 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3 text-xs text-[var(--danger)]">
                  {post.last_error}
                </div>
              )}
              {post.meta_permalink && (
                <a href={post.meta_permalink} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-mint hover:underline">
                  Open published Facebook post
                </a>
              )}

              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                {["draft", "pending_approval", "failed"].includes(post.status) && (
                  <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => edit(post)}>
                    Edit
                  </button>
                )}
                {["draft", "failed"].includes(post.status) && (
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                    disabled={busy === post.id}
                    onClick={() => submitPost(post.id)}
                  >
                    Send for Approval
                  </button>
                )}
                {post.status === "pending_approval" && (
                  <button
                    type="button"
                    className="btn-primary !px-3 !py-1.5 text-xs"
                    disabled={busy === "approve"}
                    onClick={() => approvePosts([post.id])}
                  >
                    {post.scheduled_for ? "Approve and Schedule" : "Approve and Publish Now"}
                  </button>
                )}
                {["draft", "pending_approval", "scheduled", "failed"].includes(post.status) && (
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--danger)]/30 px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/10"
                    disabled={busy === post.id}
                    onClick={() => cancelPost(post)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </article>
          ))}

          {posts.length === 0 && (
            <div className="card text-center text-[var(--muted)]">
              The queue is empty. Create the first draft or let the daily content automation fill it.
            </div>
          )}
        </section>
      </div>

      <form onSubmit={saveSettings} className="card space-y-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--heading)]">Daily publishing schedule</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            The content automation uses these Central Time slots. The fifth slot can stay optional when there is not a strong post worth publishing.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_130px_130px_150px]">
          <div>
            <label className="label" htmlFor="slot-times">Posting times, comma separated</label>
            <input id="slot-times" className="input" value={slotText} onChange={(e) => setSlotText(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="minimum-posts">Minimum</label>
            <input
              id="minimum-posts"
              className="input"
              type="number"
              min={1}
              max={5}
              value={settings.minimum_posts}
              onChange={(e) => setSettings((v) => ({ ...v, minimum_posts: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="maximum-posts">Maximum</label>
            <input
              id="maximum-posts"
              className="input"
              type="number"
              min={1}
              max={5}
              value={settings.maximum_posts}
              onChange={(e) => setSettings((v) => ({ ...v, maximum_posts: Number(e.target.value) }))}
            />
          </div>
          <label className="flex items-end gap-2 pb-3 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={settings.fifth_post_optional}
              onChange={(e) => setSettings((v) => ({ ...v, fifth_post_optional: e.target.checked }))}
            />
            Fifth is optional
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--quiet)]">Timezone: {SOCIAL_TIMEZONE}</span>
          <button type="submit" className="btn-primary !px-4 !py-2 text-sm" disabled={busy === "settings"}>
            {busy === "settings" ? "Saving..." : "Save Daily Schedule"}
          </button>
        </div>
      </form>
    </div>
  );
}
