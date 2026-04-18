"use client";

/**
 * Manual handle entry — used by:
 *   - manual_only platforms (X, Snapchat) as the only path
 *   - pending_approval platforms as the interim path while OAuth is being reviewed
 *
 * Posts to /api/social/manual which enforces the same plan caps server-side.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { kindLabel, type PlatformKind } from "@/lib/social-platforms";

interface Props {
  platformId: string;
  kinds: PlatformKind[];
  showKindPicker: boolean;
}

export function ManualHandleForm({ platformId, kinds, showKindPicker }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const [kind, setKind] = useState<PlatformKind>(kinds[0] ?? "personal");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = handle.trim().replace(/^@/, "");
    if (!cleaned) {
      setError("Handle or profile URL is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/social/manual", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ platform: platformId, kind, handle: cleaned }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.reason ?? "Couldn't save that connection.");
          return;
        }
        router.push("/dashboard/social");
        router.refresh();
      } catch {
        setError("Network hiccup — please try again.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {showKindPicker && (
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-400 mb-1">
            Account type
          </label>
          <div className="flex flex-wrap gap-2">
            {kinds.map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setKind(k)}
                className={
                  "text-xs px-3 py-1.5 rounded-md border transition " +
                  (kind === k
                    ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                    : "bg-ink-900/40 border-white/10 text-ink-300 hover:border-white/20")
                }
              >
                {kindLabel(k)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="handle" className="block text-xs uppercase tracking-wider text-ink-400 mb-1">
          Handle or profile URL
        </label>
        <input
          id="handle"
          name="handle"
          autoComplete="off"
          placeholder="@yourhandle  or  https://…"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="w-full rounded-lg bg-ink-900/60 border border-white/10 px-3 py-2 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-cyan-400/60"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full justify-center disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save connection"}
      </button>
    </form>
  );
}
