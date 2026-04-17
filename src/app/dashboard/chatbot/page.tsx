import { Bot, MessageSquare, Wand2, Globe, Smartphone, Instagram } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";

const SAMPLE_TRANSCRIPT = [
  { role: "lead",  text: "Hey, do y'all handle same-week jobs?" },
  { role: "bot",   text: "Hi! Yes — we can usually get someone out within the week. Were you wanting a free estimate, or to book a visit?" },
  { role: "lead",  text: "Estimate first I think" },
  { role: "bot",   text: "No problem. Most jobs like yours run $300–$900 depending on scope, and we offer simple financing. Want me to send a 60-second walkthrough of how pricing works?" },
  { role: "lead",  text: "yeah that'd be great" },
  { role: "bot",   text: "Sent! 🎥 If you'd like to get on the calendar, I can hold a couple openings for you — what days/times usually work?" }
];

export default function ChatbotPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <p className="text-cyan-400 text-sm font-semibold">AI Chatbot</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          Your voice, <span className="funnel-text">never sleeping</span>
        </h1>
        <p className="mt-2 text-ink-300">
          Trained on your scripts, your tone, your videos. Answers FAQs and qualifies
          leads 24/7. You stay in the loop and step in whenever you want.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Conversations (30d)" value="142" delta={28.4} highlight />
        <StatCard label="Leads qualified"      value="38" delta={11.2} />
        <StatCard label="Handoffs to you"      value="24" sub="When the lead asked for a human" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-cyan-400" /> Bot persona
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Bot name" defaultValue="Avery" />
              <Field label="Business name" defaultValue="Your Business" />
              <Field
                label="Tone"
                defaultValue="Friendly, casual, never pushy. Texts like a real person."
                textarea
                className="sm:col-span-2"
              />
              <Field
                label="What you DO offer"
                defaultValue="List your core services here — the things you want leads to ask about."
                textarea
                className="sm:col-span-2"
              />
              <Field
                label="What you DON'T offer"
                defaultValue="List anything you want the bot to politely decline or refer out."
                textarea
                className="sm:col-span-2"
              />
            </div>
          </div>

          <div className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white">Where the bot answers</h2>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <Channel icon={Globe}      label="Website widget" enabled />
              <Channel icon={Smartphone} label="SMS replies"    enabled />
              <Channel icon={Instagram}  label="Instagram DMs"  />
            </div>
          </div>

          <div className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white">Recent conversation</h2>
            <p className="text-xs text-ink-400 mt-1">Maria G · via Meta ad · 12 min ago</p>
            <div className="mt-4 space-y-2">
              {SAMPLE_TRANSCRIPT.map((m, i) => (
                <div key={i} className={m.role === "bot" ? "flex justify-start" : "flex justify-end"}>
                  <div
                    className={
                      m.role === "bot"
                        ? "max-w-[85%] glass rounded-2xl rounded-tl-md px-4 py-2 text-sm text-ink-100"
                        : "max-w-[85%] bg-gradient-to-br from-brand-600 to-cyan-500 rounded-2xl rounded-tr-md px-4 py-2 text-sm text-white"
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-accent-400" /> AI suggestion
            </h3>
            <p className="mt-3 text-sm text-ink-200">
              Your bot has answered "what's your service area?" 14 times this week. Want to add it
              to the standard FAQ so it answers faster (and you don't pay for the AI call)?
            </p>
            <button className="btn-primary text-sm py-2 px-3 mt-4 w-full">
              Add to FAQ
            </button>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white">Plug-in points</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-200">
              <li>📋 Embed code for your website</li>
              <li>📱 Twilio / Bandwidth phone number</li>
              <li>📷 Meta Business Suite (IG/FB DMs)</li>
              <li>📊 GoHighLevel webhook</li>
            </ul>
            <button className="btn-ghost text-xs py-2 px-3 mt-4 w-full">
              Get install snippets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, defaultValue, textarea, className
}: { label: string; defaultValue?: string; textarea?: boolean; className?: string }) {
  return (
    <label className={className}>
      <span className="text-xs uppercase tracking-wider text-ink-400 font-semibold">{label}</span>
      {textarea ? (
        <textarea defaultValue={defaultValue} rows={2}
          className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none resize-none" />
      ) : (
        <input defaultValue={defaultValue}
          className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none" />
      )}
    </label>
  );
}

function Channel({ icon: Icon, label, enabled }: { icon: any; label: string; enabled?: boolean }) {
  return (
    <div className={
      "rounded-xl p-3 flex items-center gap-3 border " +
      (enabled ? "bg-cyan-500/5 border-cyan-500/30" : "bg-white/5 border-white/10")
    }>
      <Icon className={"h-5 w-5 " + (enabled ? "text-cyan-400" : "text-ink-300")} />
      <div className="flex-1">
        <p className="text-sm text-white font-medium">{label}</p>
        <p className="text-[11px]" style={{ color: enabled ? "#7fc93f" : "#65759b" }}>
          {enabled ? "Active" : "Not connected"}
        </p>
      </div>
    </div>
  );
}
