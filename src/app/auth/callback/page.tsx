"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";

export default function SupabaseAuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell state="loading" message="Finishing LeadFlow login." />}>
      <CallbackInner />
    </Suspense>
  );
}

function safeNext(raw: string | null) {
  if (!raw) return "/buyer";
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  }
  return "/buyer";
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Finishing LeadFlow login.");
  const [state, setState] = useState<"loading" | "error" | "done">("loading");

  useEffect(() => {
    async function finish() {
      const next = safeNext(params.get("next"));
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const error = hash.get("error_description") || params.get("error_description") || params.get("error");
      if (error) {
        setState("error");
        setMessage(error);
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const expiresIn = hash.get("expires_in");
      const expiresAt = hash.get("expires_at");

      if (!accessToken) {
        setState("error");
        setMessage("No Supabase access token was returned. Check Supabase Auth redirect settings or use password login.");
        return;
      }

      const sessionEndpoint = next.startsWith("/partner") ? "/api/partner/auth/session" : "/api/buyer/auth/session";
      const response = await fetch(sessionEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken || undefined,
          expires_in: expiresIn ? Number(expiresIn) : undefined,
          expires_at: expiresAt ? Number(expiresAt) : undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setState("error");
        setMessage(data.error || "LeadFlow session could not be created.");
        return;
      }

      setState("done");
      setMessage("LeadFlow session created.");
      router.replace(next);
      router.refresh();
    }

    finish().catch((error: unknown) => {
      setState("error");
      setMessage(error instanceof Error ? error.message : "LeadFlow login failed.");
    });
  }, [params, router]);

  return <CallbackShell state={state} message={message} />;
}

function CallbackShell({ state, message }: { state: "loading" | "error" | "done"; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4 text-white">
      <section className="lead-shell max-w-xl p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
          {state === "error" ? <TriangleAlert className="h-6 w-6" /> : state === "done" ? <ShieldCheck className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
        </div>
      <h1 className="mt-5 text-3xl font-black">LeadFlow login</h1>
        <p className="mt-3 text-sm leading-6 text-ink-200">{message}</p>
        {state === "error" ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login?mode=buyer" className="btn-accent justify-center text-sm">
              Back to login
            </Link>
            <Link href="/partner/login" className="btn-ghost justify-center text-sm">
              Partner login
            </Link>
            <Link href="/marketplace" className="btn-ghost justify-center text-sm">
              Open marketplace
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
