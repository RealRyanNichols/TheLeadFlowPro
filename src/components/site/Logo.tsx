import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Abstract signal-pull mark used across the public site and app shell.
 */
export function FunnelMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id="lf-signal-bg" cx="50%" cy="35%" r="74%">
          <stop offset="0%" stopColor="#123a68" />
          <stop offset="52%" stopColor="#071525" />
          <stop offset="100%" stopColor="#02050b" />
        </radialGradient>
        <linearGradient id="lf-signal-line" x1="8" x2="56" y1="52" y2="12">
          <stop offset="0%" stopColor="#a6e36b" />
          <stop offset="46%" stopColor="#5cd0ff" />
          <stop offset="100%" stopColor="#ffd66b" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="54" height="54" rx="15" fill="url(#lf-signal-bg)" />
      <rect x="6" y="6" width="52" height="52" rx="14" fill="none" stroke="#5cd0ff" strokeOpacity=".38" strokeWidth="1.5" />
      <path d="M14 45 25 32 33 36 48 18 55 23" fill="none" stroke="url(#lf-signal-line)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="45" r="6" fill="#a6e36b" />
      <circle cx="25" cy="32" r="5" fill="#5cd0ff" />
      <circle cx="33" cy="36" r="4.5" fill="#ffffff" />
      <circle cx="48" cy="18" r="6.5" fill="#ffd66b" />
      <circle cx="55" cy="23" r="4.5" fill="#ffd66b" />
      <circle cx="32" cy="32" r="13" fill="#02050b" fillOpacity=".58" stroke="#5cd0ff" strokeOpacity=".55" strokeWidth="1.5" />
      <path d="M25 39V25h5v9h8v5H25Z" fill="#ffffff" />
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
    <Link href={href} className={cn("lead-logo group", className)}>
      <span className="lead-logo-orb">
        <FunnelMark className="h-9 w-9 transition group-hover:scale-105" />
      </span>
      {withWordmark && (
        <span className="lead-wordmark">
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
