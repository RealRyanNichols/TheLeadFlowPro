"use client";

// Set a new password. Reached two ways: from the "Forgot password?" email
// link (which signs the visitor in with a one-time recovery session), or by
// a logged-in user who just wants to change it. The password is typed by
// the person, never by anyone else, and never stored outside Supabase auth.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordForm() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [ready, setReady] = useState<"checking" | "yes" | "no">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // The recovery link lands with tokens in the URL; give the client a
    // beat to pick the session up before deciding nobody is here.
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) setReady("yes");
    };
    void check();
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setReady(data.user ? "yes" : "no");
    }, 1500);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session?.user) setReady("yes");
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("The two entries do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Password updated. Taking you in...");
    window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 800);
  }

  if (ready === "checking") {
    return <p className="text-sm text-[var(--muted)]">One moment...</p>;
  }

  if (ready === "no") {
    return (
      <p className="text-sm text-[var(--muted)]">
        This page works from the password reset email. Go to the{" "}
        <a href="/login" className="font-bold text-[var(--blue)] underline">login page</a>, enter
        your email, and tap &quot;Forgot password?&quot; to get a fresh link.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">Type it again</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {message && <p className="text-sm font-semibold text-[var(--text)]">{message}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? "Saving..." : "Save new password"}
      </button>
    </form>
  );
}
