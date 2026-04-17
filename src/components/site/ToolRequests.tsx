import Link from "next/link";
import { Lightbulb, ThumbsUp, Wrench } from "lucide-react";

export function ToolRequests() {
  return (
    <section id="requests" className="py-24">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Built-to-fit
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold">
              Need a tool that <span className="funnel-text">doesn't exist yet?</span>
              {" "}
              Ask us.
            </h2>
            <p className="mt-5 text-ink-200 text-lg">
              Inside the dashboard, you can request any tool you wish you had. We
              look at the data, scope it, and reply with one of three things:
            </p>
            <ul className="mt-6 space-y-3 text-ink-100">
              <li className="flex gap-3">
                <span className="stat-pill bg-lead-500/15 text-lead-400 border border-lead-500/30 shrink-0">
                  Free
                </span>
                <span className="text-sm">
                  If it helps everyone, we ship it into the platform — at no extra cost to you.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="stat-pill bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
                  Custom
                </span>
                <span className="text-sm">
                  If it's just for your business, we quote you a fair one-time price (often $5–$50).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="stat-pill bg-accent-500/15 text-accent-400 border border-accent-500/30 shrink-0">
                  Gifted
                </span>
                <span className="text-sm">
                  Sometimes we just build it for free — because it's a good idea and we want you to win.
                </span>
              </li>
            </ul>
            <Link href="/dashboard/requests" className="btn-primary text-base mt-8 inline-flex">
              Open the request board
            </Link>
          </div>

          {/* mock request card */}
          <div className="glass-strong rounded-3xl p-6 md:p-8">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 flex items-center justify-center text-white shrink-0">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Request from a real user</p>
                <h3 className="text-lg font-bold text-white mt-1">
                  "Auto-send a thank-you GIF when a new patient books"
                </h3>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-200">
              "Every time someone books an appointment from my form, I want a custom thank-you
              GIF to fire off automatically with their first name on it. Possible?"
            </p>
            <div className="mt-4 glass rounded-xl p-4 border-l-2 border-accent-500">
              <p className="text-xs uppercase tracking-wider text-accent-400 font-semibold mb-2 flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5" /> Our reply
              </p>
              <p className="text-sm text-ink-100">
                "Yes — we'll build the personalized-GIF generator into the platform for
                everyone (free) since 14 other users have asked for something similar.
                Live in 7 days. We'll text you when it's ready."
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-ink-300">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" /> 14 upvotes
              </span>
              <span className="text-lead-400 font-semibold">Status: building → shipped to all</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
