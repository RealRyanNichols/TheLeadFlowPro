import Link from "next/link";
import { Eye } from "lucide-react";

// A lot of the dashboard pages still render illustrative content (sample
// insights, sample ad variants, sample chatbot transcripts, etc.) so users
// can see the shape of what lands here once real data flows in. Drop this
// banner at the top of those pages so we never claim the sample belongs
// to them.
export function DemoBanner({
  children,
  setupHref = "/dashboard/settings#business",
  setupLabel = "Finish profile"
}: {
  children?: React.ReactNode;
  setupHref?: string;
  setupLabel?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 border border-cyan-500/20 bg-cyan-500/[0.04] flex items-start gap-3 flex-wrap">
      <span className="h-8 w-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
        <Eye className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">
          Example preview — not your data yet
        </p>
        <p className="text-xs text-ink-300 mt-0.5">
          {children ?? "What you see below is a sample so you know the shape of this page. Real numbers fill in once your account is fully set up and your data starts flowing."}
        </p>
      </div>
      <Link
        href={setupHref}
        className="btn-ghost text-xs py-1.5 px-3 shrink-0"
      >
        {setupLabel}
      </Link>
    </div>
  );
}
