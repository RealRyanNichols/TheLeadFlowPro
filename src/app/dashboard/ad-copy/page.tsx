import { Megaphone, Wand2, Copy, RefreshCw } from "lucide-react";
import { SocialIcon } from "@/components/flowcard/SocialIcon";

const SAMPLE_ADS = [
  {
    platform: "facebook",
    audience: "Moms 32–44 in Longview area",
    hook: "Been putting off your smile? You're not alone — and it's easier than you think.",
    body: "We helped 50 women like you start Invisalign last month at Premier Dental of Longview. 0% financing. Same-day exam. No judgment, ever.",
    cta: "Book your free 15-min consult →"
  },
  {
    platform: "tiktok",
    audience: "Cosmetic-curious 25–40 across East Texas",
    hook: "POV: you finally booked the dentist after 7 years.",
    body: "Hi, I'm Dr. Smith. We do cosmetic dentistry without the snobby, scary vibes. Watch what a first visit actually looks like ↓",
    cta: "DM 'CONSULT' for a free quote"
  },
  {
    platform: "instagram",
    audience: "Local women, recent engagement on cosmetic content",
    hook: "Nobody told me Invisalign would change my whole face.",
    body: "Real patient story from Premier Dental of Longview. Before, during, and after — plus what it actually cost. (Less than you think.)",
    cta: "Tap to see her full transformation"
  }
];

export default function AdCopyPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <p className="text-cyan-400 text-sm font-semibold">Ad Copy Generator</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          Hooks, headlines, and full ads — <span className="funnel-text">in your voice</span>
        </h1>
        <p className="mt-2 text-ink-300">
          Generated from your audience analysis and your top-performing posts. Copy what
          works, edit what doesn't, paste straight into Meta or TikTok Ads Manager.
        </p>
      </div>

      <div className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">Generate new ad</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Platform">
            <select className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none">
              <option>Facebook</option><option>Instagram</option>
              <option>TikTok</option><option>YouTube</option><option>Google Search</option>
            </select>
          </Field>
          <Field label="Goal">
            <select className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none">
              <option>Get more leads (form fills)</option>
              <option>Drive calls</option>
              <option>Book appointments</option>
              <option>Build brand awareness</option>
            </select>
          </Field>
          <Field label="Target audience" className="sm:col-span-2">
            <input
              defaultValue="Moms 32–44 in 30 miles of Longview, TX. Interested in Invisalign or whitening."
              className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
            />
          </Field>
          <Field label="Offer / hook angle" className="sm:col-span-2">
            <input
              defaultValue="0% financing on Invisalign + free consult"
              className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
            />
          </Field>
        </div>
        <button className="btn-primary text-sm py-2 px-4 mt-5">
          <Wand2 className="h-4 w-4" /> Generate 5 variations
        </button>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-3">Recent generations</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {SAMPLE_ADS.map((a, i) => (
            <div key={i} className="glass rounded-2xl p-5 hover:border-cyan-500/30 transition flex flex-col">
              <div className="flex items-center gap-2">
                <SocialIcon platform={a.platform} className="h-4 w-4 text-cyan-400" />
                <span className="text-xs uppercase tracking-wider text-ink-400 font-semibold">{a.platform}</span>
              </div>
              <p className="mt-2 text-[11px] text-ink-300">{a.audience}</p>

              <div className="mt-3 space-y-3 text-sm flex-1">
                <Block label="Hook" body={a.hook} accent />
                <Block label="Body" body={a.body} />
                <Block label="CTA"  body={a.cta} />
              </div>

              <div className="mt-4 flex gap-2">
                <button className="btn-ghost text-xs py-1.5 px-3 flex-1">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button className="btn-ghost text-xs py-1.5 px-3 flex-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="text-xs uppercase tracking-wider text-ink-400 font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Block({ label, body, accent }: { label: string; body: string; accent?: boolean }) {
  return (
    <div className={"rounded-xl p-3 border-l-2 " + (accent ? "border-accent-500 bg-accent-500/5" : "border-cyan-500/40 bg-white/5")}>
      <p className={"text-[10px] uppercase tracking-wider font-semibold " + (accent ? "text-accent-400" : "text-cyan-400")}>{label}</p>
      <p className="text-sm text-white mt-1">{body}</p>
    </div>
  );
}
