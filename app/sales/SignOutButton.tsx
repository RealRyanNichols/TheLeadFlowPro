"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text)] disabled:opacity-50"
    >
      {busy ? "Signing out" : "Sign out"}
    </button>
  );
}
