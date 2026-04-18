import { Wand2, RefreshCw } from "lucide-react";
import { SocialIcon } from "@/components/flowcard/SocialIcon";
import { CopyButton } from "@/components/ui/CopyButton";
import { SoonButton } from "@/components/ui/SoonButton";
import { DemoBanner } from "@/components/dashboard/DemoBanner";

const SAMPLE_ADS = [
  {
    platform: "facebook",
    audience: "Local homeowners 32–55, ~20mi radius",
    hook: "The 20-minute fix most local pros won't tell you about.",
    body: "We've helped dozens of neighbors this month with same-day service, straight pricing, and zero upsell games. Book now and we'll lock in this week's rate.",
    cta: "Get a free quote →"
  },
  {
    platform: "tiktok",
    audience: "25–40, interested in local services",
    hook: "POV: you finally called the right local pro.",
    body: "Hey, I'm [your name]. This is what a real first visit looks like — no jargon, no pressure, just honest work. Watch ↓",
    cta: "DM 'QUOTE' for pricing"
  },
  {
    platform: "instagram",
    audience: "Local followers, recent service-related engagement",
    hook: "I almost waited another year. Glad I didn't.",
    body: "Real before + after from a neighbor in your area. What the job actually looked like — and what it actually cost. (Less than you think.)",
    cta: "Tap to see the full story"
  }
];

export default function AdCopyPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <DemoBanner setupHref="/dashboard/settings#business" setupLabel="Set business info">
        The three ad variants below are samples — local-service placeholders,
        not generated from your account. Fill in your business info and click
        Generate to get ads in your voice.
      </DemoBanner>

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
              defaultValue="Homeowners 30–55 within 20 miles. Looking for a reliable local pro."
              className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
            />
          </Field>
          <Field label="Offer / hook angle" className="sm:col-span-2">
            <input
              defaultValue="Free estimate + same-week service"
              className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
            />
          </Field>
        </div>
        <SoonButton variant="primary" className="mt-5">
          <Wand2 className="h-4 w-4" /> Generate 5 variations
        </SoonButton>
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
                <CopyButton
                  value={`${a.hook}\n\n${a.body}\n\n${a.cta}`}
                  className="flex-1 text-xs py-1.5 px-3"
                />
                <SoonButton size="xs" className="flex-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </SoonButton>
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
