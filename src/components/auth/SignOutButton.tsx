"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

type Variant = "compact" | "full";

export function SignOutButton({
  variant = "compact",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-ink-200 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-100"
        }
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label="Sign out"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={
        className ??
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-rose-500/10 hover:text-rose-100"
      }
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
