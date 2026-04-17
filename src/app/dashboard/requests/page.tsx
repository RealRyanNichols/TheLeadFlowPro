import { Plus, ThumbsUp, Lightbulb, Wrench, CheckCircle2 } from "lucide-react";

const REQUESTS = [
  {
    title: "Auto-send a thank-you GIF when a new customer books",
    desc: "Personalized GIF with their first name fires the second the form gets a booking confirmation.",
    status: "shipped_all", upvotes: 14, reply: "Built into the platform — live for everyone."
  },
  {
    title: "Pull no-show stats from my scheduling tool",
    desc: "Want a daily 'who didn't show' list with one-tap text-back to rebook.",
    status: "scoped", upvotes: 9, reply: "Yes — $25 one-time custom integration. Estimated 4 days."
  },
  {
    title: "Birthday SMS with a $25 loyalty credit",
    desc: "Auto-send on the customer's birthday with their unique code.",
    status: "building", upvotes: 22, reply: "Building for everyone — ships next week. Free."
  },
  {
    title: "Voice-clone for the chatbot in my own voice",
    desc: "When the bot replies, it sounds like me on voicemail.",
    status: "reviewing", upvotes: 6, reply: ""
  }
];

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: any }> = {
  proposed:    { label: "Proposed",        cls: "bg-white/5 text-ink-300 border-white/10",                  icon: Lightbulb },
  reviewing:   { label: "Reviewing",       cls: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",          icon: Lightbulb },
  scoped:      { label: "Scoped — $25",    cls: "bg-accent-500/15 text-accent-400 border-accent-500/30",    icon: Wrench    },
  building:    { label: "Building (free)", cls: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",          icon: Wrench    },
  shipped_all: { label: "Shipped to all",  cls: "bg-lead-500/15 text-lead-400 border-lead-500/30",          icon: CheckCircle2 },
  shipped_one: { label: "Shipped to you",  cls: "bg-lead-500/15 text-lead-400 border-lead-500/30",          icon: CheckCircle2 },
  gifted:      { label: "Gifted (free)",   cls: "bg-lead-500/15 text-lead-400 border-lead-500/30",          icon: CheckCircle2 },
  declined:    { label: "Not feasible",    cls: "bg-red-500/10 text-red-400 border-red-500/20",             icon: Lightbulb }
};

export default function RequestsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-cyan-400 text-sm font-semibold">Request a Tool</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          Tell us what you wish existed. <span className="funnel-text">We'll build it.</span>
        </h1>
        <p className="mt-2 text-ink-300">
          If it helps everyone, we ship it free. If it's just for you, we quote a fair
          one-time price (usually $5–$50). Sometimes we just gift it.
        </p>
      </div>

      <div className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">Submit a new request</h2>
        <div className="mt-4 space-y-3">
          <input
            placeholder="Title — e.g. 'Auto-text customers when their car is ready'"
            className="w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
          />
          <textarea
            placeholder="Describe what you want it to do, where it would plug in, and how often you'd use it…"
            rows={4}
            className="w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <select className="bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none">
              <option>Build for everyone if useful</option>
              <option>Just for me (custom)</option>
              <option>Not sure — you decide</option>
            </select>
            <button className="btn-primary text-sm py-2 px-4">
              <Plus className="h-4 w-4" /> Submit request
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-3">Community requests</h2>
        <div className="space-y-3">
          {REQUESTS.map((r) => {
            const s = STATUS_STYLES[r.status];
            return (
              <div key={r.title} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white">{r.title}</h3>
                      <span className={"stat-pill border text-[11px] " + s.cls}>
                        <s.icon className="h-3 w-3" /> {s.label}
                      </span>
                    </div>
                    <p className="text-sm text-ink-200 mt-2">{r.desc}</p>
                    {r.reply && (
                      <div className="mt-3 glass rounded-xl p-3 border-l-2 border-accent-500">
                        <p className="text-[10px] uppercase tracking-wider text-accent-400 font-semibold">Our reply</p>
                        <p className="text-sm text-ink-100 mt-1">{r.reply}</p>
                      </div>
                    )}
                  </div>
                  <button className="btn-ghost text-xs py-2 px-3 shrink-0">
                    <ThumbsUp className="h-3.5 w-3.5" /> {r.upvotes}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
