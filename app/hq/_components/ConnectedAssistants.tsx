"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { hqPost } from "./api";

// Which assistants are signed in to this workspace right now, and the button
// that throws one out. Disconnecting takes effect immediately: the next thing
// that assistant asks for is refused until somebody approves it again.

export type ConnectorRow = {
  id: string;
  client_name: string;
  created_at: string;
  last_used_at: string | null;
};

function dateText(iso: string | null): string {
  if (!iso) return "not yet";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(at);
}

export default function ConnectedAssistants({ rows }: { rows: ConnectorRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function disconnect(id: string) {
    setBusy(id);
    setError("");
    const result = await hqPost("revoke_connector", { id });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="hq-card">
      <div className="flex items-center gap-2">
        <Bot aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
        <h2 className="text-xl font-black text-[var(--heading)]">Connected assistants</h2>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">Everything signed in to this workspace. Disconnect anything you do not recognize.</p>
      {error && <p className="hq-error mt-3">{error}</p>}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Nothing is connected yet. Follow the steps above and this list fills in.</p>
      ) : (
        <ul className="mt-3">
          {rows.map((row) => (
            <li key={row.id} className="hq-row flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--heading)]">{row.client_name}</p>
                <p className="text-xs text-[var(--muted)]">
                  connected {dateText(row.created_at)} · last used {dateText(row.last_used_at)}
                </p>
              </div>
              <button type="button" className="hq-btn hq-btn-sm" disabled={busy === row.id} onClick={() => disconnect(row.id)}>
                {busy === row.id ? "Disconnecting..." : "Disconnect"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
