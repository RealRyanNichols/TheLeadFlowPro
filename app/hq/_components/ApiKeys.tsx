"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert } from "lucide-react";
import { hqPost } from "./api";
import CopyButton from "./CopyButton";

// Keys for the tools that ask for one: Claude Code, Cursor, a script. The
// full key is shown once, right after it is made, and never again. That is
// deliberate: we only keep a hash, so nobody here can read your key back to
// you, and nobody who gets into this page later can either.

export type KeyRow = {
  id: string;
  name: string;
  key_hint: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

function dateText(iso: string | null): string {
  if (!iso) return "never";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(at);
}

export default function ApiKeys({ keys }: { keys: KeyRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);

  const active = keys.filter((k) => !k.revoked_at);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy("create");
    setError("");
    setFresh(null);
    const result = await hqPost("create_api_key", { name: name.trim() || "Plugin key" });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const key = result.data.key;
    setFresh(typeof key === "string" ? key : null);
    setName("");
    router.refresh();
  }

  async function revoke(id: string) {
    setBusy(id);
    setError("");
    const result = await hqPost("revoke_api_key", { id });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section id="keys" className="hq-card scroll-mt-24">
      <div className="flex items-center gap-2">
        <KeyRound aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
        <h2 className="text-xl font-black text-[var(--heading)]">Keys</h2>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
        ChatGPT and Claude on the web do not need a key. They sign you in instead. Claude Code, Cursor and anything you script need one of these.
      </p>

      {fresh && (
        <div className="mt-4 rounded-xl border border-[var(--warn-line)] bg-[var(--warn-tint)] p-4">
          <p className="flex items-center gap-2 text-sm font-black text-[var(--heading)]">
            <ShieldAlert aria-hidden="true" className="h-4 w-4 text-[var(--warn)]" /> Copy this now. It is not shown again.
          </p>
          <code className="hq-code mt-3">{fresh}</code>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton value={fresh} label="Copy the key" className="hq-btn" />
            <button type="button" className="hq-btn" onClick={() => setFresh(null)}>
              I saved it
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Treat it like your shop key. Anyone who has it can read and change this workspace. Lost it? Revoke it here and make a new one.
          </p>
        </div>
      )}

      <form onSubmit={create} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="hq-label" htmlFor="key-name">
            What is this key for
          </label>
          <input id="key-name" className="hq-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Laptop, Claude Code" />
        </div>
        <button type="submit" className="hq-btn" disabled={busy === "create"}>
          {busy === "create" ? "Making it..." : "Create a key"}
        </button>
      </form>

      {error && <p className="hq-error mt-3">{error}</p>}

      {active.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">No keys yet.</p>
      ) : (
        <ul className="mt-4">
          {active.map((key) => (
            <li key={key.id} className="hq-row flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--heading)]">{key.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {key.key_hint} · made {dateText(key.created_at)} · last used {dateText(key.last_used_at)}
                </p>
              </div>
              <button type="button" className="hq-btn hq-btn-sm" disabled={busy === key.id} onClick={() => revoke(key.id)}>
                {busy === key.id ? "Revoking..." : "Revoke"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
