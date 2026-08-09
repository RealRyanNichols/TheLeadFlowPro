"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

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
      // If email confirmation is disabled this logs straight in;
      // otherwise Supabase sends a confirm link.
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.push(params.get("next") ?? "/dashboard");
        router.refresh();
      } else {
        setMessage("Check your email to confirm your account, then log in.");
        setBusy(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      router.push(params.get("next") ?? "/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex rounded-lg border border-line p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md py-2 ${mode === "login" ? "bg-flow-500 text-white" : "text-slate-400"}`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-2 ${mode === "signup" ? "bg-flow-500 text-white" : "text-slate-400"}`}
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      {message && <p className="text-sm font-medium text-warn">{message}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
        {busy ? "Working..." : mode === "login" ? "Log In" : "Create Account"}
      </button>
    </form>
  );
}
