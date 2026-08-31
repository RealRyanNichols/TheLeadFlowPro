"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Play, ShieldAlert, X } from "lucide-react";

type Skill = {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  risk_level: string;
  enabled: boolean;
};

type Approval = {
  id: string;
  title: string;
  summary: string;
  risk_level: string;
};

export default function OperatorControls({
  skills,
  approvals,
}: {
  skills: Skill[];
  approvals: Approval[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  async function request(url: string, init: RequestInit, key: string) {
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "OperatorOS request failed");
      setMessage("Saved. Mission Control is refreshing.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "OperatorOS request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.05)]">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
          <h3 className="font-black text-[var(--heading)]">Run a trained skill</h3>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Every run is manual in v1. It analyzes live records and writes an audit trail. External actions stay blocked.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {skills.filter((skill) => skill.enabled).map((skill) => (
            <button
              key={skill.id}
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                request(
                  "/api/admin/operator/runs",
                  { method: "POST", body: JSON.stringify({ skillId: skill.id, execute: true }) },
                  `run:${skill.id}`,
                )
              }
              className="group rounded-xl border border-[var(--line)] p-4 text-left transition hover:border-[var(--accent-line)] hover:bg-[var(--accent-tint)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-[var(--heading)]">{skill.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                    {skill.description || "Custom trained workflow"}
                  </p>
                </div>
                {busy === `run:${skill.id}` ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-[var(--blue)]" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4 text-[var(--blue)]" aria-hidden="true" />
                )}
              </div>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-[var(--quiet)]">
                {skill.provider === "openai" ? "ChatGPT" : "Claude"} · {skill.risk_level} lane
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.05)]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />
          <h3 className="font-black text-[var(--heading)]">Human stopline</h3>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Approval records authorize a human-controlled next step. The AI does not perform the external action.
        </p>
        {approvals.length ? (
          <div className="mt-4 space-y-3">
            {approvals.map((approval) => (
              <article key={approval.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-amber-950">{approval.title}</p>
                    <p className="mt-1 text-sm leading-6 text-amber-900">{approval.summary}</p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-amber-700">
                      {approval.risk_level} approval required
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        request(
                          `/api/admin/operator/approvals/${approval.id}`,
                          { method: "PATCH", body: JSON.stringify({ decision: "approved" }) },
                          `approve:${approval.id}`,
                        )
                      }
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white disabled:opacity-60"
                    >
                      {busy === `approve:${approval.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        request(
                          `/api/admin/operator/approvals/${approval.id}`,
                          { method: "PATCH", body: JSON.stringify({ decision: "rejected" }) },
                          `reject:${approval.id}`,
                        )
                      }
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-black text-red-700 disabled:opacity-60"
                    >
                      {busy === `reject:${approval.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            Stopline clear. No proposed external actions are waiting.
          </div>
        )}
      </section>

      {message && (
        <p className={`rounded-xl border px-4 py-3 text-sm font-bold ${message.startsWith("Saved") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
