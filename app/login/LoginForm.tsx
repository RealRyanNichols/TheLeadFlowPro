"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  authCallbackPath,
  authDestination,
  safeAuthNext,
} from "@/lib/authRedirect";

// Names attached on first magic-link signup so the workspace shows a person
// rather than a blank profile. pat@theleadflowpro.com is the permanent company
// identity; pat@dripgate.org is the temporary bridge and gets revoked once the
// company login is verified.
const KNOWN_OPERATORS: Record<string, string> = {
  "pat@theleadflowpro.com": "Patrick Grabbs",
  "pat@dripgate.org": "Patrick Grabbs",
};

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const next = safeAuthNext(params.get("next"));
  const authError = params.get("auth_error");
  const [mode, setMode] = useState<"login" | "signup" | "reset">(
    params.get("mode") === "signup"
      ? "signup"
      : params.get("mode") === "reset"
        ? "reset"
        : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    authError === "workspace_unavailable"
      ? "You signed in, but we could not load your workspace. Try signing in again or contact the team."
      : authError
        ? "That email link could not be completed. Request a fresh link and open it in the same browser where you requested it."
        : null,
  );

  const homeFor = useCallback(
    async (userId?: string) => {
      if (!userId) return "/dashboard";
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (error)
        throw new Error("We could not load your workspace. Please try again.");
      return authDestination(prof?.role, next);
    },
    [next, supabase],
  );

  const enterWorkspace = useCallback(
    async (userId?: string) => {
      try {
        const destination = await homeFor(userId);
        // Full navigation makes the authenticated server request after cookies
        // are saved and avoids reusing a prefetched signed-out response.
        window.location.assign(destination);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "We could not open your workspace. Try again.",
        );
        setBusy(false);
      }
    },
    [homeFor],
  );

  useEffect(() => {
    setClientReady(true);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user || authError || mode === "reset") return;
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/account/password");
        return;
      }
      if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
      window.setTimeout(() => {
        void enterWorkspace(session.user.id);
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, [authError, enterWorkspace, mode, router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "reset") {
      await sendPasswordReset();
      return;
    }
    setBusy(true);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}${authCallbackPath(next)}`,
        },
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await enterWorkspace(data.user.id);
      } else {
        setMessage("Check your email to confirm your account, then log in.");
        setBusy(false);
      }
    } else {
      const { data: signIn, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      await enterWorkspace(signIn.user?.id);
    }
  }

  async function sendOneTimeLink() {
    if (!email.trim()) {
      setMessage(
        "Enter the email address that should receive the sign-in link.",
      );
      return;
    }
    setLinkBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}${authCallbackPath(next)}`,
        data: KNOWN_OPERATORS[email.trim().toLowerCase()]
          ? { full_name: KNOWN_OPERATORS[email.trim().toLowerCase()] }
          : undefined,
      },
    });
    setLinkBusy(false);
    setMessage(
      error
        ? error.message
        : "Check your email for a one-time sign-in link. Open it in this same browser; the link can only be used once.",
    );
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      setMessage("Type your email above first, then tap Forgot password.");
      return;
    }
    setLinkBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${authCallbackPath("/account/password")}`,
    });
    setLinkBusy(false);
    setMessage(
      error
        ? error.message
        : "If an account uses this email, a reset link is on its way. Open it in this same browser to choose your new password.",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "reset" ? (
        <h2 className="text-xl font-bold text-[var(--heading)]">
          Reset your password
        </h2>
      ) : (
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
      )}

      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="fullName">
            Your name
          </label>
          <input
            className="input"
            id="fullName"
            disabled={!clientReady}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          className="input"
          id="email"
          disabled={!clientReady}
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {mode !== "reset" && (
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="password">
              Password
            </label>
            {mode === "login" && (
              <a
                href={`/login?mode=reset${next ? `&next=${encodeURIComponent(next)}` : ""}`}
                className="inline-flex min-h-[44px] items-center text-sm font-bold text-[var(--blue)] hover:underline"
              >
                Forgot password?
              </a>
            )}
          </div>
          <input
            className="input"
            id="password"
            disabled={!clientReady}
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 8 : undefined}
          />
        </div>
      )}

      {message && (
        <p role="status" className="text-sm font-medium text-[var(--text)]">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={!clientReady || busy || linkBusy}
        className="btn-primary w-full disabled:opacity-50"
      >
        {busy || linkBusy
          ? "Working..."
          : mode === "reset"
            ? "Send password reset link"
            : mode === "login"
              ? "Log In"
              : "Create Account"}
      </button>
      {mode === "reset" && (
        <a
          href="/login"
          className="flex min-h-[44px] items-center justify-center text-sm font-bold text-[var(--blue)] underline"
        >
          Back to sign in
        </a>
      )}

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
            disabled={!clientReady || busy || linkBusy}
            className="w-full rounded-lg border border-[var(--line-strong)] px-4 py-3 text-sm font-bold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)] disabled:opacity-50"
          >
            {linkBusy
              ? "Sending secure link..."
              : "Email me a one-time sign-in link"}
          </button>
        </>
      )}
    </form>
  );
}
