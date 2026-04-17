import { Bot, Wand2, Globe, Smartphone, Instagram, MessageSquare } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";

// No fake transcripts, no invented conversation counts. Flo's chatbot page
// shows honest zeros until it is actually deployed and answering leads.

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
        <StatCard label="Conversations (30d)" value="0" sub="Starts counting once you deploy the bot" />
        <StatCard label="Leads qualified"      value="0" sub="Filled in as real conversations finish" />
        <StatCard label="Handoffs to you"      value="0" sub="When the lead asks for a human" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-cyan-400" /> Bot persona
            </h2>
            <p className="mt-1 text-xs text-ink-400">
              The more specific you get here, the less pushy the bot will sound.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Bot name" placeholder="e.g. Avery" />
              <Field label="Business name" placeholder="Your business name" />
              <Field
                label="Tone"
                placeholder="Friendly, casual, never pushy. Texts like a real person."
                textarea
                className="sm:col-span-2"
              />
              <Field
                label="What you DO offer"
                placeholder="List your core services — the things you want leads to ask about."
                textarea
                className="sm:col-span-2"
              />
              <Field
                label="What you DON'T offer"
                placeholder="List anything you want the bot to politely decline or refer out."
                textarea
                className="sm:col-span-2"
              />
            </div>
          </div>

          <div className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white">Where the bot answers</h2>
            <p className="mt-1 text-xs text-ink-400">
              Flip these on in Settings → Integrations once the channel is connected.
            </p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <Channel icon={Globe}      label="Website widget" />
              <Channel icon={Smartphone} label="SMS replies" />
              <Channel icon={Instagram}  label="Instagram DMs" />
            </div>
          </div>

          <div className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white">Recent conversation</h2>
            <div className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center">
              <MessageSquare className="h-6 w-6 text-ink-400 mx-auto" />
              <p className="mt-3 text-sm text-ink-200">
                No conversations yet.
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Your bot will show its most recent chat here once it's live.
              </p>
            </div>
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-accent-400" /> Flo's suggestion
            </h3>
            <p className="mt-3 text-sm text-ink-200">
              Flo watches what your bot gets asked most and drafts FAQ answers so
              the bot answers faster and you pay less per call. This panel fills in
              after ~25 real conversations.
            </p>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white">Plug-in points</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-200">
              <li>📋 Embed code for your website</li>
              <li>📱 Twilio / Bandwidth phone number</li>
              <li>📷 Meta Business Suite (IG/FB DMs)</li>
              <li>📊 GoHighLevel webhook</li>
            </ul>
            <Link
              href="/dashboard/settings"
              className="btn-ghost text-xs py-2 px-3 mt-4 w-full inline-flex justify-center"
            >
              Open integrations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, placeholder, defaultValue, textarea, className,
}: { label: string; placeholder?: string; defaultValue?: string; textarea?: boolean; className?: string }) {
  return (
    <label className={className}>
      <span className="text-xs uppercase tracking-wider text-ink-400 font-semibold">{label}</span>
      {textarea ? (
        <textarea defaultValue={defaultValue} placeholder={placeholder} rows={2}
          className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none resize-none" />
      ) : (
        <input defaultValue={defaultValue} placeholder={placeholder}
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
