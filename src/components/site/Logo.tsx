import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * SVG fallback that mirrors the real logo (funnel + green dots).
 * Replace /public/logo.png with your actual artwork — it'll render automatically.
 */
export function FunnelMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="lf-funnel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a90ff" />
          <stop offset="35%" stopColor="#23b8ff" />
          <stop offset="70%" stopColor="#ff9a1f" />
          <stop offset="100%" stopColor="#ffd66b" />
        </linearGradient>
      </defs>
      {/* lead drops */}
      <circle cx="22" cy="6" r="2.4" fill="#7fc93f" />
      <circle cx="29" cy="9" r="2.4" fill="#a6e36b" />
      <circle cx="18" cy="11" r="2.4" fill="#5fa726" />
      <circle cx="26" cy="14" r="2.4" fill="#7fc93f" />
      {/* funnel */}
      <path
        d="M8 18 L40 18 L30 38 L30 56 L24 56 L24 38 Z"
        fill="url(#lf-funnel)"
      />
    </svg>
  );
}

export function Logo({
  className,
  withWordmark = true,
  href = "/",
}: {
  className?: string;
  withWordmark?: boolean;
  /** Where the logo links to. Defaults to "/" (marketing site).
   *  Inside the dashboard shell we pass href="/dashboard" so clicking
   *  the logo keeps a signed-in user inside the app instead of kicking
   *  them back to the public homepage (where it feels like a logout).
   */
  href?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 group", className)}>
      <FunnelMark className="h-9 w-9 transition group-hover:scale-105" />
      {withWordmark && (
        <span className="font-extrabold text-lg leading-none">
          <span className="text-ink-50">The </span>
          <span className="bg-gradient-to-r from-cyan-400 to-accent-400 bg-clip-text text-transparent">
            LeadFlow
          </span>
          <span className="text-ink-50"> Pro</span>
        </span>
      )}
    </Link>
  );
}
