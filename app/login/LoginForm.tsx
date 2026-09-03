"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Names attached on first magic-link signup so the workspace shows a person
// rather than a blank profile. pat@theleadflowpro.com is the permanent company
// identity; pat@dripgate.org is the temporary bridge and gets revoked once the
// company login is verified.
const KNOWN_OPERATORS: Record<string, string> = {
  "pat@theleadflowpro.com": "Patrick Grabbs",
  "pat@dripgate.org": "Patrick Grabbs",
};

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"login" | "signup">(
    params.get("mode") === "signup" ? "signup" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function homeFor(userId?: string) {
    if (!userId) return "/dashboard";
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (prof?.role === "admin") return "/admin";
    if (prof?.role === "sales") return "/admin/sales";
    return "/dashboard";
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      window.setTimeout(() => {
        void homeFor(session.user.id).then((home) => {
          router.replace(next ?? home);
          router.refresh();
        });
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, [next, router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.push(next ?? (await homeFor(data.user.id)));
        router.refresh();
      } else {
        setMessage("Check your email to confirm your account, then log in.");
        setBusy(false);
      }
    } else {
      const { data: signIn, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      router.push(next ?? (await homeFor(signIn.user?.id)));
      router.refresh();
    }
  }

  async function sendOneTimeLink() {
    if (!email.trim()) {
      setMessage("Enter the email address that should receive the sign-in link.");
      return;
    }
    setLinkBusy(true);
    setMessage(null);
    const destination = next ?? "/admin/sales";
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(destination)}`,
        data: KNOWN_OPERATORS[email.trim().toLowerCase()]
          ? { full_name: KNOWN_OPERATORS[email.trim().toLowerCase()] }
          : undefined,
      },
    });
    setLinkBusy(false);
    setMessage(error ? error.message : "One-time sign-in link sent. Check your email; the link can only be used once.");
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      setMessage("Type your email above first, then tap Forgot password.");
      return;
    }
    setLinkBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/account/password`,
    });
    setLinkBusy(false);
    setMessage(
      error
        ? error.message
        : "Reset link sent. Open the email and set your new password yourself; nobody else ever types it.",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex rounded-lg border border-line p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md py-2 ${mode === "login" ? "bg-flow-500 text-white" : "text-[var(--muted)]"}`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-2 ${mode === "signup" ? "bg-flow-500 text-white" : "text-[var(--muted)]"}`}
        >
          Sign Up
        </button>
      </div>

      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="fullName">Your name</label>
          <input
            className="input"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          className="input"
          id="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="label" htmlFor="password">Password</label>
          {mode === "login" && (
            <button
              type="button"
              onClick={sendPasswordReset}
              disabled={busy || linkBusy}
              className="text-xs font-bold text-[var(--blue)] hover:underline disabled:opacity-50"
            >
              Forgot password?
            </button>
          )}
        </div>
        <input
          className="input"
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      {message && <p className="text-sm font-medium text-warn">{message}</p>}

      <button type="submit" disabled={busy || linkBusy} className="btn-primary w-full disabled:opacity-50">
        {busy ? "Working..." : mode === "login" ? "Log In" : "Create Account"}
      </button>

      {mode === "login" && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[var(--quiet)]">
            <span className="h-px flex-1 bg-[var(--line)]" />
            or
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>
          <button
            type="button"
            onClick={sendOneTimeLink}
            disabled={busy || linkBusy}
            className="w-full rounded-lg border border-[var(--line-strong)] px-4 py-3 text-sm font-bold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)] disabled:opacity-50"
          >
            {linkBusy ? "Sending secure link..." : "Email me a one-time sign-in link"}
          </button>
        </>
      )}
    </form>
  );
}
